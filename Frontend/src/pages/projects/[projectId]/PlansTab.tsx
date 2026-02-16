import React, { useState, useEffect, useRef } from 'react';
import {
  MagicWand,
  ShieldCheck,
  Layout,
  FileText,
  ChatCircleText,
  ArrowClockwise,
  Plus,
  ArrowBendUpLeft,
  UploadSimple,
  Trash,
  X,
  Database,
  Lock,
  Lightbulb,
  TrendUp,
  Circuitry,
  Pencil,
  SkipForward,
  Coins,
  Stack,
  ChartBar,
  Rocket,
  CheckCircle,
  XCircle,
  ArrowRight,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  ArrowsOutSimple,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { aiService } from '@/services/ai.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types
type Phase = 'INPUT' | 'CLARIFICATION' | 'VALIDATION' | 'BLUEPRINT' | 'DOCUMENTATION';

interface Pillar {
  name: string;
  status: string;
  reason: string;
}

interface Feature {
  name: string;
  description: string;
  type: string;
}

interface TechStack {
  frontend: string[];
  backend: string[];
  infrastructure: string[];
}

interface ValidationReport {
  market_feasibility: {
    pillars: Pillar[];
    score: number;
    analysis: string;
  };
  core_features: Feature[];
  tech_stack: TechStack;
  pricing_model: any;
  improvements: string[];
}

interface BlueprintNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  subtasks?: string[];
  status?: string;
  completion?: number;
}

interface BlueprintEdge {
  from: string;
  to: string;
  label?: string;
}

interface Blueprint {
  user_flow_mermaid: string;
  kanban_features: { title: string; status: string; priority: string }[];
  nodes?: BlueprintNode[];
  edges?: BlueprintEdge[];
}

interface DocQuestion {
  id: string;
  question: string;
  suggestion?: string;
  optional?: boolean;
}

interface Doc {
  id: string;
  asset_type: string;
  content: string;
  chat_history?: Array<{ role: string; content: string }>;
  status?: string;
}

const DOC_INFO: Record<string, { label: string; icon: any; summary: string; color: string }> = {
  PRD: {
    label: 'Product Requirements',
    icon: FileText,
    summary: 'Core goals, target audience, user stories, and success metrics for the initiative.',
    color: 'blue'
  },
  APP_FLOW: {
    label: 'App Flow',
    icon: Layout,
    summary: 'Detailed navigation mapping and state transitions across all application screens.',
    color: 'purple'
  },
  TECH_STACK: {
    label: 'Tech Stack',
    icon: Stack,
    summary: 'Recommended frontend, backend, database, and infrastructure components.',
    color: 'green'
  },
  FRONTEND_GUIDELINES: {
    label: 'Frontend Guidelines',
    icon: ChatCircleText,
    summary: 'Component architecture, state management, styling patterns, and UI/UX standards.',
    color: 'orange'
  },
  BACKEND_SCHEMA: {
    label: 'Backend Schema',
    icon: Database,
    summary: 'ER diagrams, API endpoints, authentication logic, and data relationship models.',
    color: 'red'
  },
  IMPLEMENTATION_PLAN: {
    label: 'Implementation Plan',
    icon: Rocket,
    summary: 'Phased development roadmap with milestones, tasks, and resource allocation.',
    color: 'cyan'
  }
};

// Blueprint Canvas Component
const BlueprintCanvas = ({ 
  nodes = [], 
  edges = [], 
  onNodeClick,
  className
}: { 
  nodes?: BlueprintNode[], 
  edges?: BlueprintEdge[],
  onNodeClick?: (node: BlueprintNode) => void,
  className?: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Node dimensions
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 160; // Approximate height with header + subtasks

  // Calculate connection point between two nodes
  const getConnectionPoints = (from: BlueprintNode, to: BlueprintNode) => {
    const fromCenterX = from.x + NODE_WIDTH / 2;
    const fromCenterY = from.y + NODE_HEIGHT / 2;
    const toCenterX = to.x + NODE_WIDTH / 2;
    const toCenterY = to.y + NODE_HEIGHT / 2;

    // Determine which edge to connect from/to based on relative positions
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    let x1, y1, x2, y2;

    // From node connection point
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        // To the right
        x1 = from.x + NODE_WIDTH;
        y1 = fromCenterY;
      } else {
        // To the left
        x1 = from.x;
        y1 = fromCenterY;
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        // Below
        x1 = fromCenterX;
        y1 = from.y + NODE_HEIGHT;
      } else {
        // Above
        x1 = fromCenterX;
        y1 = from.y;
      }
    }

    // To node connection point
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        // From the left
        x2 = to.x;
        y2 = toCenterY;
      } else {
        // From the right
        x2 = to.x + NODE_WIDTH;
        y2 = toCenterY;
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        // From above
        x2 = toCenterX;
        y2 = to.y;
      } else {
        // From below
        x2 = toCenterX;
        y2 = to.y + NODE_HEIGHT;
      }
    }

    return { x1, y1, x2, y2 };
  };

  // If no nodes, show placeholder
  if (!nodes || nodes.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-[500px] text-white/20 bg-black/40 rounded-xl border border-white/5", className)}>
        <Layout size={48} weight="thin" />
        <p className="mt-4 text-sm">No blueprint nodes generated yet.</p>
      </div>
    );
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const newScale = Math.min(Math.max(0.5, scale - e.deltaY * 0.001), 2);
      setScale(newScale);
    }
  };

  return (
    <div 
      className={cn("relative w-full h-[400px] sm:h-[600px] bg-[#050505] overflow-hidden rounded-xl border border-white/10 group cursor-grab active:cursor-grabbing shadow-inner", className)}
      ref={containerRef}
      onWheel={handleWheel}
    >
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          transform: `translate(${position.x}px, ${position.y}px)`
        }}
      />

      {/* Controls */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 bg-black/80 backdrop-blur-md p-2 rounded-lg border border-white/10 shadow-xl">
        <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
          <MagnifyingGlassPlus />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setScale(1)}>
          <ArrowsOutSimple />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
          <MagnifyingGlassMinus />
        </Button>
      </div>

      {/* Canvas Layer with pan/zoom */}
      <motion.div
        className="w-full h-full origin-top-left"
        drag
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        style={{ scale, x: position.x, y: position.y }}
      >
        <div className="relative w-[2000px] h-[2000px]">
           {/* Edges - SVG layer that moves with the canvas */}
           <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
            {edges.map((edge, i) => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const { x1, y1, x2, y2 } = getConnectionPoints(fromNode, toNode);

              return (
                <g key={i}>
                  <line 
                    x1={x1} 
                    y1={y1} 
                    x2={x2} 
                    y2={y2} 
                    stroke="#4a5568" 
                    strokeWidth="2" 
                    className="opacity-40"
                  />
                  {/* Arrow head */}
                  <circle cx={x2} cy={y2} r="4" fill="#4a5568" className="opacity-60" />
                </g>
              );
            })}
          </svg>

          {/* Nodes - positioned absolutely but not draggable individually */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute w-[240px] bg-[#0A0A0A]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden hover:border-primary/30 hover:shadow-primary/5 transition-all cursor-pointer hover:scale-[1.02]"
              style={{ 
                left: node.x, 
                top: node.y,
                zIndex: 1
              }}
              onClick={(e) => {
                e.stopPropagation();
                onNodeClick?.(node);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center bg-gradient-to-br",
                      node.type === 'entry' ? "from-purple-500/20 to-purple-500/5 text-purple-400" :
                      node.type === 'action' ? "from-blue-500/20 to-blue-500/5 text-blue-400" :
                      node.type === 'service' ? "from-cyan-500/20 to-cyan-500/5 text-cyan-400" :
                      node.type === 'database' ? "from-amber-500/20 to-amber-500/5 text-amber-400" :
                      node.type === 'external' ? "from-pink-500/20 to-pink-500/5 text-pink-400" :
                      "from-emerald-500/20 to-emerald-500/5 text-emerald-400"
                    )}>
                      {node.type === 'database' ? <Database size={14} weight="duotone" /> : 
                       node.type === 'external' ? <ArrowSquareOut size={14} weight="duotone" /> :
                       <Layout size={14} weight="duotone" />}
                    </div>
                    <span className="text-xs font-bold text-white/90">{node.label}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-white/30">
                    <span>Completion</span>
                    <span>{node.completion || 0}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        (node.completion || 0) === 100 ? "bg-emerald-500" : 
                        node.type === 'database' ? "bg-amber-500" :
                        node.type === 'service' ? "bg-cyan-500" :
                        "bg-primary"
                      )}
                      style={{ width: `${node.completion || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              {node.subtasks && node.subtasks.length > 0 && (
                <div className="p-3 space-y-2 bg-black/20">
                  {node.subtasks.slice(0, 4).map((task, i) => (
                    <div key={i} className="flex items-center gap-2.5 group">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                        i === 0 ? "bg-emerald-500 group-hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                        i === 1 ? "bg-blue-500 group-hover:bg-blue-400" :
                        "bg-white/20 group-hover:bg-white/40"
                      )} />
                      <span className="text-[10px] text-white/60 truncate group-hover:text-white/90 transition-colors">{task}</span>
                    </div>
                  ))}
                  {node.subtasks.length > 4 && (
                    <div className="text-[9px] font-bold text-white/20 pl-4 pt-1 uppercase tracking-widest">
                      +{node.subtasks.length - 4} more tasks
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};


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
  const [chatMessage, setChatMessage] = useState('');
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
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

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedDoc = docs.find(d => d.asset_type === selectedDocType);

  const fetchNodeDetails = async (nodeId: string) => {
    if (!ideaId) return;
    try {
      const res = await aiService.getNodeDetails(ideaId, nodeId);
      setNodeDetails(res.data);
    } catch (error) {
      console.error("Failed to fetch node details", error);
    }
  };

  const handleLinkIssue = async (issueId: string) => {
    if (!ideaId || !selectedNode) return;
    try {
      await aiService.linkIssueToNode(ideaId, selectedNode.id, issueId);
      toast.success("Issue linked to node");
      fetchNodeDetails(selectedNode.id);
      loadIdea(ideaId); // Refresh main blueprint data
      setIsLinkingIssue(false);
    } catch (error) {
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
    } catch (error) {
      toast.error("Failed to unlink issue");
    }
  };

  const loadProjectIssues = async () => {
    try {
      // Lazy load to avoid circular deps if any
      const { issueService } = await import('@/services/issues');
      const res = await issueService.getAll({ project_id: projectId, limit: 100 });
      setProjectIssues(res.issues);
    } catch (error) {
      console.error("Failed to load project issues", error);
    }
  };

  // Sync node details when selected
  useEffect(() => {
    if (selectedNode) {
        fetchNodeDetails(selectedNode.id);
    } else {
        setNodeDetails(null);
    }
  }, [selectedNode]);

  // Load project issues when linking modal opens
  useEffect(() => {
    if (isLinkingIssue) {
        loadProjectIssues();
    }
  }, [isLinkingIssue]);

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
        } catch (error) {
          // Ignore error
        } finally {
          setLoading(false);
        }
      }
    };
    loadMostRecentIdea();
  }, [projectId, initialIdeaId]);

  useEffect(() => {
    if (ideaId) loadIdea(ideaId);
  }, [ideaId]);

  const loadIdea = async (id: string) => {
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

          const blueprintAsset = data.assets.find((a: any) => a.asset_type === 'DIAGRAM_USER_FLOW');
          const kanbanAsset = data.assets.find((a: any) => a.asset_type === 'DIAGRAM_KANBAN');

          if (blueprintAsset && kanbanAsset) {
            // Try to parse nodes from blueprint data or fallback
            let nodes: BlueprintNode[] = [];
            let edges: BlueprintEdge[] = [];
            
            if (res.data.blueprint) {
                nodes = res.data.blueprint.nodes || [];
                edges = res.data.blueprint.edges || [];
            } 
            
            // If backend returned empty nodes (legacy data), provide a detailed mock
            if (nodes.length === 0) {
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
                user_flow_mermaid: blueprintAsset.content,
                kanban_features: JSON.parse(kanbanAsset.content || '[]'),
                nodes,
                edges
            });
          }
      }
    } catch (error) {
      toast.error("Failed to load project plans");
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      toast.error("Failed to submit project description");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestAnswer = async () => {
    if (!ideaId) return;
    setLoading(true);
    try {
      const res = await aiService.suggestAnswer(ideaId, currentQuestionIndex);
      setAiSuggestion(res.data.suggestion);
    } catch (error) {
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
      } catch (error) {
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
      setIsRefining(false);
      setRefineFeedback('');
      if (feedback) toast.success("Analysis regenerated");
    } catch (error) {
      toast.error("Validation failed");
    } finally {
      setLoading(false);
      setRevalidating(false);
    }
  };

  const handleValidationEdit = () => {
    if (!ideaId || !validationReport) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await aiService.updateValidationReport(ideaId, validationReport);
      } catch (error) { console.error("Auto-save failed", error); }
    }, 2000);
  };

  const triggerRevalidation = async (feedback: string) => {
    if (revalidating) return;
    await handleValidate(ideaId!, feedback);
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
    } catch (error) {
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
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setLoading(false);
      setUploadingDocType(null);
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    setSelectedDocType(type);
  };
  
  const handleChatDoc = async () => {
    if (!chatMessage.trim() || !selectedDocType || !ideaId) return;
    setLoading(true);
    try {
      const res = await aiService.chatDoc(ideaId, selectedDocType, chatMessage);
      updateDocState(selectedDocType, res.data);
      setChatMessage('');
      toast.success("Document refined");
    } catch (error) {
      toast.error("Failed to refine document");
    } finally {
      setLoading(false);
    }
  };

  // Render Helpers
  const renderValidationSection = () => {
    if (!validationReport) return null;
    const isAccepted = !!blueprint;
    const score = validationReport.market_feasibility.score || 0;
    const scoreOutOf10 = (score / 10).toFixed(1);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
               <ShieldCheck size={20} weight="bold" />
             </div>
             <div>
                <h2 className="text-xl font-bold tracking-tight text-white/90">Architecture Validation</h2>
                {isAccepted && <p className="text-xs text-white/40 font-medium">Validation complete & approved</p>}
             </div>
           </div>
           
           {/* Score Display */}
           <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/5 self-start sm:self-auto">
              <div className="text-right">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Feasibility Score</div>
                  <div className={cn(
                      "text-2xl font-black",
                      score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-red-400"
                  )}>
                      {scoreOutOf10}<span className="text-sm text-white/20 font-bold">/10</span>
                  </div>
              </div>
              <div className="h-10 w-10 relative flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
                      <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4" className={cn(score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-red-400")} strokeDasharray="100" strokeDashoffset={100 - score} />
                  </svg>
              </div>
           </div>
        </div>

        {/* Validation Content (Simplified if accepted, Detailed if editing) */}
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", isAccepted && "opacity-80 grayscale-[0.3]")}>
           {validationReport.market_feasibility.pillars.map((pillar) => {
              const pillarScore = pillar.status === 'Strong' ? 9 : pillar.status === 'Moderate' ? 7 : pillar.status === 'Weak' ? 4 : 2;
              return (
              <Card key={pillar.name} className="border-white/5 bg-white/5 backdrop-blur-sm relative overflow-hidden">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40">{pillar.name}</span>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[10px] font-bold",
                            pillarScore >= 8 ? "text-emerald-400" : pillarScore >= 6 ? "text-yellow-400" : "text-red-400"
                        )}>
                            {pillarScore}/10
                        </span>
                        <Badge variant={pillar.status === 'Strong' ? 'default' : 'secondary'} className="h-5 text-[9px]">{pillar.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                {!isAccepted && (
                  <CardContent className="py-2 text-xs text-muted-foreground">{pillar.reason}</CardContent>
                )}
                {/* Score Bar */}
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/5">
                    <div 
                        className={cn("h-full", pillarScore >= 8 ? "bg-emerald-500" : pillarScore >= 6 ? "bg-yellow-500" : "bg-red-500")} 
                        style={{ width: `${pillarScore * 10}%` }} 
                    />
                </div>
              </Card>
           )})}
        </div>

        {!isAccepted && (
            <div className="flex justify-end pt-4">
               <Button onClick={handleGenerateBlueprint} className="bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
                  Accept & Generate Blueprint <ArrowRight className="ml-2" />
               </Button>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#090909]">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
        accept=".md,.txt,.pdf,.docx" 
      />

      <ScrollArea className="flex-1">
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-8 sm:space-y-16 pb-32">
          
          {/* 1. Input / Clarification Section (Only if no Idea or Clarification Needed) */}
          {!validationReport && !blueprint && (
             <div className="min-h-[400px]">
                {phase === 'CLARIFICATION' ? (
                   <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                         <CardTitle>Clarification Needed</CardTitle>
                         <CardDescription>Question {currentQuestionIndex + 1} of {questions.length}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                         <h3 className="text-lg font-semibold">{questions[currentQuestionIndex]?.question}</h3>
                         <Textarea 
                            value={aiSuggestion || ''} 
                            onChange={e => setAiSuggestion(e.target.value)} 
                            className="bg-black/20"
                            placeholder="Your answer..."
                         />
                         <div className="flex justify-between">
                            <Button variant="ghost" onClick={handleSuggestAnswer} disabled={loading}>Suggest Answer</Button>
                            <Button onClick={() => handleAnswerQuestion(aiSuggestion || '')} disabled={!aiSuggestion}>Next</Button>
                         </div>
                      </CardContent>
                   </Card>
                ) : (
                   <Card className="border-white/5 bg-white/5">
                      <CardHeader>
                         <CardTitle>Describe your Idea</CardTitle>
                         <CardDescription>Start by describing what you want to build.</CardDescription>
                      </CardHeader>
                      <CardContent>
                         <Textarea 
                            value={rawInput} 
                            onChange={e => setRawInput(e.target.value)} 
                            className="min-h-[200px] bg-black/20 text-lg"
                            placeholder="E.g., A marketplace for vintage watches..."
                         />
                      </CardContent>
                      <CardFooter>
                         <Button onClick={handleSubmitIdea} disabled={loading || !rawInput.trim()} className="w-full bg-primary font-bold">
                            {loading ? <ArrowClockwise className="animate-spin mr-2" /> : <MagicWand className="mr-2" />}
                            Start Project Architecture
                         </Button>
                      </CardFooter>
                   </Card>
                )}
             </div>
          )}

          {/* 2. Validation Section (Persistent at Top) */}
          {validationReport && renderValidationSection()}

          {/* 3. Blueprint Section (Middle) */}
          {blueprint && (
            <div className="space-y-6 animate-in fade-in duration-700">
               <div className="flex items-center justify-between border-b border-white/5 pb-4">
                 <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
                     <Layout size={20} weight="bold" />
                   </div>
                   <div>
                      <h2 className="text-xl font-bold tracking-tight text-white/90">Visual Blueprint</h2>
                      <p className="text-xs text-white/40 font-medium">Interactive architecture map</p>
                   </div>
                 </div>
                 <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-2 text-white/40 hover:text-white hover:bg-white/5"
                                onClick={handleGenerateBlueprint}
                                disabled={loading}
                            >
                                {loading ? <ArrowClockwise className="animate-spin" /> : <ArrowClockwise />}
                                <span className="text-xs font-bold uppercase tracking-widest">Regenerate</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-zinc-900 border-white/10 text-[10px] font-bold uppercase tracking-widest">
                            Redo blueprint generation
                        </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
               </div>
               
               <BlueprintCanvas 
                  nodes={blueprint.nodes} 
                  edges={blueprint.edges}
                  onNodeClick={(node) => {
                    console.log('Node clicked:', node);
                    setSelectedNode(node);
                    console.log('Selected node set, opening modal');
                    setBlueprintModalOpen(true);
                  }}
                />
               
               {/* Kanban Preview */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                 {blueprint.kanban_features.slice(0, 4).map((f, i) => (
                    <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5">
                       <div className="text-xs font-bold text-white/60 mb-1">{f.title}</div>
                       <Badge variant="secondary" className="text-[9px]">{f.status}</Badge>
                    </div>
                 ))}
               </div>
            </div>
          )}

          {/* 4. Documentation Section (Bottom) */}
          {(validationReport || blueprint) && (
            <div className="space-y-8 animate-in fade-in duration-700 pt-8 border-t border-white/5">
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10">
                       <FileText size={20} weight="bold" />
                     </div>
                     <div>
                        <h2 className="text-xl font-bold tracking-tight text-white/90">Documentation</h2>
                        <p className="text-xs text-white/40 font-medium">Technical specifications and guides</p>
                     </div>
                   </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(DOC_INFO).map(([id, info]) => {
                     const isGenerated = docs.find(d => d.asset_type === id);
                     return (
                        <Card 
                          key={id} 
                          className={cn(
                            "cursor-pointer hover:border-white/20 transition-all group overflow-hidden",
                            isGenerated ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5 border-white/5"
                          )}
                          onClick={(e) => {
                              // Prevent click if upload button triggered
                              if ((e.target as HTMLElement).closest('.upload-btn')) return;
                              if (isGenerated) setSelectedDocType(id);
                              else handleGenerateDocFlow(id);
                          }}
                        >
                           <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                 <info.icon className={isGenerated ? "text-emerald-400" : "text-white/40"} size={24} />
                                 {isGenerated && <CheckCircle className="text-emerald-400" weight="fill" />}
                              </div>
                              <CardTitle className="text-sm mt-3">{info.label}</CardTitle>
                           </CardHeader>
                           <CardContent>
                              <p className="text-xs text-white/40 min-h-[40px]">{info.summary}</p>
                           </CardContent>
                           <CardFooter className="pt-0 flex gap-2">
                              {/* If not generated, show Upload option */}
                              {!isGenerated && (
                                <>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="upload-btn h-7 text-[10px] w-full border-white/10 hover:bg-white/5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUploadClick(id);
                                        }}
                                    >
                                        <UploadSimple className="mr-1" /> Upload
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        className="h-7 text-[10px] w-full bg-white/10 hover:bg-white/20 text-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerateDocFlow(id);
                                        }}
                                    >
                                        <MagicWand className="mr-1" /> Generate
                                    </Button>
                                </>
                              )}
                              {isGenerated && (
                                <span 
                                    className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                                    onClick={(e) => {
                                        if (isGenerated.content.startsWith('http')) {
                                            e.stopPropagation();
                                            window.open(isGenerated.content, '_blank');
                                        }
                                    }}
                                >
                                    {isGenerated.content.startsWith('http') ? 'Open in Google Docs' : 'Open Document'} <ArrowRight />
                                </span>
                              )}
                           </CardFooter>
                        </Card>
                     )
                  })}
               </div>
            </div>
          )}
          
          {/* Doc Viewer */}
          {selectedDocType && selectedDoc && (
             <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-8 animate-in fade-in duration-200">
                <Card className="w-full max-w-5xl h-full max-h-[95vh] sm:max-h-[90vh] bg-[#0A0A0A] border-white/10 flex flex-col shadow-2xl">
                   <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                            {React.createElement(DOC_INFO[selectedDocType].icon, { size: 18 })}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{DOC_INFO[selectedDocType].label}</CardTitle>
                            {selectedDoc.content.startsWith('http') && (
                                <a href={selectedDoc.content} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                    Open External Link <ArrowRight size={10} />
                                </a>
                            )}
                          </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedDocType(null)}><X /></Button>
                   </CardHeader>
                   <ScrollArea className="flex-1 p-8">
                      <div className="prose prose-invert max-w-none prose-sm">
                         {selectedDoc.content.startsWith('http') ? (
                             <div className="flex flex-col items-center justify-center h-full py-20 opacity-50">
                                 <p>This is an external document.</p>
                                 <Button variant="outline" className="mt-4" onClick={() => window.open(selectedDoc.content, '_blank')}>
                                     Open in New Tab
                                 </Button>
                             </div>
                         ) : (
                             <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                         )}
                      </div>
                   </ScrollArea>
                   <CardFooter className="p-4 border-t border-white/5 bg-white/[0.02]">
                      <div className="flex w-full gap-2">
                         <Input 
                            value={chatMessage} 
                            onChange={e => setChatMessage(e.target.value)} 
                            placeholder="Refine this document with AI..."
                            className="bg-black/20 border-white/10"
                         />
                         <Button onClick={handleChatDoc} disabled={loading}>
                            {loading ? <ArrowClockwise className="animate-spin" /> : <Pencil className="mr-2" />}
                            Refine
                         </Button>
                      </div>
                   </CardFooter>
                </Card>
             </div>
          )}

        </div>
      </ScrollArea>

      {/* Blueprint Full-Page Modal */}
      <Dialog open={blueprintModalOpen} onOpenChange={setBlueprintModalOpen}>
        <DialogContent 
          className="!max-w-none bg-[#0A0A0A] border-white/10 w-[98vw] md:w-[95vw] h-[95vh] md:h-[90vh] p-0 overflow-hidden flex flex-col" 
          key={blueprintModalOpen ? 'open' : 'closed'}
        >
          <VisuallyHidden>
            <DialogTitle>Blueprint Viewer</DialogTitle>
            <DialogDescription>
              Interactive blueprint canvas with node details and issue generation
            </DialogDescription>
          </VisuallyHidden>
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Full Canvas Area */}
            <div className="flex-1 relative overflow-hidden min-w-0 h-1/2 md:h-full">
              <BlueprintCanvas 
                className="h-full border-0 rounded-none"
                nodes={blueprint?.nodes || []} 
                edges={blueprint?.edges || []}
                onNodeClick={(node) => {
                  setSelectedNode(node);
                }}
              />
              {/* Close Button */}
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/80 hover:bg-black text-white/60 hover:text-white z-50"
                onClick={() => {
                  setBlueprintModalOpen(false);
                  setSelectedNode(null);
                }}
              >
                <X />
              </Button>
            </div>

            {/* Sidebar */}
            <div className="w-full md:w-[350px] lg:w-[400px] border-t md:border-t-0 md:border-l border-white/10 bg-[#050505] p-4 md:p-6 overflow-y-auto flex-shrink-0 h-1/2 md:h-full">
              {selectedNode ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300">
                  {/* Node Header */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br",
                        selectedNode.type === 'entry' ? "from-purple-500/20 to-purple-500/5 text-purple-400" :
                        selectedNode.type === 'action' ? "from-blue-500/20 to-blue-500/5 text-blue-400" :
                        selectedNode.type === 'service' ? "from-cyan-500/20 to-cyan-500/5 text-cyan-400" :
                        selectedNode.type === 'database' ? "from-amber-500/20 to-amber-500/5 text-amber-400" :
                        selectedNode.type === 'external' ? "from-pink-500/20 to-pink-500/5 text-pink-400" :
                        "from-emerald-500/20 to-emerald-500/5 text-emerald-400"
                      )}>
                        {selectedNode.type === 'database' ? <Database size={20} weight="duotone" /> : 
                         selectedNode.type === 'external' ? <ArrowSquareOut size={20} weight="duotone" /> :
                         <Layout size={20} weight="duotone" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{selectedNode.label}</h3>
                        <p className="text-xs text-white/40 uppercase tracking-wider font-bold">{selectedNode.type}</p>
                      </div>
                    </div>

                    {/* Completion */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-white/40">
                        <span>COMPLETION</span>
                        <span>{(nodeDetails?.completion ?? selectedNode.completion) || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
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
                        <p className="text-[10px] text-white/30 text-right font-medium">
                          {nodeDetails.stats.done_issues} / {nodeDetails.stats.total_issues} issues completed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Issues Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Linked Issues</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                        onClick={() => setIsLinkingIssue(!isLinkingIssue)}
                      >
                        {isLinkingIssue ? 'Cancel' : <><Plus className="mr-1" /> Add Issue</>}
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
                          <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                            <Input 
                              placeholder="Search project issues..."
                              value={issueSearchQuery}
                              onChange={(e) => setIssueSearchQuery(e.target.value)}
                              className="h-8 text-xs bg-black/40 border-white/5"
                            />
                            <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {projectIssues
                                .filter(i => i.title.toLowerCase().includes(issueSearchQuery.toLowerCase()))
                                .filter(i => !nodeDetails?.issues.some((ni: any) => ni.id === i.id))
                                .map(issue => (
                                  <div 
                                    key={issue.id} 
                                    className="flex items-center justify-between p-2 rounded-md hover:bg-white/5 group cursor-pointer transition-colors"
                                    onClick={() => handleLinkIssue(issue.id)}
                                  >
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[10px] font-mono text-white/40">{issue.identifier}</span>
                                      <span className="text-xs text-white/70 truncate">{issue.title}</span>
                                    </div>
                                    <Plus size={14} className="text-white/20 group-hover:text-primary transition-colors shrink-0" />
                                  </div>
                                ))}
                              {projectIssues.length === 0 && <p className="text-[10px] text-white/20 text-center py-4">No other issues found</p>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Linked Issues List */}
                    <div className="space-y-2">
                      {nodeDetails?.issues && nodeDetails.issues.length > 0 ? (
                        nodeDetails.issues.map((issue: any) => (
                          <div key={issue.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono text-white/30">{issue.identifier}</span>
                                <Badge variant="outline" className={cn(
                                  "text-[8px] h-4 px-1.5 uppercase font-black",
                                  issue.status === 'done' ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                                  issue.status === 'in_progress' ? "text-blue-400 border-blue-500/20 bg-blue-500/5" :
                                  "text-white/30 border-white/5 bg-white/5"
                                )}>
                                  {issue.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <span className="text-xs font-medium text-white/80 truncate">{issue.title}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-white/10 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleUnlinkIssue(issue.id)}
                            >
                              <Trash size={14} />
                            </Button>
                          </div>
                        ))
                      ) : !isLinkingIssue && (
                        <div className="py-8 text-center space-y-2">
                          <p className="text-xs text-white/20">No issues linked to this component.</p>
                          <p className="text-[10px] text-white/10 italic">Generate issues or link existing ones to track progress.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Generate Issues Button */}
                  <div className="pt-4 border-t border-white/5">
                    <Button
                      onClick={async () => {
                        if (!ideaId || !selectedNode) return;
                        setGeneratingIssues(true);
                        try {
                          const response = await aiService.generateIssuesForNode(ideaId, selectedNode.id);
                          toast.success(response.data?.message || 'Issues generated successfully!');
                          // Close modal after successful generation
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
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
                    >
                      {generatingIssues ? (
                        <>
                          <ArrowClockwise className="mr-2 animate-spin" />
                          Generating Issues...
                        </>
                      ) : (
                        <>
                          <Rocket className="mr-2" weight="duotone" />
                          Generate Issues
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-white/30 mt-2 text-center">
                      AI will create issues, features, and milestones for this component
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/40">
                  <Layout size={48} weight="thin" className="mb-4" />
                  <p className="text-sm">Click a node to view details</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doc Questions Dialog */}
      <Dialog open={docQuestionsOpen} onOpenChange={setDocQuestionsOpen}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 sm:max-w-[500px]">
          <DialogHeader>
             <DialogTitle>Clarification Needed</DialogTitle>
             <DialogDescription>
                Question {docQuestionIndex + 1} of {docQuestions.length} for {DOC_INFO[generatingDocType || '']?.label}
             </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <p className="text-lg font-medium leading-relaxed">{docQuestions[docQuestionIndex]?.question}</p>
             <Textarea 
                value={docAiSuggestion || ''}
                onChange={e => setDocAiSuggestion(e.target.value)}
                placeholder="Your answer..."
                className="bg-white/5 min-h-[100px]"
             />
             <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setDocAiSuggestion(docQuestions[docQuestionIndex].suggestion || '')} className="text-xs">
                   <Lightbulb className="mr-2" /> Use Suggestion
                </Button>
                <div className="flex gap-2">
                   <Button variant="outline" onClick={() => handleDocQuestionAnswer(docQuestions[docQuestionIndex].suggestion || "Skipped")}>Skip</Button>
                   <Button onClick={() => handleDocQuestionAnswer(docAiSuggestion || '')} disabled={!docAiSuggestion}>Next</Button>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}