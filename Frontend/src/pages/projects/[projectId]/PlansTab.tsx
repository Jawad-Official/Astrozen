import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MagicWand,
  Layout,
  FileText,
  ArrowClockwise,
  Plus,
  UploadSimple,
  Trash,
  X,
  Database,
  Lightbulb,
  Rocket,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowSquareOut,
  Warning,
} from '@phosphor-icons/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { aiService } from '@/services/ai.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Phase, ValidationReport, BlueprintNode, BlueprintEdge, Blueprint, DocQuestion, Doc } from './plans/types';
import { DOC_INFO } from './plans/constants';
import { BlueprintCanvas } from './plans/BlueprintCanvas';
import { ValidationSection } from './plans/ValidationSection';

interface PlansTabProps {
  projectId: string;
  initialIdeaId?: string;
}

export function PlansTab({ projectId, initialIdeaId }: PlansTabProps) {
  const [ideaId, setIdeaId] = useState<string | null>(initialIdeaId || null);
  const [phase, setPhase] = useState<Phase>('INPUT');
  
  // Data State
  const [rawInput, setRawInput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [validationTab, setValidationTab] = useState<'overview' | 'features' | 'techstack' | 'pricing' | 'improvements'>('overview');
  const [selectedImprovementIndices, setSelectedImprovementIndices] = useState<number[]>([]);
  const [improvementStatus, setImprovementStatus] = useState<Record<number, string>>({});
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // Blueprint Modal State
  const [selectedNode, setSelectedNode] = useState<BlueprintNode | null>(null);
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [generatingIssues, setGeneratingIssues] = useState(false);
  const [nodeDetails, setNodeDetails] = useState<any>(null);
  const [isLinkingIssue, setIsLinkingIssue] = useState(false);
  const [projectIssues, setProjectIssues] = useState<any[]>([]);
  const [issueSearchQuery, setIssueSearchQuery] = useState('');

  // Doc questions dialog state
  const [docQuestionsOpen, setDocQuestionsOpen] = useState(false);
  const [docQuestions, setDocQuestions] = useState<DocQuestion[]>([]);
  const [docQuestionIndex, setDocQuestionIndex] = useState(0);
  const [docAnswers, setDocAnswers] = useState<Record<string, string>>({});
  const [docAiSuggestion, setDocAiSuggestion] = useState<string | null>(null);
  const [generatingDocType, setGeneratingDocType] = useState<string | null>(null);

  // File Upload Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  
  // Doc Analysis State
  const [docAnalysis, setDocAnalysis] = useState<Record<string, any>>({});
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisDocType, setAnalysisDocType] = useState<string | null>(null);
  const [enhancingDoc, setEnhancingDoc] = useState(false);
  
  const handleDownloadDoc = async (docType: string) => {
    const doc = docs.find(d => d.asset_type === docType);
    if (!doc || !ideaId) return;
    
    // If it's an external URL, just open it
    if (doc.content.startsWith('http')) {
      window.open(doc.content, '_blank');
      return;
    }
    
    setLoading(true);
    try {
      const res = await aiService.downloadDoc(ideaId, docType);
      
      const docName = DOC_INFO[docType]?.label || 'document';
      const filename = `${docName.replace(/\s+/g, '_')}.docx`;
      
      // Handle blob response from axios
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error("Download failed", error);
      toast.error("Failed to download as .docx. Try copying content manually.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-save timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNodeDetails = useCallback(async (nodeId: string) => {
    if (!ideaId) return;
    try {
      const res = await aiService.getNodeDetails(ideaId, nodeId);
      setNodeDetails(res.data);
    } catch (error) {
      console.error("Failed to fetch node details", error);
      toast.error("Failed to load node details");
    }
  }, [ideaId]);

  const handleLinkIssue = async (issueId: string) => {
    if (!ideaId || !selectedNode) return;
    try {
      await aiService.linkIssueToNode(ideaId, selectedNode.id, issueId);
      toast.success("Issue linked to node");
      fetchNodeDetails(selectedNode.id);
      loadIdea(ideaId); // Refresh main blueprint data
      setIsLinkingIssue(false);
    } catch {
      toast.error("Failed to link issue");
    }
  };

  const handleUnlinkIssue = async (issueId: string) => {
    if (!ideaId || !selectedNode) return;
    try {
      await aiService.unlinkIssueFromNode(ideaId, selectedNode.id, issueId);
      toast.success("Issue unlinked");
      fetchNodeDetails(selectedNode.id);
      loadIdea(ideaId); // Refresh main blueprint data
    } catch {
      toast.error("Failed to unlink issue");
    }
  };

  const loadProjectIssues = useCallback(async () => {
    try {
      // Lazy load to avoid circular deps if any
      const { issueService } = await import('@/services/issues');
      const res = await issueService.getAll({ project_id: projectId, limit: 100 });
      setProjectIssues(res.issues);
    } catch (error) {
      console.error("Failed to load project issues", error);
    }
  }, [projectId]);

  // Sync node details when selected
  useEffect(() => {
    if (selectedNode) {
        fetchNodeDetails(selectedNode.id);
    } else {
        setNodeDetails(null);
    }
  }, [fetchNodeDetails, selectedNode]);

  // Load project issues when linking modal opens
  useEffect(() => {
    if (isLinkingIssue) {
        loadProjectIssues();
    }
  }, [isLinkingIssue, loadProjectIssues]);

  // Initial Load
  useEffect(() => {
    const loadMostRecentIdea = async () => {
      if (!initialIdeaId && !ideaId && projectId) {
        try {
          setLoading(true);
          const res = await aiService.getProjectIdeas(projectId);
          const ideas = res.data.ideas;
          if (ideas && ideas.length > 0) {
            setIdeaId(ideas[0].id);
          }
        } catch {
          // Ignore error
        } finally {
          setLoading(false);
        }
      }
    };
    loadMostRecentIdea();
  }, [ideaId, initialIdeaId, projectId]);

  const loadIdea = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await aiService.getIdea(id);
      const data = res.data;
      
      // Determine phase based on data completeness
      if (data.status === 'CLARIFICATION_NEEDED') {
        setQuestions(data.clarification_questions || []);
        setPhase('CLARIFICATION');
      } else if (data.validation_report) {
        setValidationReport(data.validation_report);
        if (data.status === 'BLUEPRINT_GENERATED' || data.status === 'COMPLETED') {
            setPhase('BLUEPRINT'); // Actually we show all if blueprint exists
        } else {
            setPhase('VALIDATION');
        }
      } else {
          setPhase('INPUT');
      }

      // Load assets
      if (data.assets) {
          const fetchedDocs = data.assets
            .filter((a: any) => Object.keys(DOC_INFO).includes(a.asset_type))
            .map((a: any) => ({
                id: a.id,
                asset_type: a.asset_type,
                content: a.content,
                status: a.status,
                chat_history: a.chat_history
            }));
          setDocs(fetchedDocs);

          // Try to set blueprint from backend response first (it aggregates data)
          if (data.blueprint && (data.blueprint.nodes || data.blueprint.kanban_features || data.blueprint.user_flow_mermaid)) {
             let nodes = data.blueprint.nodes || [];
             let edges = data.blueprint.edges || [];
             
             // Legacy Fallback: If we have mermaid but no nodes, generate mocks so canvas isn't empty
             if (nodes.length === 0 && data.blueprint.user_flow_mermaid) {
                 nodes = [
                  { id: '1', label: 'Landing Page', type: 'entry', x: 50, y: 50, completion: 100, subtasks: ['Hero Section', 'Features', 'Pricing'] },
                  { id: '2', label: 'Web App', type: 'main', x: 250, y: 50, completion: 40, subtasks: ['Dashboard', 'Settings', 'Profile'] },
                  { id: '3', label: 'API Gateway', type: 'service', x: 250, y: 250, completion: 60, subtasks: ['Routing', 'Rate Limiting', 'Auth Middleware'] },
                  { id: '4', label: 'Auth Service', type: 'service', x: 50, y: 250, completion: 80, subtasks: ['OAuth', 'JWT', 'User Mgmt'] },
                  { id: '5', label: 'Core Service', type: 'service', x: 450, y: 250, completion: 20, subtasks: ['Business Logic', 'Data Validation'] },
                  { id: '6', label: 'PostgreSQL', type: 'database', x: 250, y: 450, completion: 90, subtasks: ['Schema', 'Migrations', 'Backups'] },
                  { id: '7', label: 'Redis Cache', type: 'database', x: 450, y: 450, completion: 50, subtasks: ['Session Store', 'API Caching'] },
                  { id: '8', label: 'Stripe', type: 'external', x: 650, y: 250, completion: 0, subtasks: ['Payments', 'Subscriptions'] },
                  { id: '9', label: 'SendGrid', type: 'external', x: 650, y: 350, completion: 0, subtasks: ['Email Transports', 'Templates'] }
                ];
                edges = [
                    { from: '1', to: '2' }, 
                    { from: '2', to: '3' },
                    { from: '3', to: '4' },
                    { from: '3', to: '5' },
                    { from: '4', to: '6' },
                    { from: '5', to: '6' },
                    { from: '5', to: '7' },
                    { from: '5', to: '8' },
                    { from: '5', to: '9' }
                ];
             }

             setBlueprint({
                user_flow_mermaid: data.blueprint.user_flow_mermaid || '',
                kanban_features: data.blueprint.kanban_features || [],
                nodes: nodes,
                edges: edges,
                kanban_parse_error: Boolean(data.blueprint.kanban_parse_error)
             });
          } else {
              // Fallback: Parsing from assets manually (Legacy)
              const blueprintAsset = data.assets.find((a: any) => a.asset_type === 'DIAGRAM_USER_FLOW');
              const kanbanAsset = data.assets.find((a: any) => a.asset_type === 'DIAGRAM_KANBAN');

              if (blueprintAsset) {
                let nodes: BlueprintNode[] = [];
                let edges: BlueprintEdge[] = [];
                let mermaid = blueprintAsset.content;

                try {
                    // Try parsing content as JSON (new format)
                    const parsed = JSON.parse(blueprintAsset.content);
                    if (parsed.nodes) {
                        nodes = parsed.nodes;
                        edges = parsed.edges || [];
                        mermaid = parsed.user_flow_mermaid || '';
                    }
                } catch {
                    // Content is raw mermaid string
                }
                
                // Mock nodes if missing but we have mermaid (unlikely in new flow)
                if (nodes.length === 0 && mermaid) {
                     nodes = [
                      { id: '1', label: 'Landing Page', type: 'entry', x: 50, y: 50, completion: 0, subtasks: [] },
                      { id: '2', label: 'App Core', type: 'main', x: 300, y: 50, completion: 0, subtasks: [] }
                    ];
                    edges = [{ from: '1', to: '2' }];
                }

                let kanbanFeatures = [];
                if (kanbanAsset) {
                    try {
                        kanbanFeatures = JSON.parse(kanbanAsset.content || '[]');
                    } catch {
                        // Ignore
                    }
                }

                if (nodes.length > 0) {
                    setBlueprint({
                        user_flow_mermaid: mermaid,
                        kanban_features: kanbanFeatures,
                        nodes,
                        edges
                    });
                }
              }
          }
      }
    } catch {
      toast.error("Failed to load project plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ideaId) loadIdea(ideaId);
  }, [ideaId, loadIdea]);

  // ... (Keep existing handlers: handleSubmitIdea, handleSuggestAnswer, handleAnswerQuestion)
  const handleSubmitIdea = async () => {
    if (!rawInput.trim() || !projectId) {
      if (!projectId) toast.error("Project context missing");
      return;
    }
    setLoading(true);
    try {
      const res = await aiService.submitIdea(rawInput, projectId);
      setIdeaId(res.data.id);
      if (res.data.status === 'CLARIFICATION_NEEDED') {
        setQuestions(res.data.clarification_questions || []);
        setPhase('CLARIFICATION');
      } else {
        setPhase('VALIDATION');
        handleValidate(res.data.id);
      }
    } catch {
      toast.error("Failed to submit project description");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBlueprint = async (updatedNodes: BlueprintNode[]) => {
    if (!ideaId || !blueprint) return;
    try {
      await aiService.saveBlueprint(ideaId, {
        nodes: updatedNodes,
        edges: blueprint.edges,
        user_flow_mermaid: blueprint.user_flow_mermaid
      });
      // Update local state to keep in sync
      setBlueprint({ ...blueprint, nodes: updatedNodes });
    } catch (error) {
      console.error("Failed to save blueprint positions", error);
    }
  };

  const handleSuggestAnswer = async () => {
    if (!ideaId) return;
    setLoading(true);
    try {
      const res = await aiService.suggestAnswer(ideaId, currentQuestionIndex);
      setAiSuggestion(res.data.suggestion);
    } catch {
      toast.error("AI couldn't suggest an answer");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerQuestion = async (answer: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex].answer = answer;
    setQuestions(updatedQuestions);
    setAiSuggestion(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setLoading(true);
      try {
        const answers = updatedQuestions.map(q => ({ question: q.question, answer: q.answer }));
        await aiService.answerQuestions(ideaId!, answers);
        setPhase('VALIDATION');
        handleValidate(ideaId!);
      } catch {
        toast.error("Failed to save answers");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleValidate = async (id: string, feedback?: string) => {
    if (feedback) setRevalidating(true);
    else setLoading(true);

    try {
      const res = await aiService.validateIdea(id, feedback);
      setValidationReport(res.data);
      if (feedback) toast.success("Analysis regenerated");
    } catch {
      toast.error("Validation failed");
    } finally {
      setLoading(false);
      setRevalidating(false);
    }
  };

  const handleValidationEdit = (updatedReport: ValidationReport) => {
    if (!ideaId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await aiService.updateValidationReport(ideaId, updatedReport);
      } catch (error) { console.error("Auto-save failed", error); }
    }, 2000);
  };

  // Blueprint Generation
  const handleGenerateBlueprint = async () => {
    setLoading(true);
    try {
      if (validationReport) await aiService.updateValidationReport(ideaId!, validationReport);
      const res = await aiService.generateBlueprint(ideaId!);
      
      // Ensure nodes are set
      let nodes = res.data.nodes || [];
      if (nodes.length === 0) {
           nodes = [
              { id: '1', label: 'Landing Page', type: 'page', x: 100, y: 100, completion: 0, subtasks: ['Hero Section', 'Features', 'Pricing'] },
              { id: '2', label: 'Auth', type: 'page', x: 400, y: 100, completion: 0, subtasks: ['Login', 'Register', 'OAuth'] },
              { id: '3', label: 'Dashboard', type: 'page', x: 700, y: 100, completion: 0, subtasks: ['Overview', 'Stats', 'Settings'] }
            ];
      }

      setBlueprint({ ...res.data, nodes });
      setPhase('BLUEPRINT');
    } catch {
      toast.error("Blueprint generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Upload Logic
  const handleUploadClick = (docType: string) => {
    setUploadingDocType(docType);
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset
        fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDocType || !ideaId) return;

    setLoading(true);
    try {
      const res = await aiService.uploadDoc(ideaId, uploadingDocType, file);
      setDocs(prev => [...prev, res.data]);
      toast.success(`${DOC_INFO[uploadingDocType].label} uploaded successfully`);
      
      if (res.data.analysis) {
        setDocAnalysis(prev => ({ ...prev, [uploadingDocType]: res.data.analysis }));
        if (res.data.analysis.severity !== 'info') {
          setAnalysisDocType(uploadingDocType);
          setShowAnalysisModal(true);
        }
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setLoading(false);
      setUploadingDocType(null);
    }
  };

  const handleGenerateEnhancement = async () => {
    if (!analysisDocType || !ideaId) return;
    setEnhancingDoc(true);
    try {
      const res = await aiService.generateDocEnhancement(ideaId, analysisDocType);
      setDocAnalysis(prev => ({
        ...prev,
        [analysisDocType]: {
          ...prev[analysisDocType],
          enhanced_content: res.data.enhanced_content,
          preview: res.data.preview,
        }
      }));
      toast.success("Enhancement generated");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to generate enhancement");
    } finally {
      setEnhancingDoc(false);
    }
  };

  const handleAcceptEnhancement = async () => {
    if (!analysisDocType || !ideaId) return;
    setEnhancingDoc(true);
    try {
      await aiService.acceptDocEnhancement(ideaId, analysisDocType);
      const analysis = docAnalysis[analysisDocType];
      setDocs(prev => prev.map(d => 
        d.asset_type === analysisDocType 
          ? { ...d, content: analysis.enhanced_content }
          : d
      ));
      setDocAnalysis(prev => {
        const newAnalysis = { ...prev };
        delete newAnalysis[analysisDocType];
        return newAnalysis;
      });
      setShowAnalysisModal(false);
      setAnalysisDocType(null);
      toast.success("Enhancement applied successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to apply enhancement");
    } finally {
      setEnhancingDoc(false);
    }
  };

  const handleDeclineEnhancement = async () => {
    if (!analysisDocType || !ideaId) return;
    try {
      await aiService.declineDocEnhancement(ideaId, analysisDocType);
      setDocAnalysis(prev => {
        const newAnalysis = { ...prev };
        delete newAnalysis[analysisDocType];
        return newAnalysis;
      });
      setShowAnalysisModal(false);
      setAnalysisDocType(null);
      toast.success("Kept original document");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to decline");
    }
  };

  // Doc Generation Logic
  const handleGenerateDocFlow = async (type: string) => {
    if (!ideaId) return;
    setLoading(true);
    setGeneratingDocType(type);

    try {
      const questionsRes = await aiService.getDocQuestions(ideaId, type);
      if (questionsRes.data.has_questions && questionsRes.data.questions.length > 0) {
        setDocQuestions(questionsRes.data.questions);
        setDocQuestionIndex(0);
        setDocAnswers({});
        setDocAiSuggestion(null);
        setDocQuestionsOpen(true);
      } else {
        await handleGenerateDoc(type);
      }
    } catch {
      toast.error(`Failed to prepare ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDocQuestionAnswer = async (answer: string) => {
    setDocAnswers(prev => ({ ...prev, [docQuestions[docQuestionIndex].id]: answer }));
    setDocAiSuggestion(null);

    if (docQuestionIndex < docQuestions.length - 1) {
      setDocQuestionIndex(prev => prev + 1);
    } else {
      setDocQuestionsOpen(false);
      await handleGenerateDocWithAnswers(answer);
    }
  };

  const handleGenerateDocWithAnswers = async (lastAnswer?: string) => {
    if (!generatingDocType || !ideaId) return;
    setLoading(true);
    try {
      const finalAnswers = { ...docAnswers };
      if (lastAnswer && docQuestions[docQuestionIndex]) {
        finalAnswers[docQuestions[docQuestionIndex].id] = lastAnswer;
      }

      const answersArray = docQuestions.map(q => ({
        question: q.question,
        answer: finalAnswers[q.id] || q.suggestion || ''
      }));

      const res = await aiService.generateDoc(ideaId, generatingDocType, answersArray);
      updateDocState(generatingDocType, res.data);
      toast.success(`${DOC_INFO[generatingDocType].label} generated`);
    } catch {
      toast.error(`Failed to generate ${generatingDocType}`);
    } finally {
      setLoading(false);
      setGeneratingDocType(null);
    }
  };

  const handleGenerateDoc = async (type: string) => {
    if (!ideaId) return;
    setLoading(true);
    try {
      const res = await aiService.generateDoc(ideaId, type);
      updateDocState(type, res.data);
      toast.success(`${DOC_INFO[type].label} generated`);
    } catch {
      toast.error(`Failed to generate ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const updateDocState = (type: string, data: any) => {
    setDocs(prev => {
        const exists = prev.findIndex(d => d.asset_type === type);
        if (exists !== -1) {
            const next = [...prev];
            next[exists] = data;
            return next;
        }
        return [...prev, data];
    });
  };
  
  // Tech Stack Local State
  const [editingTech, setEditingTech] = useState<string | null>(null);
  const [techFeedback, setTechFeedback] = useState<Record<string, string>>({});
  const [isRegeneratingTech, setIsRegeneratingTech] = useState<string | null>(null);

  const handleRegenerateTech = async (field: string) => {
    if (!ideaId) return;
    setIsRegeneratingTech(field);
    try {
      const res = await aiService.regenerateValidationField(ideaId, `tech_stack.${field}`, techFeedback[field] || '');
      // The backend returns the updated field value in the result or we might need to update the whole report
      // Based on common patterns, we update the local report state
      if (res.data && validationReport) {
          const updatedTech = { ...validationReport.tech_stack, [field]: res.data.value };
          const updatedReport = { ...validationReport, tech_stack: updatedTech };
          setValidationReport(updatedReport);
          handleValidationEdit(updatedReport);
          toast.success(`${field} tech stack updated`);
      }
    } catch {
      toast.error(`Failed to regenerate ${field}`);
    } finally {
      setIsRegeneratingTech(null);
      setEditingTech(null);
    }
  };

  // Render Helpers

  return (
    <div className="flex flex-col min-h-full bg-background">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
        accept=".md,.txt,.pdf,.docx" 
      />

      <div className="flex-1">
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-12 pb-20">
          
          {/* 1. Input / Clarification Section (Only if no Idea or Clarification Needed) */}
          {!validationReport && !blueprint && (
             <div className="min-h-[300px] sm:min-h-[400px]">
                {phase === 'CLARIFICATION' ? (
                   <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="p-4 sm:p-6">
                         <CardTitle className="text-lg sm:text-xl">Clarification Needed</CardTitle>
                         <CardDescription className="text-xs sm:text-sm">Question {currentQuestionIndex + 1} of {questions.length}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                         <h3 className="text-base sm:text-lg font-semibold">{questions[currentQuestionIndex]?.question}</h3>
                         <Textarea 
                            value={aiSuggestion || ''} 
                            onChange={e => setAiSuggestion(e.target.value)} 
                            className="bg-muted/20 text-sm sm:text-base min-h-[120px]"
                            placeholder="Your answer..."
                         />
                         <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                            <Button variant="ghost" size="sm" onClick={handleSuggestAnswer} disabled={loading} className="w-full sm:w-auto order-2 sm:order-1">Suggest Answer</Button>
                            <Button onClick={() => handleAnswerQuestion(aiSuggestion || '')} disabled={!aiSuggestion} className="w-full sm:w-auto order-1 sm:order-2">Next</Button>
                         </div>
                      </CardContent>
                   </Card>
                ) : (
                   <Card className="border-border bg-card shadow-lg">
                      <CardHeader className="p-4 sm:p-6">
                         <CardTitle className="text-lg sm:text-xl text-foreground">Describe your Idea</CardTitle>
                         <CardDescription className="text-xs sm:text-sm text-muted-foreground">Start by describing what you want to build.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                         <Textarea 
                            value={rawInput} 
                            onChange={e => setRawInput(e.target.value)} 
                            className="min-h-[150px] sm:min-h-[200px] bg-muted/20 text-base sm:text-lg text-foreground"
                            placeholder="E.g., A marketplace for vintage watches..."
                         />
                      </CardContent>
                      <CardFooter className="p-4 sm:p-6">
                         <Button onClick={handleSubmitIdea} disabled={loading || !rawInput.trim()} className="w-full bg-primary font-bold h-10 sm:h-12 text-primary-foreground">
                            {loading ? <ArrowClockwise className="animate-spin mr-2" /> : <MagicWand className="mr-2" />}
                            Start Project Architecture
                         </Button>
                      </CardFooter>
                   </Card>
                )}
             </div>
          )}

          {/* 2. Validation Section (Persistent at Top) */}
          {validationReport && (
            <ValidationSection
              validationReport={validationReport}
              setValidationReport={setValidationReport}
              blueprint={blueprint}
              validationTab={validationTab}
              setValidationTab={setValidationTab}
              editingTech={editingTech}
              setEditingTech={setEditingTech}
              techFeedback={techFeedback}
              setTechFeedback={setTechFeedback}
              isRegeneratingTech={isRegeneratingTech}
              handleRegenerateTech={handleRegenerateTech}
              handleValidationEdit={handleValidationEdit}
              selectedImprovementIndices={selectedImprovementIndices}
              setSelectedImprovementIndices={setSelectedImprovementIndices}
              improvementStatus={improvementStatus}
              setImprovementStatus={setImprovementStatus}
              ideaId={ideaId}
              revalidating={revalidating}
              setRevalidating={setRevalidating}
              handleGenerateBlueprint={handleGenerateBlueprint}
            />
          )}

          {/* 3. Blueprint Section (Middle) */}
          {blueprint && (
            <div className="space-y-6 animate-in fade-in duration-700 pt-4 sm:pt-0">
               <div className="flex flex-row items-center justify-between border-b border-border pb-4">
                 <div className="flex items-center gap-3 sm:gap-4">
                   <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0 border border-blue-500/20">
                     <Layout size={18} weight="bold" className="sm:hidden" />
                     <Layout size={20} weight="bold" className="hidden sm:block" />
                   </div>
                   <div>
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground/90">Visual Blueprint</h2>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Interactive architecture map</p>
                   </div>
                 </div>
                 <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-2 text-muted-foreground/60 hover:text-foreground hover:bg-accent"
                                onClick={handleGenerateBlueprint}
                                disabled={loading}
                            >
                                <ArrowClockwise className={cn(loading && "animate-spin")} size={14} />
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden sm:inline">Regenerate</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-popover border-border text-[10px] font-bold uppercase tracking-widest">
                            Redo blueprint generation
                        </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
               </div>
               
               <BlueprintCanvas 
                  className="h-[400px] sm:h-[600px]"
                  nodes={blueprint.nodes} 
                  edges={blueprint.edges}
                  onNodeClick={(node) => {
                    setSelectedNode(node);
                    setBlueprintModalOpen(true);
                  }}
                  onCanvasClick={() => {
                    setSelectedNode(null); // Ensure no node is pre-selected when just opening
                    setBlueprintModalOpen(true);
                  }}
                  onNodesChange={handleSaveBlueprint}
                />
               
               {/* Kanban Preview */}
               {blueprint.kanban_parse_error ? (
                 <div className="mt-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-xs sm:text-sm text-destructive">
                   This blueprint's kanban data couldn't be loaded. Try regenerating the blueprint above.
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
                   {blueprint.kanban_features.slice(0, 4).map((f, i) => (
                      <div key={i} className="p-3 sm:p-4 rounded-lg bg-card border border-border flex flex-col justify-between gap-2 shadow-sm">
                         <div className="text-[11px] sm:text-xs font-bold text-foreground/70 line-clamp-2">{f.title}</div>
                         <Badge variant="secondary" className="text-[8px] sm:text-[9px] w-fit bg-muted text-muted-foreground border-none">{f.status}</Badge>
                      </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          {/* 4. Documentation Section (Bottom) */}
          {(validationReport || blueprint) && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 pt-8 sm:pt-12 border-t border-border">
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3 sm:gap-4">
                     <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0 border border-purple-500/20">
                       <FileText size={18} weight="bold" className="sm:hidden" />
                       <FileText size={20} weight="bold" className="hidden sm:block" />
                     </div>
                     <div>
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground/90">Documentation</h2>
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Technical specifications and guides</p>
                     </div>
                   </div>
               </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                   {Object.entries(DOC_INFO).map(([id, info]) => {
                      const isGenerated = docs.find(d => d.asset_type === id);
                      const hasAnalysis = docAnalysis[id];
                      const analysisSeverity = hasAnalysis?.severity;
                      return (
                         <Card 
                           key={id} 
                           className={cn(
                             "cursor-pointer hover:border-primary/30 transition-all group overflow-hidden flex flex-col shadow-sm",
                             hasAnalysis && analysisSeverity === 'critical' ? "bg-red-500/5 border-red-500/20" :
                             hasAnalysis && analysisSeverity === 'warning' ? "bg-yellow-500/5 border-yellow-500/20" :
                             isGenerated ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border"
                           )}
                           onClick={(e) => {
                               if ((e.target as HTMLElement).closest('.action-btn')) return;
                               if (hasAnalysis) {
                                 setAnalysisDocType(id);
                                 setShowAnalysisModal(true);
                               } else if (isGenerated) handleDownloadDoc(id);
                               else handleGenerateDocFlow(id);
                           }}
                         >
                            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                               <div className="flex justify-between items-start">
                                  <info.icon className={isGenerated ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/40"} size={24} />
                                  {hasAnalysis && analysisSeverity === 'critical' && (
                                    <Warning className="text-red-600 dark:text-red-400" weight="fill" />
                                  )}
                                  {hasAnalysis && analysisSeverity === 'warning' && (
                                    <Lightbulb className="text-yellow-600 dark:text-yellow-400" weight="fill" />
                                  )}
                                  {isGenerated && !hasAnalysis && <CheckCircle className="text-emerald-600 dark:text-emerald-400" weight="fill" />}
                               </div>
                               <CardTitle className="text-sm sm:text-base mt-2 sm:mt-3">{info.label}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-4 pt-0 sm:p-6 sm:pt-0">
                               <p className="text-[11px] sm:text-xs text-muted-foreground/80 line-clamp-2 sm:line-clamp-none sm:min-h-[40px]">{info.summary}</p>
                               {hasAnalysis && (
                                 <p className="text-[10px] mt-2 text-muted-foreground/60 font-medium">
                                   Quality: {hasAnalysis.quality_score}% - Click to review
                                 </p>
                               )}
                            </CardContent>
                            <CardFooter className="p-4 pt-0 sm:p-6 sm:pt-0 flex gap-2">
                               {!isGenerated ? (
                                <>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="action-btn h-7 text-[9px] sm:text-[10px] w-full border-border hover:bg-accent"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUploadClick(id);
                                        }}
                                    >
                                        <UploadSimple className="mr-1" /> Upload
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        className="action-btn h-7 text-[9px] sm:text-[10px] w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerateDocFlow(id);
                                        }}
                                    >
                                        <MagicWand className="mr-1" /> Generate
                                    </Button>
                                </>
                              ) : (
                                <span 
                                    className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                                >
                                    {isGenerated.content.startsWith('http') ? 'Open in Docs' : 'Download'} <ArrowRight size={12} />
                                </span>
                              )}
                           </CardFooter>
                        </Card>
                     )
                  })}
               </div>
            </div>
          )}

        </div>
      </div>

      {/* Blueprint Full-Page Modal */}
      <Dialog open={blueprintModalOpen} onOpenChange={setBlueprintModalOpen}>
        <DialogContent 
          className="!max-w-none bg-background border-border w-[98vw] md:w-[95vw] h-[98vh] md:h-[90vh] p-0 overflow-hidden flex flex-col" 
          key={blueprintModalOpen ? 'open' : 'closed'}
        >
          <VisuallyHidden>
            <DialogTitle>Blueprint Viewer</DialogTitle>
            <DialogDescription>
              Interactive blueprint canvas with node details and issue generation
            </DialogDescription>
          </VisuallyHidden>
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Full Canvas Area */}
            <div className="flex-1 relative overflow-hidden min-w-0 h-full flex flex-col">
              <BlueprintCanvas 
                className="flex-1 border-0 rounded-none"
                nodes={blueprint?.nodes || []} 
                edges={blueprint?.edges || []}
                onNodeClick={(node) => {
                  setSelectedNode(node);
                }}
                onNodesChange={handleSaveBlueprint}
              />
              {/* Close Button - positioned inside canvas area for mobile */}
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-md hover:bg-muted text-muted-foreground hover:text-foreground z-[60] border border-border"
                onClick={() => {
                  setBlueprintModalOpen(false);
                  setSelectedNode(null);
                }}
              >
                <X size={16} />
              </Button>
            </div>

            {/* Sidebar / Bottom Sheet */}
            <div className={cn(
                "w-full md:w-[350px] lg:w-[400px] border-t md:border-t-0 md:border-l border-border bg-card p-4 md:p-6 overflow-y-auto flex-shrink-0 transition-all duration-300 shadow-xl",
                "h-1/2 md:h-full", // Takes more space on mobile if node is selected
                !selectedNode && "hidden md:flex" // Hide on mobile if no node selected
            )}>
              {selectedNode ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300">
                  {/* Node Header */}
                  <div className="flex items-center justify-between md:block">
                    <div className="flex items-center gap-3 mb-0 md:mb-4">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0",
                        selectedNode.type === 'entry' ? "from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400" :
                        selectedNode.type === 'action' ? "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400" :
                        selectedNode.type === 'service' ? "from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400" :
                        selectedNode.type === 'database' ? "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400" :
                        selectedNode.type === 'external' ? "from-pink-500/20 to-pink-500/5 text-pink-600 dark:text-pink-400" :
                        "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {selectedNode.type === 'database' ? <Database size={20} weight="duotone" /> : 
                         selectedNode.type === 'external' ? <ArrowSquareOut size={20} weight="duotone" /> :
                         <Layout size={20} weight="duotone" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-foreground truncate">{selectedNode.label}</h3>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-bold">{selectedNode.type}</p>
                      </div>
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden h-8 w-8 text-muted-foreground/40"
                        onClick={() => setSelectedNode(null)}
                    >
                        <XCircle size={20} />
                    </Button>
                  </div>

                  {/* Completion */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] sm:text-xs font-bold text-muted-foreground/60">
                      <span>COMPLETION</span>
                      <span>{(nodeDetails?.completion ?? selectedNode.completion) || 0}%</span>
                    </div>
                    <div className="h-1.5 sm:h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          ((nodeDetails?.completion ?? selectedNode.completion) || 0) === 100 ? "bg-emerald-500" : 
                          selectedNode.type === 'database' ? "bg-amber-500" :
                          selectedNode.type === 'service' ? "bg-cyan-500" :
                          "bg-primary"
                        )}
                        style={{ width: `${(nodeDetails?.completion ?? selectedNode.completion) || 0}%` }}
                      />
                    </div>
                    {nodeDetails?.stats && (
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground/40 text-right font-medium">
                        {nodeDetails.stats.done_issues} / {nodeDetails.stats.total_issues} issues completed
                      </p>
                    )}
                  </div>

                  {/* Issues Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Linked Issues</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                        onClick={() => setIsLinkingIssue(!isLinkingIssue)}
                      >
                        {isLinkingIssue ? 'Cancel' : <><Plus className="mr-1" size={12} /> Add Issue</>}
                      </Button>
                    </div>

                    {/* Add Issue Search/List */}
                    <AnimatePresence>
                      {isLinkingIssue && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-2 sm:p-3 rounded-lg bg-muted/30 border border-border space-y-3">
                            <Input 
                              placeholder="Search project issues..."
                              value={issueSearchQuery}
                              onChange={(e) => setIssueSearchQuery(e.target.value)}
                              className="h-8 text-xs bg-background/50 border-border"
                            />
                            <div className="max-h-[150px] sm:max-h-[200px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {projectIssues
                                .filter(i => i.title.toLowerCase().includes(issueSearchQuery.toLowerCase()))
                                .filter(i => !nodeDetails?.issues.some((ni: any) => ni.id === i.id))
                                .map(issue => (
                                  <div 
                                    key={issue.id} 
                                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent group cursor-pointer transition-colors"
                                    onClick={() => handleLinkIssue(issue.id)}
                                  >
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[9px] font-mono text-muted-foreground/40">{issue.identifier}</span>
                                      <span className="text-[11px] text-foreground/70 truncate">{issue.title}</span>
                                    </div>
                                    <Plus size={12} className="text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
                                  </div>
                                ))}
                              {projectIssues.length === 0 && <p className="text-[10px] text-muted-foreground/40 text-center py-4">No other issues found</p>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Linked Issues List */}
                    <div className="space-y-2">
                      {nodeDetails?.issues && nodeDetails.issues.length > 0 ? (
                        nodeDetails.issues.map((issue: any) => (
                          <div key={issue.id} className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-all shadow-sm">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[9px] font-mono text-muted-foreground/40">{issue.identifier}</span>
                                <Badge variant="outline" className={cn(
                                  "text-[7px] h-3.5 px-1 uppercase font-black",
                                  issue.status === 'done' ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                                  issue.status === 'in_progress' ? "text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5" :
                                  "text-muted-foreground/40 border-border bg-muted"
                                )}>
                                  {issue.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <span className="text-[11px] sm:text-xs font-medium text-foreground/80 truncate">{issue.title}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleUnlinkIssue(issue.id)}
                            >
                              <Trash size={14} />
                            </Button>
                          </div>
                        ))
                      ) : !isLinkingIssue && (
                        <div className="py-6 sm:py-8 text-center space-y-2">
                          <p className="text-[11px] text-muted-foreground/40">No issues linked to this component.</p>
                          <p className="text-[9px] text-muted-foreground/20 italic">Generate issues or link existing ones to track progress.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Generate Issues Button */}
                  <div className="pt-4 border-t border-border">
                    <Button
                      onClick={async () => {
                        if (!ideaId || !selectedNode) return;
                        setGeneratingIssues(true);
                        try {
                          const response = await aiService.generateIssuesForNode(ideaId, selectedNode.id);
                          toast.success(response.data?.message || 'Issues generated successfully!');
                          setTimeout(() => {
                            setBlueprintModalOpen(false);
                            setSelectedNode(null);
                          }, 1500);
                        } catch (error: any) {
                          toast.error(error.response?.data?.detail || 'Failed to generate issues');
                        } finally {
                          setGeneratingIssues(false);
                        }
                      }}
                      disabled={generatingIssues}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 h-10 sm:h-11"
                    >
                      {generatingIssues ? (
                        <>
                          <ArrowClockwise className="mr-2 animate-spin" size={16} />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Rocket className="mr-2" weight="duotone" size={18} />
                          Generate Issues
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/40 mt-2 text-center font-medium">
                      AI will create tasks, features, and milestones
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/20">
                  <Layout size={40} weight="thin" className="mb-4 opacity-50" />
                  <p className="text-xs uppercase tracking-widest font-black">Select a node</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doc Questions Dialog */}
      <Dialog open={docQuestionsOpen} onOpenChange={setDocQuestionsOpen}>
        <DialogContent className="bg-popover border-border w-[95vw] sm:max-w-[500px] p-4 sm:p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
             <DialogTitle className="text-lg sm:text-xl">Clarification Needed</DialogTitle>
             <DialogDescription className="text-xs sm:text-sm">
                Question {docQuestionIndex + 1} of {docQuestions.length} for {DOC_INFO[generatingDocType || '']?.label}
             </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 sm:py-4">
             <p className="text-base sm:text-lg font-medium leading-relaxed text-foreground/80">{docQuestions[docQuestionIndex]?.question}</p>
             <Textarea 
                value={docAiSuggestion || ''}
                onChange={e => setDocAiSuggestion(e.target.value)}
                placeholder="Your answer..."
                className="bg-muted/30 border-border min-h-[100px] text-sm sm:text-base text-foreground"
             />
             <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2 sm:pt-4">
                <Button variant="ghost" size="sm" onClick={() => setDocAiSuggestion(docQuestions[docQuestionIndex].suggestion || '')} className="text-[10px] sm:text-xs order-3 sm:order-1 w-full sm:w-auto hover:bg-accent">
                   <Lightbulb className="mr-2" /> Use Suggestion
                </Button>
                <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                   <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs" onClick={() => handleDocQuestionAnswer(docQuestions[docQuestionIndex].suggestion || "Skipped")}>Skip</Button>
                   <Button size="sm" className="flex-1 sm:flex-none text-xs" onClick={() => handleDocQuestionAnswer(docAiSuggestion || '')} disabled={!docAiSuggestion}>Next</Button>
                </div>
             </div>
          </div>
         </DialogContent>
       </Dialog>

      <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
        <DialogContent className="bg-popover border-border w-[95vw] sm:max-w-[600px] p-4 sm:p-6 rounded-2xl shadow-2xl">
          {(() => {
            const analysis = analysisDocType ? docAnalysis[analysisDocType] : undefined;
            return (
          <>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              {analysis?.severity === 'critical' && (
                <span className="text-red-400">Document Review Required</span>
              )}
              {analysis?.severity === 'warning' && (
                <span className="text-yellow-400">Document Enhancement Available</span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {DOC_INFO[analysisDocType || '']?.label} - {analysis?.summary}
            </DialogDescription>
          </DialogHeader>

          {analysis && (
            <div className="space-y-4 py-2 sm:py-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold",
                  analysis.quality_score >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                  analysis.quality_score >= 60 ? "bg-yellow-500/20 text-yellow-400" :
                  analysis.quality_score >= 40 ? "bg-orange-500/20 text-orange-400" :
                  "bg-red-500/20 text-red-400"
                )}>
                  {analysis.quality_score}%
                </div>
                <div>
                  <p className="text-sm font-medium">Quality Score</p>
                  <p className="text-xs text-white/40">
                    {analysis.is_valid ? "Valid document format" : "Document format issues detected"}
                  </p>
                </div>
              </div>

              {analysis.issues?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Issues Found</p>
                  <ul className="space-y-1">
                    {analysis.issues.map((issue: string, i: number) => (
                      <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.missing_sections?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Missing Sections</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.missing_sections.map((section: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-xs">
                        {section}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.suggestions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Suggestions</p>
                  <ul className="space-y-1">
                    {analysis.suggestions.map((suggestion: string, i: number) => (
                      <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.ai_can_enhance && !analysis.enhanced_content && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-400 font-medium">AI Can Enhance This Document</p>
                  <p className="text-xs text-white/60 mt-1">{analysis.enhancement_preview}</p>
                </div>
              )}

              {analysis.enhanced_content && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Enhanced Version Preview</p>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 max-h-40 overflow-y-auto">
                    <pre className="text-xs text-white/70 whitespace-pre-wrap">{analysis.preview}</pre>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeclineEnhancement}
                  className="text-white/60 hover:text-white text-xs"
                >
                  Keep Original
                </Button>
                <div className="flex gap-2">
                  {analysis.ai_can_enhance && !analysis.enhanced_content && (
                    <Button
                      size="sm"
                      onClick={handleGenerateEnhancement}
                      disabled={enhancingDoc}
                      className="bg-blue-600 hover:bg-blue-700 text-xs"
                    >
                      {enhancingDoc ? <ArrowClockwise className="animate-spin mr-2 h-3 w-3" /> : <MagicWand className="mr-2 h-3 w-3" />}
                      Generate Enhancement
                    </Button>
                  )}
                  {analysis.enhanced_content && (
                    <Button
                      size="sm"
                      onClick={handleAcceptEnhancement}
                      disabled={enhancingDoc}
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                    >
                      <CheckCircle className="mr-2 h-3 w-3" />
                      Accept Enhancement
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
