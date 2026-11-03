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
import { cn, getErrorMessage } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Phase, ValidationReport, BlueprintNode, BlueprintEdge, Blueprint, DocQuestion, Doc, DocAnalysis } from './plans/types';
import { DOC_INFO } from './plans/constants';
import { BlueprintCanvas } from './plans/BlueprintCanvas';
import { ValidationSection } from './plans/ValidationSection';
import { DocumentationSection } from './plans/DocumentationSection';
import { BlueprintModal } from './plans/BlueprintModal';
import { DocQuestionsDialog } from './plans/DocQuestionsDialog';
import { DocumentAnalysisModal } from './plans/DocumentAnalysisModal';
import { DocViewerDialog } from './plans/DocViewerDialog';
import { PlansPageSkeleton, ValidationPlaceholder, BlueprintPlaceholder } from './plans/AIPlaceholders';
import { trackAI } from '@/store/aiActivityStore';

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
  // Each AI action has its own flag, so one running request only locks its
  // own button - the rest of the page stays usable.
  const [initialLoading, setInitialLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
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
  const [docAnalysis, setDocAnalysis] = useState<Record<string, DocAnalysis>>({});
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisDocType, setAnalysisDocType] = useState<string | null>(null);
  const [enhancingDoc, setEnhancingDoc] = useState(false);

  // Doc work in flight (questions / generation / upload) - drives the card spinner
  const [busyDocType, setBusyDocType] = useState<string | null>(null);

  // Doc viewer
  const [viewerDocType, setViewerDocType] = useState<string | null>(null);
  const [viewerBusy, setViewerBusy] = useState<'chat' | 'regenerate' | 'download' | null>(null);

  const handleDownloadDoc = async (docType: string) => {
    const doc = docs.find(d => d.asset_type === docType);
    if (!doc || !ideaId) return;

    setViewerBusy(prev => prev ?? 'download');
    try {
      const res = await aiService.downloadDoc(ideaId, docType);

      const docName = DOC_INFO[docType]?.label || 'document';
      const filename = `${docName.replace(/\s+/g, '_')}.docx`;

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
      toast.error("Failed to download as .docx. Open the document and use Copy Markdown instead.");
    } finally {
      setViewerBusy(prev => (prev === 'download' ? null : prev));
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
          setInitialLoading(true);
          const res = await aiService.getProjectIdeas(projectId);
          const ideas = res.data.ideas;
          if (ideas && ideas.length > 0) {
            setIdeaId(ideas[0].id);
          }
        } catch {
          // Ignore error
        } finally {
          setInitialLoading(false);
        }
      }
    };
    loadMostRecentIdea();
  }, [ideaId, initialIdeaId, projectId]);

  const loadIdea = useCallback(async (id: string) => {
    if (!id) return;
    setInitialLoading(true);
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
          const fetchedDocs: Doc[] = data.assets
            .filter((a) => Object.keys(DOC_INFO).includes(a.asset_type) && a.content)
            .map((a) => ({
                id: a.id,
                asset_type: a.asset_type,
                content: a.content ?? '',
                status: a.status,
                chat_history: a.chat_history ?? [],
                analysis_result: a.analysis_result ?? null,
                has_enhancement: !!a.has_enhancement,
            }));
          setDocs(fetchedDocs);

          // Restore uploaded docs' reviews, plus any enhancement still
          // waiting for accept/decline, so a reload doesn't lose them.
          const restored: Record<string, DocAnalysis> = {};
          for (const d of fetchedDocs) {
            if (d.analysis_result) restored[d.asset_type] = d.analysis_result;
          }
          setDocAnalysis(restored);
          fetchedDocs
            .filter(d => d.has_enhancement && d.analysis_result)
            .forEach(d => {
              aiService.getDocAnalysis(id, d.asset_type)
                .then(r => setDocAnalysis(prev => ({ ...prev, [d.asset_type]: r.data })))
                .catch(() => { /* review stays without the preview */ });
            });

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
      setInitialLoading(false);
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
    setSubmitting(true);
    try {
      const res = await trackAI('Reading your idea', () => aiService.submitIdea(rawInput, projectId));
      setIdeaId(res.data.id);
      if (res.data.status === 'CLARIFICATION_NEEDED') {
        setQuestions(res.data.clarification_questions || []);
        setPhase('CLARIFICATION');
      } else {
        setPhase('VALIDATION');
        handleValidate(res.data.id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to submit project description"));
    } finally {
      setSubmitting(false);
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
    setSuggesting(true);
    try {
      const res = await trackAI('Suggesting an answer', () => aiService.suggestAnswer(ideaId, currentQuestionIndex));
      setAiSuggestion(res.data.suggestion);
    } catch (error) {
      toast.error(getErrorMessage(error, "AI couldn't suggest an answer"));
    } finally {
      setSuggesting(false);
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
      setSubmitting(true);
      try {
        const answers = updatedQuestions.map(q => ({ question: q.question, answer: q.answer }));
        await trackAI('Saving your answers', () => aiService.answerQuestions(ideaId!, answers));
        setPhase('VALIDATION');
        handleValidate(ideaId!);
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to save answers"));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleValidate = async (id: string, feedback?: string) => {
    if (feedback) setRevalidating(true);
    else setValidating(true);

    try {
      const res = await trackAI(
        feedback ? 'Re-running the validation' : 'Validating your idea',
        () => aiService.validateIdea(id, feedback)
      );
      setValidationReport(res.data);
      toast.success(feedback ? "Analysis regenerated" : "Validation ready");
    } catch (error) {
      toast.error(getErrorMessage(error, "Validation failed"));
    } finally {
      setValidating(false);
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
    if (!ideaId || generatingBlueprint) return;
    setGeneratingBlueprint(true);
    try {
      if (validationReport) await aiService.updateValidationReport(ideaId, validationReport);
      const res = await trackAI('Building the visual blueprint', () => aiService.generateBlueprint(ideaId));
      
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
      toast.success("Blueprint ready");
    } catch (error) {
      toast.error(getErrorMessage(error, "Blueprint generation failed"));
    } finally {
      setGeneratingBlueprint(false);
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
    const docType = uploadingDocType;
    if (!file || !docType || !ideaId) return;

    setBusyDocType(docType);
    try {
      const res = await trackAI(`Reviewing your ${DOC_INFO[docType].label}`, () => aiService.uploadDoc(ideaId, docType, file));
      const { analysis, ...doc } = res.data;
      updateDocState(docType, doc);
      toast.success(`${DOC_INFO[docType].label} uploaded`);

      setDocAnalysis(prev => {
        const next = { ...prev };
        if (analysis) next[docType] = analysis;
        else delete next[docType];
        return next;
      });
      if (analysis && (analysis.severity === 'critical' || analysis.severity === 'warning')) {
        setAnalysisDocType(docType);
        setShowAnalysisModal(true);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Upload failed"));
    } finally {
      setBusyDocType(null);
      setUploadingDocType(null);
    }
  };

  const openAnalysis = (docType: string) => {
    setAnalysisDocType(docType);
    setShowAnalysisModal(true);
  };

  const handleGenerateEnhancement = async () => {
    if (!analysisDocType || !ideaId) return;
    const docType = analysisDocType;
    setEnhancingDoc(true);
    try {
      const res = await trackAI(`Enhancing ${DOC_INFO[docType]?.label ?? 'document'}`, () => aiService.generateDocEnhancement(ideaId, docType));
      setDocAnalysis(prev => ({
        ...prev,
        [docType]: {
          ...prev[docType],
          enhanced_content: res.data.enhanced_content,
          preview: res.data.preview,
        }
      }));
      toast.success("Enhancement generated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate enhancement"));
    } finally {
      setEnhancingDoc(false);
    }
  };

  const clearAnalysis = (docType: string) => {
    setDocAnalysis(prev => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
    setShowAnalysisModal(false);
    setAnalysisDocType(null);
  };

  const handleAcceptEnhancement = async () => {
    if (!analysisDocType || !ideaId) return;
    const docType = analysisDocType;
    setEnhancingDoc(true);
    try {
      const res = await aiService.acceptDocEnhancement(ideaId, docType);
      const enhanced = docAnalysis[docType]?.enhanced_content;
      if (res.data.doc) {
        updateDocState(docType, res.data.doc);
      } else if (enhanced) {
        setDocs(prev => prev.map(d => (d.asset_type === docType ? { ...d, content: enhanced } : d)));
      }
      clearAnalysis(docType);
      toast.success("Enhancement applied");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to apply enhancement"));
    } finally {
      setEnhancingDoc(false);
    }
  };

  const handleDeclineEnhancement = async () => {
    if (!analysisDocType || !ideaId) return;
    const docType = analysisDocType;
    try {
      await aiService.declineDocEnhancement(ideaId, docType);
      clearAnalysis(docType);
      toast.success("Kept original document");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to dismiss review"));
    }
  };

  // Doc Generation Logic
  const resetDocQuestions = () => {
    setDocQuestions([]);
    setDocQuestionIndex(0);
    setDocAnswers({});
    setDocAiSuggestion(null);
    setGeneratingDocType(null);
  };

  const handleGenerateDocFlow = async (type: string) => {
    if (!ideaId || busyDocType) return;
    setBusyDocType(type);

    let askedQuestions = false;
    try {
      const questionsRes = await trackAI(`Preparing questions for ${DOC_INFO[type]?.label ?? type}`, () => aiService.getDocQuestions(ideaId, type));
      if (questionsRes.data.has_questions && questionsRes.data.questions.length > 0) {
        askedQuestions = true;
        setGeneratingDocType(type);
        setDocQuestions(questionsRes.data.questions);
        setDocQuestionIndex(0);
        setDocAnswers({});
        setDocAiSuggestion(null);
        setDocQuestionsOpen(true);
      }
    } catch (error) {
      // Questions only refine the doc - if they fail, generate without them
      // rather than blocking the user. A config error (503) will resurface
      // from the generate call with the same message.
      console.warn("Doc questions unavailable, generating directly", error);
    } finally {
      if (askedQuestions) setBusyDocType(null);
    }

    if (!askedQuestions) {
      await runDocGeneration(type);
    }
  };

  const runDocGeneration = async (type: string, answers?: Array<{ question: string; answer: string }>) => {
    if (!ideaId) return;
    setBusyDocType(type);
    try {
      const res = await trackAI(`Writing ${DOC_INFO[type]?.label ?? type}`, () => aiService.generateDoc(ideaId, type, answers));
      updateDocState(type, res.data);
      setDocAnalysis(prev => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
      toast.success(`${DOC_INFO[type].label} generated`, {
        action: { label: 'Open', onClick: () => setViewerDocType(type) },
      });
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to generate ${DOC_INFO[type]?.label ?? type}`));
    } finally {
      setBusyDocType(null);
    }
  };

  const collectAnswers = (overrides: Record<string, string>) =>
    docQuestions.map(q => ({
      question: q.question,
      answer: (overrides[q.id] ?? docAnswers[q.id] ?? '').trim() || q.suggestion || '',
    }));

  const handleDocQuestionAnswer = async (answer: string) => {
    const current = docQuestions[docQuestionIndex];
    if (!current || !generatingDocType) return;
    const nextAnswers = { ...docAnswers, [current.id]: answer };
    setDocAnswers(nextAnswers);
    setDocAiSuggestion(null);

    if (docQuestionIndex < docQuestions.length - 1) {
      setDocQuestionIndex(prev => prev + 1);
      return;
    }

    const type = generatingDocType;
    const answers = collectAnswers(nextAnswers);
    setDocQuestionsOpen(false);
    resetDocQuestions();
    await runDocGeneration(type, answers);
  };

  const handleSkipAllQuestions = async () => {
    if (!generatingDocType) return;
    const type = generatingDocType;
    const current = docQuestions[docQuestionIndex];
    const overrides = current && docAiSuggestion?.trim() ? { [current.id]: docAiSuggestion } : {};
    const answers = collectAnswers(overrides);
    setDocQuestionsOpen(false);
    resetDocQuestions();
    await runDocGeneration(type, answers);
  };

  const updateDocState = (type: string, data: Doc) => {
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

  // Doc viewer actions
  const handleViewerChat = async (message: string) => {
    if (!ideaId || !viewerDocType) return false;
    const type = viewerDocType;
    setViewerBusy('chat');
    try {
      const res = await trackAI(`Updating ${DOC_INFO[type]?.label ?? type}`, () => aiService.chatDoc(ideaId, type, message));
      updateDocState(type, res.data);
      toast.success("Document updated");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update document"));
      return false;
    } finally {
      setViewerBusy(null);
    }
  };

  const handleViewerRewriteSelection = async (selection: string, message: string) => {
    if (!ideaId || !viewerDocType) return false;
    const type = viewerDocType;
    setViewerBusy('chat');
    try {
      const res = await trackAI(`Rewriting a section of ${DOC_INFO[type]?.label ?? type}`, () => aiService.regenerateDocSection(ideaId, type, selection, message));
      updateDocState(type, res.data);
      toast.success("Section rewritten");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to rewrite section"));
      return false;
    } finally {
      setViewerBusy(null);
    }
  };

  const handleViewerRegenerate = async () => {
    if (!viewerDocType) return;
    const label = DOC_INFO[viewerDocType]?.label ?? 'this document';
    if (!window.confirm(`Regenerate ${label} from scratch? The current version will be replaced.`)) return;
    const type = viewerDocType;
    setViewerBusy('regenerate');
    try {
      await runDocGeneration(type);
    } finally {
      setViewerBusy(null);
    }
  };

  // Tech Stack Local State
  const [editingTech, setEditingTech] = useState<string | null>(null);
  const [techFeedback, setTechFeedback] = useState<Record<string, string>>({});
  const [isRegeneratingTech, setIsRegeneratingTech] = useState<string | null>(null);

  const handleRegenerateTech = async (field: string) => {
    if (!ideaId) return;
    setIsRegeneratingTech(field);
    try {
      const res = await trackAI(`Regenerating ${field} stack`, () => aiService.regenerateValidationField(ideaId, `tech_stack.${field}`, techFeedback[field] || ''));
      // The backend returns the updated field value in the result or we might need to update the whole report
      // Based on common patterns, we update the local report state
      if (res.data && validationReport) {
          const updatedTech = { ...validationReport.tech_stack, [field]: res.data.value };
          const updatedReport = { ...validationReport, tech_stack: updatedTech };
          setValidationReport(updatedReport);
          handleValidationEdit(updatedReport);
          toast.success(`${field} tech stack updated`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to regenerate ${field}`));
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
        accept=".md,.markdown,.txt,.docx" 
      />

      <div className="flex-1">
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-12 pb-20">
          
          {initialLoading && !validationReport && !blueprint && <PlansPageSkeleton />}

          {/* Validation running for the first time: show where the report will land */}
          {!initialLoading && validating && !validationReport && <ValidationPlaceholder />}

          {/* 1. Input / Clarification Section (Only if no Idea or Clarification Needed) */}
          {!initialLoading && !validating && !validationReport && !blueprint && (
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
                            className={cn("bg-muted/20 text-sm sm:text-base min-h-[120px]", suggesting && "animate-pulse")}
                            placeholder={suggesting ? "AI is drafting a suggestion…" : "Your answer..."}
                         />
                         <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                            <Button variant="ghost" size="sm" onClick={handleSuggestAnswer} disabled={suggesting || submitting} className="w-full sm:w-auto order-2 sm:order-1">
                              {suggesting ? <ArrowClockwise className="animate-spin mr-2" /> : <MagicWand className="mr-2" />}
                              {suggesting ? 'Thinking…' : 'Suggest Answer'}
                            </Button>
                            <Button onClick={() => handleAnswerQuestion(aiSuggestion || '')} disabled={!aiSuggestion || submitting || suggesting} className="w-full sm:w-auto order-1 sm:order-2">
                              {submitting && <ArrowClockwise className="animate-spin mr-2" />}
                              {currentQuestionIndex < questions.length - 1 ? 'Next' : submitting ? 'Saving…' : 'Finish'}
                            </Button>
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
                         <Button onClick={handleSubmitIdea} disabled={submitting || !rawInput.trim()} className="w-full bg-primary font-bold h-10 sm:h-12 text-primary-foreground">
                            {submitting ? <ArrowClockwise className="animate-spin mr-2" /> : <MagicWand className="mr-2" />}
                            {submitting ? 'Reading your idea…' : 'Start Project Architecture'}
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
              generatingBlueprint={generatingBlueprint}
            />
          )}

          {/* Blueprint being generated for the first time */}
          {generatingBlueprint && !blueprint && <BlueprintPlaceholder />}

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
                                disabled={generatingBlueprint}
                            >
                                <ArrowClockwise className={cn(generatingBlueprint && "animate-spin text-primary")} size={14} />
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden sm:inline">
                                  {generatingBlueprint ? 'Regenerating…' : 'Regenerate'}
                                </span>
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
              busyDocType={busyDocType}
              handleOpenDoc={setViewerDocType}
              handleDownloadDoc={handleDownloadDoc}
              handleGenerateDocFlow={handleGenerateDocFlow}
              handleUploadClick={handleUploadClick}
              openAnalysis={openAnalysis}
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
        handleSkipAllQuestions={handleSkipAllQuestions}
        handleCancelQuestions={resetDocQuestions}
      />

      <DocViewerDialog
        doc={docs.find(d => d.asset_type === viewerDocType) ?? null}
        open={!!viewerDocType && docs.some(d => d.asset_type === viewerDocType)}
        onOpenChange={(open) => { if (!open && !viewerBusy) setViewerDocType(null); }}
        busy={viewerBusy}
        onChat={handleViewerChat}
        onRewriteSelection={handleViewerRewriteSelection}
        onRegenerate={handleViewerRegenerate}
        onDownload={() => viewerDocType && handleDownloadDoc(viewerDocType)}
        onReplace={() => viewerDocType && handleUploadClick(viewerDocType)}
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
