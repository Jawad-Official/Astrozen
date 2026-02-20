import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ArrowSquareOut,
  CheckSquare,
  CreditCard
} from '@phosphor-icons/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
  database: string[];
  infrastructure: string[];
}

interface PricingTier {
  name: string;
  price: string;
  annual_price?: string;
  features: string[];
}

interface PricingModel {
  type: string;
  recommended_type?: string;
  reasoning?: string;
  tiers: PricingTier[];
}

interface ValidationReport {
  market_feasibility: {
    pillars: Pillar[];
    score: number;
    analysis: string;
  };
  core_features: Feature[];
  tech_stack: TechStack;
  pricing_model: PricingModel;
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

const DEFAULT_PRICING_TIERS: Record<string, PricingTier[]> = {
  'One-Time Purchase': [
    { name: 'Basic', price: '$49', features: ['Core features access', 'Basic support', '1 user license'] },
    { name: 'Pro', price: '$99', features: ['All Basic features', 'Priority support', '5 user licenses', 'Advanced features'] },
    { name: 'Lifetime', price: '$299', features: ['All Pro features', 'Lifetime updates', 'Unlimited users', 'Premium support'] }
  ],
  'Subscription': [
    { name: 'Starter', price: '$9 / month', annual_price: '$89 / year', features: ['Basic features', '1 user', 'Email support'] },
    { name: 'Growth', price: '$29 / month', annual_price: '$279 / year', features: ['All Starter features', '5 users', 'Priority support', 'Analytics'] },
    { name: 'Business', price: '$99 / month', annual_price: '$949 / year', features: ['All Growth features', 'Unlimited users', 'Dedicated support', 'Custom integrations'] }
  ],
  'Freemium': [
    { name: 'Free', price: '$0', features: ['Limited features', '1 project', 'Community support'] },
    { name: 'Plus', price: '$15 / month', annual_price: '$149 / year', features: ['All Free features', '10 projects', 'Priority support', 'Advanced features'] },
    { name: 'Pro', price: '$49 / month', annual_price: '$469 / year', features: ['All Plus features', 'Unlimited projects', 'Premium support', 'API access'] }
  ],
  'Pay-Per-Use / Credits': [
    { name: 'Starter Pack', price: '$10 / 1k credits', features: ['1,000 credits', 'Basic usage', 'No expiry'] },
    { name: 'Standard Pack', price: '$49 / 10k credits', features: ['10,000 credits', '20% bonus credits', 'Priority processing'] },
    { name: 'Enterprise Pack', price: '$199 / 50k credits', features: ['50,000 credits', '50% bonus credits', 'Dedicated support', 'Custom limits'] }
  ],
  'Pay-Per-User': [
    { name: 'Team', price: '$5 / user / month', features: ['Per user billing', 'Basic features', 'Email support'] },
    { name: 'Business', price: '$15 / user / month', features: ['All Team features', 'Advanced features', 'Priority support'] },
    { name: 'Enterprise', price: '$35 / user / month', features: ['All Business features', 'SSO', 'Dedicated support', 'Custom limits'] }
  ],
  'In-App Purchases': [
    { name: 'Remove Ads', price: '$4.99 one-time', features: ['Ad-free experience', 'Permanent unlock'] },
    { name: 'Theme Pack', price: '$2.99 one-time', features: ['5 premium themes', 'Dark mode variants'] },
    { name: 'Pro Bundle', price: '$9.99 / month', features: ['All premium features', 'Early access', 'Exclusive content'] }
  ]
};

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

// Constants for Blueprint Canvas
const GRID_SIZE = 20;
const NODE_WIDTH = 240;
const NODE_HEIGHT = 160;

// Blueprint Canvas Component
const BlueprintCanvas = ({ 
  nodes = [], 
  edges = [], 
  onNodeClick,
  onCanvasClick,
  onNodesChange,
  className
}: { 
  nodes?: BlueprintNode[], 
  edges?: BlueprintEdge[],
  onNodeClick?: (node: BlueprintNode) => void,
  onCanvasClick?: () => void,
  onNodesChange?: (nodes: BlueprintNode[]) => void,
  className?: string
}) => {  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 }); 
  const isCanvasDragging = useRef(false);

  // Internal nodes state for dragging
  const [internalNodes, setInternalNodes] = useState<BlueprintNode[]>(nodes);
  
  // Sync props to state when props change
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  useEffect(() => {
    if (!draggingNodeId && nodes.length > 0) {
        setInternalNodes(nodes);
    }
  }, [nodes, draggingNodeId]);

  // Node Dragging References
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const nodeStartRef = useRef<{ x: number, y: number } | null>(null);
  const canvasStartRef = useRef<{ x: number, y: number } | null>(null);
  const canvasOriginRef = useRef<{ x: number, y: number } | null>(null);

  // Calculate connection point between two nodes
  const getConnectionPoints = (from: BlueprintNode, to: BlueprintNode) => {
    const fromCenterX = from.x + NODE_WIDTH / 2;
    const fromCenterY = from.y + NODE_HEIGHT / 2;
    const toCenterX = to.x + NODE_WIDTH / 2;
    const toCenterY = to.y + NODE_HEIGHT / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    let x1, y1, x2, y2;

    if (Math.abs(dx) > Math.abs(dy)) {
      x1 = dx > 0 ? from.x + NODE_WIDTH : from.x;
      y1 = fromCenterY;
      x2 = dx > 0 ? to.x : to.x + NODE_WIDTH;
      y2 = toCenterY;
    } else {
      x1 = fromCenterX;
      y1 = dy > 0 ? from.y + NODE_HEIGHT : from.y;
      x2 = toCenterX;
      y2 = dy > 0 ? to.y : to.y + NODE_HEIGHT;
    }

    return { x1, y1, x2, y2 };
  };

  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation(); 
    const node = internalNodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggingNodeId(nodeId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    nodeStartRef.current = { x: node.x, y: node.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    
    isCanvasDragging.current = true;
    canvasStartRef.current = { x: e.clientX, y: e.clientY };
    canvasOriginRef.current = { ...position };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      // Handle Node Drag
      if (draggingNodeId && dragStartRef.current && nodeStartRef.current) {
        const dx = (e.clientX - dragStartRef.current.x) / scale;
        const dy = (e.clientY - dragStartRef.current.y) / scale;

        const rawX = nodeStartRef.current.x + dx;
        const rawY = nodeStartRef.current.y + dy;
        
        // Grid Snapping
        const newX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        const newY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

        setInternalNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n));
        return;
      }

      // Handle Canvas Pan
      if (isCanvasDragging.current && canvasStartRef.current && canvasOriginRef.current) {
        const dx = (e.clientX - canvasStartRef.current.x);
        const dy = (e.clientY - canvasStartRef.current.y);
        
        const adjustedDx = dx / scale;
        const adjustedDy = dy / scale;

        setPosition({
            x: canvasOriginRef.current.x + adjustedDx,
            y: canvasOriginRef.current.y + adjustedDy
        });
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (draggingNodeId) {
        // Save only on pointer up to minimize backend calls
        setInternalNodes(current => {
            if (onNodesChange) onNodesChange(current);
            return current;
        });
        setDraggingNodeId(null);
      }
      
      if (isCanvasDragging.current) {
        isCanvasDragging.current = false;
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [draggingNodeId, scale, onNodesChange]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const newScale = Math.min(Math.max(0.2, scale - e.deltaY * 0.001), 3);
      setScale(newScale);
    }
  };

  const fitToView = useCallback(() => {
    if (internalNodes.length === 0 || !containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const minX = Math.min(...internalNodes.map(n => n.x));
    const maxX = Math.max(...internalNodes.map(n => n.x + NODE_WIDTH));
    const minY = Math.min(...internalNodes.map(n => n.y));
    const maxY = Math.max(...internalNodes.map(n => n.y + NODE_HEIGHT));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const padding = 60;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const newScale = Math.min(Math.max(0.2, Math.min(scaleX, scaleY)), 1.2);

    setScale(newScale);
    
    const centeredX = (containerWidth / newScale - contentWidth) / 2 - minX;
    const centeredY = (containerHeight / newScale - contentHeight) / 2 - minY;
    
    setPosition({ x: centeredX, y: centeredY });
  }, [internalNodes]);

  const [hasFitted, setHasFitted] = useState(false);
  useEffect(() => {
    if (internalNodes.length > 0 && !hasFitted) {
      fitToView();
      setHasFitted(true);
    }
  }, [internalNodes, hasFitted, fitToView]);

  useEffect(() => {
    if (internalNodes.length === 0 && hasFitted) {
      setHasFitted(false);
    }
  }, [internalNodes.length, hasFitted]);

  if (!internalNodes || internalNodes.length === 0) {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center h-[500px] text-white/20 bg-black/40 rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors", className)}
        onClick={onCanvasClick}
      >
        <Layout size={48} weight="thin" />
        <p className="mt-4 text-sm font-bold uppercase tracking-widest">No blueprint generated</p>
        <p className="text-[10px] mt-2 text-white/10 italic">Click to open full view</p>
      </div>
    );
  }

  return (
    <div 
      className={cn("relative w-full h-full bg-[#050505] overflow-hidden rounded-xl border border-white/10 group cursor-grab active:cursor-grabbing shadow-inner", className)}
      ref={containerRef}
      onWheel={handleWheel}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`,
        backgroundPosition: `${position.x * scale}px ${position.y * scale}px`
      }}
    >
      {/* Controls */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-50 flex flex-row sm:flex-col gap-2 bg-black/80 backdrop-blur-md p-2 rounded-lg border border-white/10 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
          <MagnifyingGlassPlus size={18} className="sm:hidden" />
          <MagnifyingGlassPlus size={16} className="hidden sm:block" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={fitToView}>
          <ArrowsOutSimple size={18} className="sm:hidden" />
          <ArrowsOutSimple size={16} className="hidden sm:block" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.max(0.2, s - 0.2))}>
          <MagnifyingGlassMinus size={18} className="sm:hidden" />
          <MagnifyingGlassMinus size={16} className="hidden sm:block" />
        </Button>
      </div>

      {/* Canvas Layer with pan/zoom */}
      <motion.div
        className="w-full h-full origin-top-left will-change-transform"
        onPointerDown={handleCanvasPointerDown}
        onClick={(e) => {
            if (!isCanvasDragging.current && !draggingNodeId && onCanvasClick) {
                onCanvasClick();
            }
        }}
        style={{ 
            scale,
            transform: `translate3d(0,0,0)` // Force GPU layer
        }}
      >
        <div 
            className="relative w-[10000px] h-[10000px]"
            style={{ 
                transform: `translate3d(${position.x}px, ${position.y}px, 0)` 
            }}
        >
           {/* Edges - SVG layer */}
           <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
            {edges.map((edge, i) => {
              const fromNode = internalNodes.find(n => n.id === edge.from);
              const toNode = internalNodes.find(n => n.id === edge.to);
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
                  <circle cx={x2} cy={y2} r="4" fill="#4a5568" className="opacity-60" />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {internalNodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                  "absolute w-[240px] bg-[#0A0A0A]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden hover:border-primary/30 hover:shadow-primary/5 will-change-transform",
                  draggingNodeId === node.id ? "z-[100] border-primary/50 shadow-2xl scale-[1.02] cursor-grabbing" : "z-10 cursor-grab transition-all duration-200"
              )}
              style={{ 
                transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                top: 0,
                left: 0,
                touchAction: 'none'
              }}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (!isCanvasDragging.current && !draggingNodeId) {
                    onNodeClick?.(node);
                }
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/5 bg-white/[0.02] pointer-events-none select-none">
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
                <div className="p-3 space-y-2 bg-black/20 pointer-events-none select-none">
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
  const [validationTab, setValidationTab] = useState<'overview' | 'features' | 'techstack' | 'pricing' | 'improvements'>('overview');
  const [selectedImprovementIndices, setSelectedImprovementIndices] = useState<number[]>([]);
  const [improvementStatus, setImprovementStatus] = useState<Record<number, string>>({});
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
  const handleDownloadDoc = (docType: string) => {
    const doc = docs.find(d => d.asset_type === docType);
    if (!doc) return;
    
    // If it's an external URL, just open it
    if (doc.content.startsWith('http')) {
      window.open(doc.content, '_blank');
      return;
    }
    
    // Download as markdown file (Google Docs can import this)
    const docName = DOC_INFO[docType]?.label || 'document';
    const filename = `${docName.replace(/\s+/g, '_')}.md`;
    
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Downloaded ${filename}. Open in Google Docs via File > Open.`);
  };

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
                edges: edges
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
                } catch (e) {
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
                    } catch (e) {
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

  const handleValidationEdit = (updatedReport: ValidationReport) => {
    if (!ideaId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await aiService.updateValidationReport(ideaId, updatedReport);
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
    } catch (error) {
      toast.error(`Failed to regenerate ${field}`);
    } finally {
      setIsRegeneratingTech(null);
      setEditingTech(null);
    }
  };

  // Render Helpers
  const renderValidationSection = () => {
    if (!validationReport) return null;
    const isAccepted = !!blueprint;
    const score = validationReport.market_feasibility.score || 0;
    const scoreOutOf10 = (score / 10).toFixed(1);

    const tabs = [
      { id: 'overview', label: 'Overview', icon: ShieldCheck, count: 6 },
      { id: 'features', label: 'Features', icon: CheckSquare, count: validationReport.core_features?.length || 0 },
      { id: 'techstack', label: 'Tech Stack', icon: Stack, count: 4 },
      { id: 'pricing', label: 'Pricing', icon: CreditCard, count: null },
      { id: 'improvements', label: 'Improve', icon: Lightbulb, count: validationReport.improvements?.length || 0 },
    ];

    return (
      <div className="space-y-0">
        {/* Header with Score */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 rounded-t-2xl border border-white/5 border-b-0">
           <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-500/20">
               <ShieldCheck size={24} weight="duotone" />
             </div>
             <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">AI Validation Report</h2>
                {isAccepted ? (
                  <p className="text-xs text-emerald-400/80 font-medium flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" /> Analysis approved
                  </p>
                ) : (
                  <p className="text-[10px] sm:text-xs text-white/40 font-medium uppercase tracking-wider">Market feasibility analysis</p>
                )}
             </div>
           </div>
           
           <div className="flex items-center gap-6 bg-white/5 px-4 py-3 rounded-xl border border-white/5">
              <div className="text-right">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Overall Score</div>
                  <div className={cn(
                      "text-3xl font-black leading-tight",
                      score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-red-400"
                  )}>
                      {scoreOutOf10}<span className="text-sm text-white/20 font-bold">/10</span>
                  </div>
              </div>
              <div className="h-12 w-12 relative">
                  <svg className="h-full w-full -rotate-90">
                      <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="5" className="text-white/10" />
                      <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="5" className={cn(score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-red-400")} strokeDasharray="283" strokeDashoffset={283 - (283 * score / 10)} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <TrendUp size={16} className={cn(score >= 60 ? "text-emerald-400" : "text-red-400")} />
                  </div>
              </div>
           </div>
        </div>

        {/* Tabs Navigation */}
        {!isAccepted && (
          <div className="flex overflow-x-auto gap-1 p-2 bg-white/[0.02] border-x border-white/5 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setValidationTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  validationTab === tab.id 
                    ? "bg-white/10 text-white shadow-lg border border-white/10" 
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                )}
              >
                <tab.icon size={14} weight={validationTab === tab.id ? "duotone" : "regular"} />
                {tab.label}
                {tab.count !== null && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded text-[9px]",
                    validationTab === tab.id ? "bg-white/20 text-white" : "bg-white/5 text-white/40"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className={cn("p-4 sm:p-6 bg-black/20 border border-white/5 rounded-b-2xl", isAccepted && "opacity-60")}>
          
          {/* OVERVIEW TAB */}
          {(validationTab === 'overview' || isAccepted) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {validationReport.market_feasibility.pillars.map((pillar) => {
                  const pillarScore = pillar.status === 'Strong' ? 9 : pillar.status === 'Moderate' ? 7 : pillar.status === 'Weak' ? 4 : 2;
                  const scoreColor = pillarScore >= 8 ? "emerald" : pillarScore >= 6 ? "yellow" : "red";
                  return (
                  <Card key={pillar.name} className="border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all group overflow-hidden">
                    <CardHeader className="py-3 px-4 border-b border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white/40">{pillar.name}</span>
                        <Badge variant="secondary" className={cn(
                          "h-5 text-[9px] px-2 font-bold",
                          pillar.status === 'Strong' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          pillar.status === 'Moderate' ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                          "bg-red-500/20 text-red-400 border border-red-500/30"
                        )}>{pillar.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 text-xs text-white/50 leading-relaxed min-h-[80px]">
                      {pillar.reason}
                    </CardContent>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                        <div className={cn("h-full transition-all duration-500", 
                          scoreColor === "emerald" ? "bg-emerald-500" : scoreColor === "yellow" ? "bg-yellow-500" : "bg-red-500"
                        )} style={{ width: `${pillarScore * 10}%` }} />
                    </div>
                    <div className="absolute top-3 right-12">
                      <span className={cn(
                          "text-sm font-black",
                          scoreColor === "emerald" ? "text-emerald-400" : scoreColor === "yellow" ? "text-yellow-400" : "text-red-400"
                      )}>{pillarScore}</span>
                    </div>
                  </Card>
               )})}
            </div>
          )}

          {/* FEATURES TAB */}
          {validationTab === 'features' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare size={18} className="text-blue-400" weight="duotone" />
                  <h3 className="text-base font-bold text-white/90">Project Core Features</h3>
                </div>
                {!isAccepted && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] uppercase font-bold tracking-widest border-white/10 hover:bg-white/5 text-primary"
                    onClick={() => {
                      const newFeatures = [...(validationReport.core_features || []), { name: 'New Feature', description: 'Description', type: 'Core' }];
                      const updatedReport = {...validationReport, core_features: newFeatures};
                      setValidationReport(updatedReport);
                      handleValidationEdit(updatedReport);
                    }}
                  >
                    <Plus className="mr-1" size={14} weight="bold" /> Add Feature
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(validationReport.core_features || []).map((feature, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 group relative flex items-start gap-4 hover:border-white/20 transition-all">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckSquare size={16} weight="bold" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <Input
                        value={feature.name}
                        readOnly={isAccepted}
                        onChange={(e) => {
                          const newFeatures = [...(validationReport.core_features || [])];
                          newFeatures[idx].name = e.target.value;
                          const updatedReport = {...validationReport, core_features: newFeatures};
                          setValidationReport(updatedReport);
                          handleValidationEdit(updatedReport);
                        }}
                        className={cn(
                          "h-7 text-sm font-bold bg-transparent border-none p-0 focus-visible:ring-0 text-white/90",
                          isAccepted && "cursor-default"
                        )}
                        placeholder="Feature Name"
                      />
                      <Textarea
                        value={feature.description}
                        readOnly={isAccepted}
                        onChange={(e) => {
                          const newFeatures = [...(validationReport.core_features || [])];
                          newFeatures[idx].description = e.target.value;
                          const updatedReport = {...validationReport, core_features: newFeatures};
                          setValidationReport(updatedReport);
                          handleValidationEdit(updatedReport);
                        }}
                        className={cn(
                          "text-[11px] text-white/40 bg-transparent border-none p-0 focus-visible:ring-0 resize-none min-h-[40px] leading-relaxed",
                          isAccepted && "cursor-default"
                        )}
                        placeholder="Describe the feature purpose..."
                      />
                    </div>
                    {!isAccepted && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-full"
                        onClick={() => {
                          const newFeatures = (validationReport.core_features || []).filter((_, i) => i !== idx);
                          const updatedReport = {...validationReport, core_features: newFeatures};
                          setValidationReport(updatedReport);
                          handleValidationEdit(updatedReport);
                        }}
                      >
                        <XCircle size={16} />
                      </Button>
                    )}
                  </div>
                ))}
                
                {validationReport.core_features?.length === 0 && (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-40">
                    <CheckSquare size={48} weight="thin" />
                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-white">No features defined</p>
                    <Button 
                      variant="link" 
                      onClick={() => {
                        const newFeatures = [{ name: 'New Feature', description: 'Description', type: 'Core' }];
                        const updatedReport = {...validationReport, core_features: newFeatures};
                        setValidationReport(updatedReport);
                        handleValidationEdit(updatedReport);
                      }}
                      className="text-primary text-[10px] mt-2"
                    >
                      Add your first feature
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TECH STACK TAB */}
          {validationTab === 'techstack' && validationReport.tech_stack && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stack size={18} className="text-green-400" weight="duotone" />
                  <h3 className="text-base font-bold text-white/90">Technology Stack</h3>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-[#080808] border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <Circuitry size={14} className="text-white/40" weight="duotone" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Architecture Overview</span>
                  </div>

                  <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 py-4">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="relative group">
                        <div className="absolute -inset-3 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10 group-hover:scale-110 transition-transform">
                          <Layout size={32} weight="duotone" className="text-purple-400" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-black uppercase tracking-wider text-white/80">Frontend</div>
                        <div className="text-[9px] text-white/30 mt-0.5">Client Side</div>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5 max-w-[160px]">
                        {(validationReport.tech_stack.frontend || []).slice(0, 3).map((tech: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                            {tech}
                          </span>
                        ))}
                        {(validationReport.tech_stack.frontend || []).length > 3 && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-500/10 text-purple-400/60">
                            +{(validationReport.tech_stack.frontend || []).length - 3}
                          </span>
                        )}
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="hidden lg:flex items-center"
                    >
                      <div className="flex items-center gap-1">
                        <div className="h-px w-8 bg-gradient-to-r from-purple-500/50 to-transparent" />
                        <ArrowRight size={16} className="text-white/20" />
                        <div className="h-px w-8 bg-gradient-to-l from-orange-500/50 to-transparent" />
                      </div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="lg:hidden flex items-center"
                    >
                      <div className="w-px h-6 bg-gradient-to-b from-purple-500/50 to-transparent" />
                      <ArrowRight size={16} className="text-white/20 rotate-90 -ml-1.5" />
                      <div className="w-px h-6 bg-gradient-to-t from-orange-500/50 to-transparent" />
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="relative group">
                        <div className="absolute -inset-3 bg-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-500/10 group-hover:scale-110 transition-transform">
                          <Circuitry size={32} weight="duotone" className="text-orange-400" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-black uppercase tracking-wider text-white/80">Backend</div>
                        <div className="text-[9px] text-white/30 mt-0.5">Server Logic</div>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5 max-w-[160px]">
                        {(validationReport.tech_stack.backend || []).slice(0, 3).map((tech: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/20">
                            {tech}
                          </span>
                        ))}
                        {(validationReport.tech_stack.backend || []).length > 3 && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/10 text-orange-400/60">
                            +{(validationReport.tech_stack.backend || []).length - 3}
                          </span>
                        )}
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="hidden lg:flex items-center"
                    >
                      <div className="flex items-center gap-1">
                        <div className="h-px w-8 bg-gradient-to-r from-orange-500/50 to-transparent" />
                        <ArrowRight size={16} className="text-white/20" />
                        <div className="h-px w-8 bg-gradient-to-l from-cyan-500/50 to-transparent" />
                      </div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="lg:hidden flex items-center"
                    >
                      <div className="w-px h-6 bg-gradient-to-b from-orange-500/50 to-transparent" />
                      <ArrowRight size={16} className="text-white/20 rotate-90 -ml-1.5" />
                      <div className="w-px h-6 bg-gradient-to-t from-cyan-500/50 to-transparent" />
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="relative group">
                        <div className="absolute -inset-3 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:scale-110 transition-transform">
                          <Database size={32} weight="duotone" className="text-cyan-400" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-black uppercase tracking-wider text-white/80">Database</div>
                        <div className="text-[9px] text-white/30 mt-0.5">Storage & Cache</div>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5 max-w-[160px]">
                        {(validationReport.tech_stack.database || []).slice(0, 3).map((tech: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                            {tech}
                          </span>
                        ))}
                        {(validationReport.tech_stack.database || []).length > 3 && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-cyan-500/10 text-cyan-400/60">
                            +{(validationReport.tech_stack.database || []).length - 3}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 pt-6 border-t border-white/5"
                  >
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <div className="flex items-center gap-2 px-4">
                        <Rocket size={12} className="text-green-400/60" weight="duotone" />
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">Infrastructure Layer</span>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {(validationReport.tech_stack.infrastructure || []).map((tech: string, i: number) => (
                        <motion.span 
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.7 + i * 0.05 }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                        >
                          {tech}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'frontend', label: 'Frontend', icon: Layout, color: 'purple', sub: 'Client Side' },
                { id: 'backend', label: 'Backend', icon: Circuitry, color: 'orange', sub: 'Server Logic' },
                { id: 'database', label: 'Database', icon: Database, color: 'cyan', sub: 'Storage & Cache' },
                { id: 'infrastructure', label: 'Infrastructure', icon: Rocket, color: 'green', sub: 'Cloud & DevOps' }
              ].map((cat) => {
                const techList = validationReport.tech_stack[cat.id as keyof typeof validationReport.tech_stack] || [];
                const isEditing = editingTech === cat.id;
                const isRegenerating = isRegeneratingTech === cat.id;

                return (
                  <motion.div 
                    layout
                    key={cat.id} 
                    className={cn(
                      "p-6 rounded-[2rem] bg-[#0A0A0A] border transition-all duration-300 relative overflow-hidden group shadow-[0_15px_35px_rgba(0,0,0,0.6)]",
                      cat.color === 'purple' ? "hover:border-purple-500/30" :
                      cat.color === 'orange' ? "hover:border-orange-500/30" :
                      cat.color === 'cyan' ? "hover:border-cyan-500/30" :
                      "hover:border-green-500/30",
                      isEditing ? "border-primary/40 ring-1 ring-primary/20" : "border-white/10"
                    )}
                  >
                    {/* Background Accent Glow */}
                    <div className={cn(
                        "absolute -right-20 -top-20 h-48 w-48 blur-[80px] opacity-10 rounded-full transition-opacity group-hover:opacity-20",
                        cat.color === 'purple' ? "bg-purple-500" :
                        cat.color === 'orange' ? "bg-orange-500" :
                        cat.color === 'cyan' ? "bg-cyan-500" :
                        "bg-green-500"
                    )} />

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-br transition-all duration-300 group-hover:scale-110 shadow-lg",
                          cat.color === 'purple' ? "from-purple-500/20 to-purple-500/5 text-purple-400 border border-purple-500/20 shadow-purple-500/10" :
                          cat.color === 'orange' ? "from-orange-500/20 to-orange-500/5 text-orange-400 border border-orange-500/20 shadow-orange-500/10" :
                          cat.color === 'cyan' ? "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border border-cyan-500/20 shadow-cyan-500/10" :
                          "from-green-500/20 to-green-500/5 text-green-400 border border-green-500/20 shadow-green-500/10"
                        )}>
                          <cat.icon size={22} weight="duotone" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white/90">{cat.label}</h4>
                          <p className="text-[10px] font-bold text-white/20 tracking-widest">{cat.sub}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {isEditing ? (
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-white/40"
                                onClick={() => {
                                    setEditingTech(null);
                                    setTechFeedback(prev => ({ ...prev, [cat.id]: '' }));
                                }}
                            >
                                <X size={14} />
                            </Button>
                        ) : (
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-9 w-9 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all group/btn"
                                            onClick={() => setEditingTech(cat.id)}
                                        >
                                            <MagicWand size={18} weight="duotone" className="group-hover/btn:scale-110 transition-transform" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-900 border-white/10 text-[9px] font-black uppercase tracking-widest">
                                        Refine with AI
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                      </div>
                    </div>

                    {/* Content Area */}
                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        <motion.div 
                          key="editing"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="space-y-4 relative z-10"
                        >
                          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] mb-2 block">Direct Edit (Commas)</label>
                            <Textarea 
                              value={techList.join(', ')}
                              onChange={(e) => {
                                const updatedReport = {
                                  ...validationReport,
                                  tech_stack: {
                                    ...validationReport.tech_stack,
                                    [cat.id]: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                                  }
                                };
                                setValidationReport(updatedReport);
                                handleValidationEdit(updatedReport);
                              }}
                              className="min-h-[80px] bg-transparent border-none p-0 focus-visible:ring-0 text-white/90 text-sm font-medium leading-relaxed resize-none"
                              placeholder={`e.g. ${cat.id === 'frontend' ? 'React, Next.js, Tailwind' : 'Node.js, Express, PostgreSQL'}`}
                            />
                          </div>

                          <div className="space-y-3 pt-2">
                             <div className="flex items-center gap-2">
                                <MagicWand size={14} className="text-primary/60" weight="duotone" />
                                <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">AI Refinement Feedback</span>
                             </div>
                             <Input 
                                value={techFeedback[cat.id] || ''}
                                onChange={(e) => setTechFeedback(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                placeholder="Add specific requirements for the AI..."
                                className="h-10 bg-white/5 border-white/5 text-[11px] rounded-xl focus:ring-primary/20 focus:border-primary/30"
                             />
                             <Button 
                                onClick={() => handleRegenerateTech(cat.id)}
                                disabled={isRegenerating}
                                className="w-full bg-primary hover:bg-primary/90 text-black h-10 rounded-xl font-black text-[10px] uppercase tracking-[0.1em] shadow-lg shadow-primary/10"
                             >
                                {isRegenerating ? <ArrowClockwise className="animate-spin mr-2" size={14} /> : <MagicWand className="mr-2" size={14} weight="fill" />}
                                {isRegenerating ? 'Generating stack...' : 'Regenerate Stack'}
                             </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="viewing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-wrap gap-2 relative z-10"
                          onClick={() => setEditingTech(cat.id)}
                        >
                          {techList.length > 0 ? techList.map((tech: string, i: number) => (
                            <motion.div 
                              key={i}
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer hover:scale-105 active:scale-95",
                                cat.color === 'purple' ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20" :
                                cat.color === 'orange' ? "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20" :
                                cat.color === 'cyan' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20" :
                                "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                              )}
                            >
                              {tech}
                            </motion.div>
                          )) : (
                            <div className="w-full py-8 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity">
                                <Plus size={24} />
                                <span className="text-[10px] font-black uppercase tracking-widest mt-2">Click to define stack</span>
                            </div>
                          )}
                          <div className="w-full mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Click card to edit manually</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
                })}
              </div>
            </div>
          )}

          {/* PRICING TAB */}
          {validationTab === 'pricing' && validationReport.pricing_model && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/30">Model Type</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[9px] text-primary/60 hover:text-primary"
                    onClick={() => {
                      if (!validationReport) return;
                      const modelType = validationReport.pricing_model?.type || 'Subscription';
                      const defaultTiers = DEFAULT_PRICING_TIERS[modelType] || [];
                      const updatedReport = {
                        ...validationReport,
                        pricing_model: {
                          ...validationReport.pricing_model,
                          type: modelType,
                          tiers: defaultTiers
                        }
                      };
                      setValidationReport(updatedReport);
                      handleValidationEdit(updatedReport);
                      toast.success('AI suggested pricing tiers applied');
                    }}
                  >
                    <MagicWand size={12} className="mr-1" /> AI Suggest Tiers
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { name: 'One-Time Purchase', icon: CreditCard, desc: 'Users pay once to unlock the app forever. Simple, no recurring revenue.' },
                    { name: 'Subscription', icon: TrendUp, desc: 'Users pay weekly/monthly/yearly. Generates predictable revenue.' },
                    { name: 'Freemium', icon: Rocket, desc: 'Core app is free, premium features cost money. Great for growth.' },
                    { name: 'Pay-Per-Use / Credits', icon: Coins, desc: 'Users buy credits and spend them per action.' },
                    { name: 'Pay-Per-User', icon: ShieldCheck, desc: 'Per-user per-month pricing. Ideal for B2B/SaaS.' },
                    { name: 'In-App Purchases', icon: Stack, desc: 'Digital goods & features sold inside the app.' }
                  ].map((model) => {
                    const Icon = model.icon;
                    const isSelected = validationReport.pricing_model?.type === model.name;
                    const isRecommended = validationReport.pricing_model?.recommended_type === model.name;
                    return (
                      <button
                        key={model.name}
                        className={cn(
                          "relative flex flex-col items-start gap-2 p-4 rounded-[1.5rem] border transition-all group overflow-hidden text-left",
                          isSelected 
                            ? "bg-primary/10 border-primary/40 text-white shadow-lg shadow-primary/10" 
                            : isRecommended 
                              ? "bg-emerald-500/5 border-emerald-500/30 text-white/80 hover:bg-emerald-500/10 hover:border-emerald-500/40" 
                              : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05] hover:border-white/20"
                        )}
                        onClick={() => {
                          if (!validationReport) return;
                          
                          const newModel = model.name;
                          const currentTiers = [...(validationReport.pricing_model?.tiers || [])];
                          
                          const tierMappings: Record<string, string[]> = {
                            'One-Time Purchase': ['Basic', 'Pro', 'Lifetime'],
                            'Subscription': ['Starter', 'Growth', 'Business'],
                            'Freemium': ['Free', 'Plus', 'Pro'],
                            'Pay-Per-Use / Credits': ['Starter Pack', 'Standard Pack', 'Enterprise Pack'],
                            'Pay-Per-User': ['Team', 'Business', 'Enterprise'],
                            'In-App Purchases': ['Remove Ads', 'Theme Pack', 'Pro Bundle']
                          };

                          const newTiers = currentTiers.map((tier, idx) => {
                            const newName = tierMappings[newModel]?.[idx] || tier.name;
                            let newPrice = tier.price;
                            let newAnnual = tier.annual_price;

                            if (newModel === 'One-Time Purchase') {
                              newPrice = newPrice.replace(/\s*\/\s*(month|mo|year|yr|user)/gi, '').trim();
                              newAnnual = undefined;
                            } 
                            else if ((newModel === 'Subscription' || newModel === 'Freemium') && newPrice !== '$0' && !newPrice.includes('/')) {
                              newPrice = `${newPrice} / month`;
                            }
                            else if (newModel === 'Pay-Per-User') {
                              if (!newPrice.includes('/ user')) {
                                newPrice = newPrice.replace(/\/\s*(month|mo)/gi, '').trim() + ' / user / month';
                              }
                              newAnnual = undefined;
                            }

                            return { ...tier, name: newName, price: newPrice, annual_price: newAnnual };
                          });

                          const updatedReport = {
                            ...validationReport,
                            pricing_model: {
                              ...validationReport.pricing_model,
                              type: newModel,
                              tiers: newTiers
                            }
                          };
                          setValidationReport(updatedReport);
                          handleValidationEdit(updatedReport);
                        }}
                      >
                        <div className="flex w-full justify-between items-center mb-1">
                          <div className={cn(
                            "h-8 w-8 rounded-xl flex items-center justify-center transition-all",
                            isSelected ? "bg-primary/20" : isRecommended ? "bg-emerald-500/20" : "bg-white/5 group-hover:bg-white/10"
                          )}>
                            <Icon size={18} weight={isSelected ? "fill" : "regular"} className={cn(
                              isSelected ? "text-primary" : isRecommended ? "text-emerald-400" : ""
                            )} />
                          </div>
                          {isRecommended && (
                            <Badge className="text-[7px] h-4 bg-emerald-500/20 text-emerald-400 border-none uppercase font-black tracking-widest">Recommended</Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-black uppercase tracking-wider">{model.name}</span>
                          <p className="text-[10px] text-white/30 font-medium leading-relaxed">{model.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {validationReport.pricing_model?.reasoning && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex gap-3 items-start"
                  >
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <MagicWand size={16} className="text-emerald-400" weight="duotone" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80 mb-1">
                        AI Recommendation Reasoning
                      </div>
                      <p className="text-[11px] text-emerald-100/70 leading-relaxed">
                        {validationReport.pricing_model.reasoning}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(validationReport.pricing_model.tiers || []).map((tier: any, i: number) => (
                  <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 group relative flex flex-col hover:border-white/20 transition-all">
                    <div className="flex justify-between items-center mb-4 gap-2">
                      <Input
                        value={tier.name}
                        onChange={(e) => {
                          const newTiers = [...(validationReport.pricing_model.tiers || [])];
                          newTiers[i].name = e.target.value;
                          const updatedReport = {
                            ...validationReport,
                            pricing_model: { ...validationReport.pricing_model, tiers: newTiers }
                          };
                          setValidationReport(updatedReport);
                          handleValidationEdit(updatedReport);
                        }}
                        className="h-7 text-xs font-black uppercase tracking-wider bg-transparent border-none p-0 focus-visible:ring-0 text-white/40"
                      />
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <Input
                            value={tier.price}
                            onChange={(e) => {
                              const newTiers = [...(validationReport.pricing_model.tiers || [])];
                              newTiers[i].price = e.target.value;
                              const updatedReport = {
                                ...validationReport,
                                pricing_model: { ...validationReport.pricing_model, tiers: newTiers }
                              };
                              setValidationReport(updatedReport);
                              handleValidationEdit(updatedReport);
                            }}
                            className={cn(
                              "h-7 text-xl font-bold text-right bg-transparent border-none p-0 focus-visible:ring-0 text-white",
                              tier.price === '$0' ? 'text-lg' : ''
                            )}
                          />
                        </div>
                        {/* Subscription & Freemium: Show annual price */}
                        {['Subscription', 'Freemium'].includes(validationReport.pricing_model.type) && tier.price !== '$0' && (
                          <Input
                            value={tier.annual_price || ''}
                            onChange={(e) => {
                              const newTiers = [...(validationReport.pricing_model.tiers || [])];
                              newTiers[i].annual_price = e.target.value;
                              const updatedReport = {
                                ...validationReport,
                                pricing_model: { ...validationReport.pricing_model, tiers: newTiers }
                              };
                              setValidationReport(updatedReport);
                              handleValidationEdit(updatedReport);
                            }}
                            className="h-4 w-24 text-[9px] text-right font-black tracking-widest bg-transparent border-none p-0 focus-visible:ring-0 text-emerald-400/60"
                            placeholder="ANNUAL PRICE"
                          />
                        )}
                        {/* Pay-Per-User: Show per user indicator */}
                        {validationReport.pricing_model.type === 'Pay-Per-User' && (
                          <span className="text-[8px] font-bold tracking-widest text-white/30">PER USER / MONTH</span>
                        )}
                        {/* Pay-Per-Use / Credits: Show credits indicator */}
                        {validationReport.pricing_model.type === 'Pay-Per-Use / Credits' && (
                          <span className="text-[8px] font-bold tracking-widest text-white/30">CREDITS PACK</span>
                        )}
                        {/* One-Time Purchase: Show one-time indicator */}
                        {validationReport.pricing_model.type === 'One-Time Purchase' && (
                          <span className="text-[8px] font-bold tracking-widest text-white/30">ONE-TIME</span>
                        )}
                        {/* In-App Purchases: Show purchase type */}
                        {validationReport.pricing_model.type === 'In-App Purchases' && (
                          <span className="text-[8px] font-bold tracking-widest text-white/30">
                            {(tier.price || '').includes('/ month') ? 'RECURRING' : 'ONE-TIME'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 flex-1">
                      {(tier.features || []).map((feat: string, j: number) => (
                        <div key={j} className="flex items-center gap-2 group/feat">
                          <CheckCircle size={14} className="text-emerald-500 shrink-0" weight="fill" />
                          <Input
                            value={feat}
                            onChange={(e) => {
                              const newTiers = [...(validationReport.pricing_model.tiers || [])];
                              newTiers[i].features[j] = e.target.value;
                              const updatedReport = {
                                ...validationReport,
                                pricing_model: { ...validationReport.pricing_model, tiers: newTiers }
                              };
                              setValidationReport(updatedReport);
                              handleValidationEdit(updatedReport);
                            }}
                            className="h-5 text-xs bg-transparent border-none p-0 focus-visible:ring-0 text-white/60"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover/feat:opacity-100 text-white/20 hover:text-red-400"
                            onClick={() => {
                              const newTiers = [...(validationReport.pricing_model.tiers || [])];
                              newTiers[i].features = newTiers[i].features.filter((_: any, idx: number) => idx !== j);
                              const updatedReport = {
                                ...validationReport,
                                pricing_model: { ...validationReport.pricing_model, tiers: newTiers }
                              };
                              setValidationReport(updatedReport);
                              handleValidationEdit(updatedReport);
                            }}
                          >
                            <X size={10} />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] w-full border-dashed border border-white/5 mt-2 text-white/30 hover:text-white/60"
                        onClick={() => {
                          const newTiers = [...(validationReport.pricing_model.tiers || [])];
                          newTiers[i].features = [...newTiers[i].features, 'New Perk'];
                          const updatedReport = {
                            ...validationReport,
                            pricing_model: { ...validationReport.pricing_model, tiers: newTiers }
                          };
                          setValidationReport(updatedReport);
                          handleValidationEdit(updatedReport);
                        }}
                      >
                        <Plus size={10} className="mr-1" /> Add Perk
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 absolute -right-2 -top-2 bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 rounded-full hover:bg-red-500/20"
                      onClick={() => {
                        const newTiers = (validationReport.pricing_model.tiers || []).filter((_: any, idx: number) => idx !== i);
                        const updatedReport = {
                          ...validationReport,
                          pricing_model: { ...validationReport.pricing_model, tiers: newTiers }
                        };
                        setValidationReport(updatedReport);
                        handleValidationEdit(updatedReport);
                      }}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-8 border-dashed border border-white/10 text-[10px] uppercase font-black tracking-[0.2em] text-white/20 hover:text-white/40 hover:bg-white/[0.02] rounded-2xl"
                  onClick={() => {
                    const modelType = validationReport.pricing_model?.type || 'Subscription';
                    let newTier = { name: 'NEW TIER', price: '$0', features: [] };
                    
                    if (modelType === 'One-Time Purchase') {
                      newTier = { name: 'New Plan', price: '$99', features: ['Feature 1', 'Feature 2'] };
                    } else if (modelType === 'Subscription') {
                      newTier = { name: 'New Plan', price: '$29 / month', annual_price: '$279 / year', features: ['Feature 1', 'Feature 2'] };
                    } else if (modelType === 'Freemium') {
                      newTier = { name: 'New Plan', price: '$19 / month', annual_price: '$179 / year', features: ['Feature 1', 'Feature 2'] };
                    } else if (modelType === 'Pay-Per-Use / Credits') {
                      newTier = { name: 'New Pack', price: '$25 / 5k credits', features: ['5,000 credits', 'No expiry'] };
                    } else if (modelType === 'Pay-Per-User') {
                      newTier = { name: 'New Plan', price: '$10 / user / month', features: ['Per user billing', 'All features'] };
                    } else if (modelType === 'In-App Purchases') {
                      newTier = { name: 'New Item', price: '$4.99 one-time', features: ['Feature unlock'] };
                    }
                    
                    const newTiers = [...(validationReport.pricing_model.tiers || []), newTier];
                    const updatedReport = {
                      ...validationReport,
                      pricing_model: { ...(validationReport.pricing_model || { type: 'Subscription' }), tiers: newTiers }
                    };
                    setValidationReport(updatedReport);
                    handleValidationEdit(updatedReport);
                  }}
                >
                  <Plus className="mr-2" size={14} weight="bold" /> Add Tier
                </Button>
              </div>
            </div>
          )}

          {/* IMPROVEMENTS TAB */}
          {validationTab === 'improvements' && (
            <div className="space-y-3">
              {validationReport.improvements && validationReport.improvements.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-white/40">Select improvements to apply and re-validate</p>
                    {selectedImprovementIndices.length > 0 && (
                      <Button 
                        size="sm"
                        onClick={async () => {
                          if (!ideaId) return;
                          const count = selectedImprovementIndices.length;
                          setRevalidating(true);
                          try {
                            const res = await aiService.acceptImprovementsAndRevalidate(ideaId, selectedImprovementIndices);
                            setValidationReport(res.data);
                            setSelectedImprovementIndices([]);
                            setImprovementStatus({});
                            setValidationTab('overview');
                            toast.success(`Applied ${count} improvements and re-validated`);
                          } catch (error: any) {
                            const errorMsg = error.response?.data?.detail || "Failed to apply improvements";
                            toast.error(errorMsg);
                          } finally {
                            setRevalidating(false);
                          }
                        }}
                        disabled={revalidating}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      >
                        {revalidating ? <ArrowClockwise className="animate-spin mr-2 h-3 w-3" /> : <CheckCircle className="mr-2 h-3 w-3" />}
                        Apply & Validate
                      </Button>
                    )}
                  </div>
                  {validationReport.improvements.map((improvement, idx) => {
                const status = improvementStatus[idx] || 'pending';
                const isSelected = selectedImprovementIndices.includes(idx);
                
                return (
                  <div key={idx} className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                    status === 'accepted' ? "bg-emerald-500/10 border-emerald-500/30" :
                    status === 'declined' ? "bg-white/5 border-white/5 opacity-40" :
                    isSelected ? "bg-yellow-500/10 border-yellow-500/40" : "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                  onClick={() => {
                    if (status !== 'pending') return;
                    if (isSelected) {
                      setSelectedImprovementIndices(selectedImprovementIndices.filter(i => i !== idx));
                    } else {
                      setSelectedImprovementIndices([...selectedImprovementIndices, idx]);
                    }
                  }}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5",
                      isSelected ? "bg-yellow-500 border-yellow-500" : "border-white/20"
                    )}>
                      {isSelected && <CheckCircle size={14} className="text-black" weight="fill" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white/80">{improvement}</div>
                    </div>
                    {status === 'accepted' && <CheckCircle size={18} className="text-emerald-400 shrink-0" weight="fill" />}
                    {status === 'declined' && <XCircle size={18} className="text-white/20 shrink-0" />}
                  </div>
                );
              })}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                    <CheckCircle size={32} className="text-emerald-400" weight="fill" />
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">All Improvements Applied</h3>
                  <p className="text-sm text-white/40 max-w-sm">
                    You've applied all suggested improvements. The 6 core pillars have been re-validated with these enhancements.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isAccepted && (
            <div className="flex justify-end pt-4">
               <Button onClick={handleGenerateBlueprint} className="w-full sm:w-auto bg-white text-black hover:bg-white/90 font-bold h-11 px-6 shadow-lg">
                  Accept Analysis <ArrowRight className="ml-2" weight="bold" />
               </Button>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-full bg-[#090909]">
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
                            className="bg-black/20 text-sm sm:text-base min-h-[120px]"
                            placeholder="Your answer..."
                         />
                         <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                            <Button variant="ghost" size="sm" onClick={handleSuggestAnswer} disabled={loading} className="w-full sm:w-auto order-2 sm:order-1">Suggest Answer</Button>
                            <Button onClick={() => handleAnswerQuestion(aiSuggestion || '')} disabled={!aiSuggestion} className="w-full sm:w-auto order-1 sm:order-2">Next</Button>
                         </div>
                      </CardContent>
                   </Card>
                ) : (
                   <Card className="border-white/5 bg-white/5">
                      <CardHeader className="p-4 sm:p-6">
                         <CardTitle className="text-lg sm:text-xl">Describe your Idea</CardTitle>
                         <CardDescription className="text-xs sm:text-sm">Start by describing what you want to build.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                         <Textarea 
                            value={rawInput} 
                            onChange={e => setRawInput(e.target.value)} 
                            className="min-h-[150px] sm:min-h-[200px] bg-black/20 text-base sm:text-lg"
                            placeholder="E.g., A marketplace for vintage watches..."
                         />
                      </CardContent>
                      <CardFooter className="p-4 sm:p-6">
                         <Button onClick={handleSubmitIdea} disabled={loading || !rawInput.trim()} className="w-full bg-primary font-bold h-10 sm:h-12">
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
            <div className="space-y-6 animate-in fade-in duration-700 pt-4 sm:pt-0">
               <div className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                 <div className="flex items-center gap-3 sm:gap-4">
                   <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0">
                     <Layout size={18} weight="bold" className="sm:hidden" />
                     <Layout size={20} weight="bold" className="hidden sm:block" />
                   </div>
                   <div>
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white/90">Visual Blueprint</h2>
                      <p className="text-[10px] sm:text-xs text-white/40 font-medium">Interactive architecture map</p>
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
                                <ArrowClockwise className={cn(loading && "animate-spin")} size={14} />
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden sm:inline">Regenerate</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-zinc-900 border-white/10 text-[10px] font-bold uppercase tracking-widest">
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
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
                 {blueprint.kanban_features.slice(0, 4).map((f, i) => (
                    <div key={i} className="p-3 sm:p-4 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between gap-2">
                       <div className="text-[11px] sm:text-xs font-bold text-white/60 line-clamp-2">{f.title}</div>
                       <Badge variant="secondary" className="text-[8px] sm:text-[9px] w-fit">{f.status}</Badge>
                    </div>
                 ))}
               </div>
            </div>
          )}

          {/* 4. Documentation Section (Bottom) */}
          {(validationReport || blueprint) && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 pt-8 sm:pt-12 border-t border-white/5">
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3 sm:gap-4">
                     <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0">
                       <FileText size={18} weight="bold" className="sm:hidden" />
                       <FileText size={20} weight="bold" className="hidden sm:block" />
                     </div>
                     <div>
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white/90">Documentation</h2>
                        <p className="text-[10px] sm:text-xs text-white/40 font-medium">Technical specifications and guides</p>
                     </div>
                   </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {Object.entries(DOC_INFO).map(([id, info]) => {
                     const isGenerated = docs.find(d => d.asset_type === id);
                     return (
                        <Card 
                          key={id} 
                          className={cn(
                            "cursor-pointer hover:border-white/20 transition-all group overflow-hidden flex flex-col",
                            isGenerated ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5 border-white/5"
                          )}
                          onClick={(e) => {
                              if ((e.target as HTMLElement).closest('.action-btn')) return;
                              if (isGenerated) handleDownloadDoc(id);
                              else handleGenerateDocFlow(id);
                          }}
                        >
                           <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                              <div className="flex justify-between items-start">
                                 <info.icon className={isGenerated ? "text-emerald-400" : "text-white/40"} size={24} />
                                 {isGenerated && <CheckCircle className="text-emerald-400" weight="fill" />}
                              </div>
                              <CardTitle className="text-sm sm:text-base mt-2 sm:mt-3">{info.label}</CardTitle>
                           </CardHeader>
                           <CardContent className="flex-1 p-4 pt-0 sm:p-6 sm:pt-0">
                              <p className="text-[11px] sm:text-xs text-white/40 line-clamp-2 sm:line-clamp-none sm:min-h-[40px]">{info.summary}</p>
                           </CardContent>
                           <CardFooter className="p-4 pt-0 sm:p-6 sm:pt-0 flex gap-2">
                              {!isGenerated ? (
                                <>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="action-btn h-7 text-[9px] sm:text-[10px] w-full border-white/10 hover:bg-white/5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUploadClick(id);
                                        }}
                                    >
                                        <UploadSimple className="mr-1" /> Upload
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        className="action-btn h-7 text-[9px] sm:text-[10px] w-full bg-white/10 hover:bg-white/20 text-white"
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
                                    className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform"
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
          className="!max-w-none bg-[#0A0A0A] border-white/10 w-[98vw] md:w-[95vw] h-[98vh] md:h-[90vh] p-0 overflow-hidden flex flex-col" 
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
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/80 hover:bg-black text-white/60 hover:text-white z-[60]"
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
                "w-full md:w-[350px] lg:w-[400px] border-t md:border-t-0 md:border-l border-white/10 bg-[#050505] p-4 md:p-6 overflow-y-auto flex-shrink-0 transition-all duration-300",
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
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-white truncate">{selectedNode.label}</h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{selectedNode.type}</p>
                      </div>
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden h-8 w-8 text-white/20"
                        onClick={() => setSelectedNode(null)}
                    >
                        <XCircle size={20} />
                    </Button>
                  </div>

                  {/* Completion */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] sm:text-xs font-bold text-white/40">
                      <span>COMPLETION</span>
                      <span>{(nodeDetails?.completion ?? selectedNode.completion) || 0}%</span>
                    </div>
                    <div className="h-1.5 sm:h-2 w-full bg-white/5 rounded-full overflow-hidden">
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
                      <p className="text-[9px] sm:text-[10px] text-white/30 text-right font-medium">
                        {nodeDetails.stats.done_issues} / {nodeDetails.stats.total_issues} issues completed
                      </p>
                    )}
                  </div>

                  {/* Issues Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/40">Linked Issues</h4>
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
                          <div className="p-2 sm:p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                            <Input 
                              placeholder="Search project issues..."
                              value={issueSearchQuery}
                              onChange={(e) => setIssueSearchQuery(e.target.value)}
                              className="h-8 text-xs bg-black/40 border-white/5"
                            />
                            <div className="max-h-[150px] sm:max-h-[200px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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
                                      <span className="text-[9px] font-mono text-white/40">{issue.identifier}</span>
                                      <span className="text-[11px] text-white/70 truncate">{issue.title}</span>
                                    </div>
                                    <Plus size={12} className="text-white/20 group-hover:text-primary transition-colors shrink-0" />
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
                          <div key={issue.id} className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[9px] font-mono text-white/30">{issue.identifier}</span>
                                <Badge variant="outline" className={cn(
                                  "text-[7px] h-3.5 px-1 uppercase font-black",
                                  issue.status === 'done' ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                                  issue.status === 'in_progress' ? "text-blue-400 border-blue-500/20 bg-blue-500/5" :
                                  "text-white/30 border-white/5 bg-white/5"
                                )}>
                                  {issue.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <span className="text-[11px] sm:text-xs font-medium text-white/80 truncate">{issue.title}</span>
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
                        <div className="py-6 sm:py-8 text-center space-y-2">
                          <p className="text-[11px] text-white/20">No issues linked to this component.</p>
                          <p className="text-[9px] text-white/10 italic">Generate issues or link existing ones to track progress.</p>
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
                    <p className="text-[10px] text-white/30 mt-2 text-center">
                      AI will create tasks, features, and milestones
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/20">
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
        <DialogContent className="bg-[#0A0A0A] border-white/10 w-[95vw] sm:max-w-[500px] p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
             <DialogTitle className="text-lg sm:text-xl">Clarification Needed</DialogTitle>
             <DialogDescription className="text-xs sm:text-sm">
                Question {docQuestionIndex + 1} of {docQuestions.length} for {DOC_INFO[generatingDocType || '']?.label}
             </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 sm:py-4">
             <p className="text-base sm:text-lg font-medium leading-relaxed">{docQuestions[docQuestionIndex]?.question}</p>
             <Textarea 
                value={docAiSuggestion || ''}
                onChange={e => setDocAiSuggestion(e.target.value)}
                placeholder="Your answer..."
                className="bg-white/5 min-h-[100px] text-sm sm:text-base"
             />
             <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2 sm:pt-4">
                <Button variant="ghost" size="sm" onClick={() => setDocAiSuggestion(docQuestions[docQuestionIndex].suggestion || '')} className="text-[10px] sm:text-xs order-3 sm:order-1 w-full sm:w-auto">
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
    </div>
  );
}