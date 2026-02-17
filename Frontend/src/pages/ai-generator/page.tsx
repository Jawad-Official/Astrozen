import {
  MagicWand,
  PaperPlaneTilt,
  CheckCircle,
  XCircle,
  ArrowRight,
  ChartBar,
  Stack,
  Layout,
  FileText,
  ChatCircleText,
  ArrowClockwise,
  Rocket,
  ArrowsIn,
  ArrowsOut,
  Lightning
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { aiService } from '@/services/ai.service';
import { toast } from 'sonner';
import Mermaid from '@/components/Mermaid';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
}

interface FlowNode {
  id: string;
  label: string;
  type: string;
  subtasks: string[];
  status: string;
}

interface Blueprint {
  user_flow_mermaid: string;
  kanban_features: { title: string; status: string; priority: string }[];
  nodes?: FlowNode[];
}

interface Doc {
  id: string;
  asset_type: string;
  content: string;
}

export default function AIGeneratorPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('INPUT');
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{question: string, answer: string}[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
  
  // Blueprint Expanded & Interaction State
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeSidebarOpen, setIsNodeSidebarOpen] = useState(false);

  const selectedDoc = docs.find(d => d.asset_type === selectedDocType);
  const selectedNode = blueprint?.nodes?.find(n => n.id === selectedNodeId);

  // Handle Initial Submission
  const handleSubmitIdea = async () => {
    if (!rawInput.trim()) return;
    setLoading(true);
    setLoadingMessage('Analyzing your idea...');
    try {
      const res = await aiService.submitIdea(rawInput);
      setIdeaId(res.data.id);
      if (res.data.status === 'CLARIFICATION_NEEDED') {
        setQuestions(res.data.clarification_questions);
        setPhase('CLARIFICATION');
      } else {
        setPhase('VALIDATION');
        handleValidate(res.data.id);
      }
    } catch (error) {
      toast.error("Failed to submit idea");
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle Clarification Answers
  const handleAnswerQuestion = async (answer: string) => {
    const newAnswers = [...answers, { question: questions[currentQuestionIndex], answer }];
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setLoading(true);
      setLoadingMessage('Processing your answers...');
      try {
        await aiService.answerQuestions(ideaId!, newAnswers);
        setPhase('VALIDATION');
        handleValidate(ideaId!);
      } catch (error) {
        toast.error("Failed to save answers");
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    }
  };

  // Handle Validation
  const handleValidate = async (id: string, feedback?: string) => {
    setLoading(true);
    setLoadingMessage(feedback ? 'Regenerating analysis...' : 'Validating your idea...');
    try {
      const res = await aiService.validateIdea(id, feedback);
      setValidationReport(res.data);
      setIsRefining(false);
      setRefineFeedback('');
      if (feedback) toast.success("Analysis regenerated with your feedback");
    } catch (error) {
      toast.error("Validation failed");
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle Blueprint Generation
  const handleGenerateBlueprint = async () => {
    setLoading(true);
    setLoadingMessage('Generating visual blueprint...');
    try {
      // Save any manual edits first
      if (validationReport) {
        await aiService.updateValidationReport(ideaId!, validationReport);
      }
      const res = await aiService.generateBlueprint(ideaId!);
      setBlueprint(res.data);
      setPhase('BLUEPRINT');
    } catch (error) {
      toast.error("Blueprint generation failed");
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle Node Interaction
  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
    setIsNodeSidebarOpen(true);
    setIsCanvasExpanded(true); // Auto-expand canvas if not already
  };

  // Handle Issue Generation
  const handleGenerateIssues = async () => {
    if (!selectedNodeId || !ideaId) return;
    setLoading(true);
    setLoadingMessage(`Generating detailed issues for ${selectedNodeId}...`);
    try {
      await aiService.generateIssuesForNode(ideaId, selectedNodeId);
      toast.success(`Successfully generated and linked issues for ${selectedNodeId}`);
      setIsNodeSidebarOpen(false);
    } catch (error) {
      toast.error("Failed to generate issues");
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle Doc Generation
  const handleGenerateDoc = async (type: string) => {
    setLoading(true);
    setLoadingMessage(`Generating ${type.replace('_', ' ')}...`);
    try {
      const res = await aiService.generateDoc(ideaId!, type);
      setDocs(prev => [...prev, res.data]);
      setSelectedDocType(type);
    } catch (error) {
      toast.error(`Failed to generate ${type}`);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle Doc Chat
  const handleChatDoc = async () => {
    if (!chatMessage.trim() || !selectedDocType) return;
    setLoading(true);
    setLoadingMessage('Updating document...');
    try {
      const res = await aiService.chatDoc(ideaId!, selectedDocType, chatMessage);
      setDocs(prev => prev.map(d => d.asset_type === selectedDocType ? res.data : d));
      setChatMessage('');
      toast.success("Document updated");
    } catch (error) {
      toast.error("Failed to update document");
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <MagicWand size={24} weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Idea Validator</h1>
          <p className="text-muted-foreground">From concept to complete technical documentation in minutes.</p>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-2xl">
              <MagicWand size={48} weight="duotone" className="mx-auto text-primary mb-4 animate-pulse" />
              <TextShimmer className="text-2xl font-bold" duration={1.5}>
                {loadingMessage || 'Generating Magic...'}
              </TextShimmer>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full space-y-8 pb-12">
        
        {/* Phase 1: Input */}
        {phase === 'INPUT' && (
          <Card className="border-white/5 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Describe your project idea</CardTitle>
              <CardDescription>The more detail you provide, the better the initial validation will be.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="What are you building? Who is it for? What problem does it solve?" 
                className="min-h-[200px] bg-black/20 border-white/10"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSubmitIdea} 
                disabled={loading || !rawInput.trim()}
                className="w-full"
              >
                {loading ? <ArrowClockwise className="animate-spin mr-2" /> : <MagicWand className="mr-2" />}
                Generate Initial Validation
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Phase 1: Clarification */}
        {phase === 'CLARIFICATION' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Clarifying your idea</h2>
              <span className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
            
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-lg font-medium mb-6">{questions[currentQuestionIndex]}</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Your answer..." 
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        handleAnswerQuestion(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input.value) {
                      handleAnswerQuestion(input.value);
                      input.value = '';
                    }
                  }}>
                    <PaperPlaneTilt weight="bold" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Phase 2: Validation */}
        {phase === 'VALIDATION' && validationReport && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {validationReport.market_feasibility.pillars.map((pillar: any) => (
                 <Card key={pillar.name} className="border-white/5 bg-white/5">
                   <CardHeader className="pb-2">
                     <div className="flex items-center justify-between">
                       <CardTitle className="text-sm font-medium">{pillar.name}</CardTitle>
                       <Badge variant={pillar.status === 'Strong' ? 'default' : 'secondary'}>{pillar.status}</Badge>
                     </div>
                   </CardHeader>
                   <CardContent>
                     <p className="text-xs text-muted-foreground">{pillar.reason}</p>
                   </CardContent>
                 </Card>
               ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-white/5 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartBar className="text-primary" /> Core Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {validationReport.core_features.map((feature: Feature, i: number) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/5 group relative">
                      <CheckCircle className="text-green-500 mt-1 shrink-0" />
                      <div className="flex-1">
                        <Input 
                          value={feature.name} 
                          onChange={(e) => {
                            const newFeatures = [...validationReport.core_features];
                            newFeatures[i].name = e.target.value;
                            setValidationReport({...validationReport, core_features: newFeatures});
                          }}
                          className="h-7 text-sm font-medium bg-transparent border-none p-0 focus-visible:ring-0 mb-1"
                        />
                        <Textarea 
                          value={feature.description} 
                          onChange={(e) => {
                            const newFeatures = [...validationReport.core_features];
                            newFeatures[i].description = e.target.value;
                            setValidationReport({...validationReport, core_features: newFeatures});
                          }}
                          className="text-xs text-muted-foreground bg-transparent border-none p-0 focus-visible:ring-0 resize-none min-h-[40px]"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2"
                        onClick={() => {
                          const newFeatures = validationReport.core_features.filter((_, idx) => idx !== i);
                          setValidationReport({...validationReport, core_features: newFeatures});
                        }}
                      >
                        <XCircle size={14} className="text-red-400" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-white"
                    onClick={() => {
                      const newFeatures = [...validationReport.core_features, { name: 'New Feature', description: 'Description', type: 'Core' }];
                      setValidationReport({...validationReport, core_features: newFeatures});
                    }}
                  >
                    <Plus className="mr-2" size={12} /> Add Feature
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-white/5 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stack className="text-primary" /> Recommended Stack
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   {Object.entries(validationReport.tech_stack).map(([key, value]) => (
                     <div key={key}>
                       <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{key}</p>
                       <div className="flex flex-wrap gap-2">
                         {value.map((item, i) => (
                           <Badge 
                            key={i} 
                            variant="outline" 
                            className="group relative pr-6"
                           >
                             {item}
                             <button 
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const newStack = {...validationReport.tech_stack};
                                newStack[key as keyof TechStack] = newStack[key as keyof TechStack].filter((_, idx) => idx !== i);
                                setValidationReport({...validationReport, tech_stack: newStack});
                              }}
                             >
                               <X size={10} />
                             </button>
                           </Badge>
                         ))}
                         <Input 
                          placeholder="Add..." 
                          className="h-6 w-20 text-[10px] bg-transparent border-dashed"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value) {
                              const newStack = {...validationReport.tech_stack};
                              newStack[key as keyof TechStack] = [...newStack[key as keyof TechStack], e.currentTarget.value];
                              setValidationReport({...validationReport, tech_stack: newStack});
                              e.currentTarget.value = '';
                            }
                          }}
                         />
                       </div>
                     </div>
                   ))}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4 justify-end">
              {isRefining ? (
                <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2">
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm font-medium">Describe what you want to change or improve:</p>
                    <Textarea 
                      placeholder="e.g. Add a mobile app to the tech stack, or make the pricing model monthly based..." 
                      value={refineFeedback}
                      onChange={(e) => setRefineFeedback(e.target.value)}
                      className="bg-black/20"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setIsRefining(false)}>Cancel</Button>
                      <Button size="sm" onClick={() => handleValidate(ideaId!, refineFeedback)} disabled={!refineFeedback.trim() || loading}>
                        {loading ? <ArrowClockwise className="animate-spin mr-2" /> : <MagicWand className="mr-2" />}
                        Regenerate Section
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex gap-4 justify-end">
                  <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => setIsRefining(true)}>
                    <XCircle className="mr-2" /> Decline & Refine
                  </Button>
                  <Button onClick={handleGenerateBlueprint} className="bg-primary text-primary-foreground">
                    <CheckCircle className="mr-2" /> Accept & Create Blueprint
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 3: Blueprint */}
        {phase === 'BLUEPRINT' && blueprint && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <Card className="border-white/5 bg-white/5 group relative">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="text-primary" /> User Flow Diagram
                    </CardTitle>
                    <CardDescription>Click any box to view details and generate issues.</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-2"
                    onClick={() => setIsCanvasExpanded(true)}
                  >
                    <ArrowsOut size={16} /> Expand Canvas
                  </Button>
                </CardHeader>
                <CardContent className="flex justify-center bg-black/20 p-4 sm:p-6 rounded-lg">
                  <Mermaid 
                    chart={blueprint.user_flow_mermaid} 
                    onNodeClick={handleNodeClick}
                  />
                </CardContent>
             </Card>

             {/* Expanded Canvas Dialog */}
             <Dialog open={isCanvasExpanded} onOpenChange={setIsCanvasExpanded}>
               <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 gap-0 overflow-hidden bg-[#090909] border-white/10">
                 <div className="flex h-full">
                   {/* Main Canvas Area */}
                   <div className="flex-1 flex flex-col relative overflow-hidden">
                     <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 bg-black/40 backdrop-blur-md border border-white/10"
                          onClick={() => setIsCanvasExpanded(false)}
                        >
                          <ArrowsIn size={16} className="mr-2" /> Close Fullscreen
                        </Button>
                     </div>
                     <div className="flex-1 flex items-center justify-center p-12 overflow-auto custom-scrollbar">
                        <div className="min-w-full min-h-full flex items-center justify-center">
                          <Mermaid 
                            chart={blueprint.user_flow_mermaid} 
                            onNodeClick={handleNodeClick}
                          />
                        </div>
                     </div>
                   </div>

                   {/* Node Details Sidebar (Within Dialog) */}
                   <AnimatePresence>
                     {isNodeSidebarOpen && selectedNode && (
                       <motion.aside
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        className="w-[400px] border-l border-white/10 bg-black/40 backdrop-blur-xl flex flex-col"
                       >
                         <div className="p-6 border-b border-white/5 flex items-center justify-between">
                           <div className="space-y-1">
                             <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary/60 border-primary/20">{selectedNode.type}</Badge>
                             <h3 className="text-xl font-bold">{selectedNode.label}</h3>
                           </div>
                           <Button variant="ghost" size="icon" onClick={() => setIsNodeSidebarOpen(false)}>
                             <XCircle size={20} />
                           </Button>
                         </div>
                         
                         <ScrollArea className="flex-1 p-6">
                           <div className="space-y-8">
                             <div className="space-y-4">
                               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Detailed Subtasks</h4>
                               <div className="space-y-3">
                                 {selectedNode.subtasks.map((task, i) => (
                                   <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5 items-start">
                                     <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">{i+1}</div>
                                     <p className="text-sm text-white/80 leading-relaxed">{task}</p>
                                   </div>
                                 ))}
                               </div>
                             </div>

                             <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                               <div className="flex items-center gap-2">
                                 <Lightning className="text-primary" weight="fill" />
                                 <h4 className="text-xs font-bold uppercase tracking-wider">AI Issue Generation</h4>
                               </div>
                               <p className="text-[11px] text-muted-foreground leading-relaxed">
                                 Generate detailed issues, milestones, and missing features automatically for this specific component.
                               </p>
                               <Button 
                                onClick={handleGenerateIssues}
                                disabled={loading}
                                className="w-full h-10 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                               >
                                 {loading ? <ArrowClockwise className="animate-spin" /> : <MagicWand weight="bold" />}
                                 Generate & Link Issues
                               </Button>
                             </div>
                           </div>
                         </ScrollArea>
                       </motion.aside>
                     )}
                   </AnimatePresence>
                 </div>
               </DialogContent>
             </Dialog>

             <Card className="border-white/5 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="text-primary" /> Roadmap Initialization
                  </CardTitle>
                  <CardDescription>Features mapped to initial development tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Todo', 'In Progress', 'Done'].map(col => (
                      <div key={col} className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2">{col}</h3>
                        {blueprint.kanban_features.filter((f: any) => f.status === col || (col === 'Todo' && (!f.status || f.status === 'pending'))).map((f: any, i: number) => (
                           <div key={i} className="p-3 rounded-md bg-white/5 border border-white/10 text-sm">
                             {f.title}
                           </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
             </Card>

             <div className="flex justify-end gap-4">
               <Button variant="outline" onClick={() => navigate('/all-issues')}>
                 Go to My Workspace
               </Button>
               <Button onClick={() => setPhase('DOCUMENTATION')} className="bg-primary">
                 Generate Technical Documentation <ArrowRight className="ml-2" />
               </Button>
             </div>
          </div>
        )}

        {/* Phase 4: Documentation */}
        {phase === 'DOCUMENTATION' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="space-y-4">
               {[
                 { id: 'PRD', label: 'Product Requirements' },
                 { id: 'APP_FLOW', label: 'App Flow' },
                 { id: 'TECH_STACK', label: 'Tech Stack' },
                 { id: 'FRONTEND_GUIDELINES', label: 'Frontend Guidelines' },
                 { id: 'BACKEND_SCHEMA', label: 'Backend Schema' },
                 { id: 'IMPLEMENTATION_PLAN', label: 'Implementation Plan' }
               ].map((doc, i) => {
                 const isGenerated = docs.find(d => d.asset_type === doc.id);
                 const isLocked = i > 0 && !docs.find(d => d.asset_type === [
                  'PRD', 'APP_FLOW', 'TECH_STACK', 'FRONTEND_GUIDELINES', 'BACKEND_SCHEMA', 'IMPLEMENTATION_PLAN'
                 ][i-1]);

                 return (
                   <Card 
                    key={doc.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      selectedDocType === doc.id ? "border-primary bg-primary/10" : "border-white/5 bg-white/5",
                      isGenerated && !selectedDocType && "border-green-500/20",
                      isLocked && "opacity-50 grayscale pointer-events-none"
                    )}
                    onClick={() => isGenerated ? setSelectedDocType(doc.id) : handleGenerateDoc(doc.id)}
                   >
                     <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className={cn("p-2 rounded-lg", isGenerated ? "bg-green-500/20 text-green-500" : "bg-white/10 text-muted-foreground")}>
                            <FileText size={20} />
                         </div>
                         <span className="font-medium text-sm">{doc.label}</span>
                       </div>
                       {isGenerated ? <CheckCircle size={20} className="text-green-500" /> : <ArrowRight size={20} />}
                     </CardContent>
                   </Card>
                 );
               })}
             </div>

             <div className="md:col-span-2 space-y-6">
                {/* Active Doc Viewer & Chat */}
                <Card className="min-h-[600px] border-white/5 bg-white/5 flex flex-col">
                   <CardHeader className="border-b border-white/5">
                     <CardTitle className="text-lg">
                       {selectedDocType ? selectedDocType.replace('_', ' ') : 'Document Viewer'}
                     </CardTitle>
                     <CardDescription>
                       {selectedDoc ? 'View and edit this document with AI.' : 'Select a generated document to preview its content...'}
                     </CardDescription>
                   </CardHeader>
                   <ScrollArea className="flex-1 p-6">
                    <div className="prose prose-invert max-w-none prose-sm">
                        {selectedDoc ? (
                          <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                        ) : (
                          <p className="text-muted-foreground italic">Select a generated document to preview its content...</p>
                        )}
                    </div>
                   </ScrollArea>
                   <CardFooter className="border-t border-white/5 pt-4">
                      <div className="flex gap-2 w-full">
                        <Input 
                          placeholder="Ask AI to regenerate or change something..." 
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleChatDoc()}
                          disabled={!selectedDoc || loading}
                        />
                        <Button variant="secondary" onClick={handleChatDoc} disabled={!selectedDoc || loading}>
                          {loading ? <ArrowClockwise className="animate-spin" /> : <ChatCircleText className="mr-2" />}
                          {loading ? '' : 'Send'}
                        </Button>
                      </div>
                   </CardFooter>
                </Card>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

