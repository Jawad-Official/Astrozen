import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MagicWand,
  Layout,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { aiService } from '@/services/ai.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import { DocumentationSection } from './plans/DocumentationSection';
import { BlueprintModal } from './plans/BlueprintModal';
import { DocQuestionsDialog } from './plans/DocQuestionsDialog';
import { DocumentAnalysisModal } from './plans/DocumentAnalysisModal';

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

          {(validationReport || blueprint) && (
            <DocumentationSection
              docs={docs}
              docAnalysis={docAnalysis}
              handleDownloadDoc={handleDownloadDoc}
              handleGenerateDocFlow={handleGenerateDocFlow}
              handleUploadClick={handleUploadClick}
              setAnalysisDocType={setAnalysisDocType}
              setShowAnalysisModal={setShowAnalysisModal}
            />
          )}

        </div>
      </div>

      <BlueprintModal
        blueprintModalOpen={blueprintModalOpen}
        setBlueprintModalOpen={setBlueprintModalOpen}
        blueprint={blueprint}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        handleSaveBlueprint={handleSaveBlueprint}
        nodeDetails={nodeDetails}
        isLinkingIssue={isLinkingIssue}
        setIsLinkingIssue={setIsLinkingIssue}
        issueSearchQuery={issueSearchQuery}
        setIssueSearchQuery={setIssueSearchQuery}
        projectIssues={projectIssues}
        handleLinkIssue={handleLinkIssue}
        handleUnlinkIssue={handleUnlinkIssue}
        ideaId={ideaId}
        generatingIssues={generatingIssues}
        setGeneratingIssues={setGeneratingIssues}
      />

      <DocQuestionsDialog
        docQuestionsOpen={docQuestionsOpen}
        setDocQuestionsOpen={setDocQuestionsOpen}
        docQuestionIndex={docQuestionIndex}
        docQuestions={docQuestions}
        generatingDocType={generatingDocType}
        docAiSuggestion={docAiSuggestion}
        setDocAiSuggestion={setDocAiSuggestion}
        handleDocQuestionAnswer={handleDocQuestionAnswer}
      />

      <DocumentAnalysisModal
        showAnalysisModal={showAnalysisModal}
        setShowAnalysisModal={setShowAnalysisModal}
        analysisDocType={analysisDocType}
        docAnalysis={docAnalysis}
        handleDeclineEnhancement={handleDeclineEnhancement}
        handleGenerateEnhancement={handleGenerateEnhancement}
        handleAcceptEnhancement={handleAcceptEnhancement}
        enhancingDoc={enhancingDoc}
      />
    </div>
  );
}
