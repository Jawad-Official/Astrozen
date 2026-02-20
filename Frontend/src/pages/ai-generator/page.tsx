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
  Lightning,
  Plus,
  X,
  Lightbulb,
  CurrencyDollar
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import Mermaid from '@/components/Mermaid';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIssueStore } from '@/store/issueStore';
import { useAIStore, TechStack } from '@/store/aiStore';
import {
  Dialog, DialogContent 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function AIGeneratorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryIdeaId = searchParams.get('idea');

  const { 
    phase, 
    rawInput, 
    setRawInput, 
    questions, 
    currentQuestionIndex, 
    validationReport, 
    updateValidationReport,
    blueprint, 
    docs, 
    isGenerating, 
    generationMessage,
    submitIdea,
    answerQuestion,
    validateIdea,
    generateBlueprint,
    generateDoc,
    chatDoc,
    generateIssues,
    ideaId,
    reset,
    selectedImprovementIndices,
    setSelectedImprovements,
    acceptImprovements
  } = useAIStore();

  // Handle incoming idea from notification or URL
  useEffect(() => {
    if (queryIdeaId && queryIdeaId !== ideaId) {
      // Logic to fetch and load existing idea
      // For now we'll just trigger validation to load the state
      useAIStore.setState({ ideaId: queryIdeaId });
      validateIdea();
    }
  }, [queryIdeaId, validateIdea, ideaId]);

  const [chatMessage, setChatMessage] = useState('');
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
  
  // Blueprint Expanded & Interaction State
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeSidebarOpen, setIsNodeSidebarOpen] = useState(false);

  const { fetchData } = useIssueStore();

  const selectedDoc = docs.find(d => d.asset_type === selectedDocType);
  const selectedNode = blueprint?.nodes?.find(n => n.id === selectedNodeId);

  const handleDownloadDoc = async (docType: string) => {
    if (!ideaId) return;
    try {
      const res = await aiService.downloadDoc(ideaId, docType);
      const filename = `${docType.replace('_', ' ')}.docx`;
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
      toast.error("Download failed");
    }
  };

  // Handle Node Interaction
  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
    setIsNodeSidebarOpen(true);
    setIsCanvasExpanded(true); // Auto-expand canvas if not already
  };

  const handleGenerateIssues = async () => {
    if (selectedNodeId) {
      await generateIssues(selectedNodeId);
      await fetchData(); // Refresh global issue store
      setIsNodeSidebarOpen(false);
    }
  };

  // Debug logging for validation report
  useEffect(() => {
    if (phase === 'VALIDATION' && validationReport) {
      console.log('Rendering Phase 2 with validationReport:', validationReport);
      console.log('validationReport keys:', Object.keys(validationReport));
      console.log('market_feasibility:', validationReport.market_feasibility);
      console.log('improvements:', validationReport.improvements);
      console.log('core_features:', validationReport.core_features);
      console.log('tech_stack:', validationReport.tech_stack);
      console.log('pricing_model:', validationReport.pricing_model);
    }
  }, [phase, validationReport]);

  return (
    <div className="flex flex-col h-full bg-background p-4 sm:p-6 overflow-hidden relative">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <MagicWand size={24} weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Idea Validator</h1>
          <p className="text-muted-foreground">From concept to complete technical documentation in minutes.</p>
        </div>
      </div>

      {/* Non-blocking Progress Indicator */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-4 p-4 pr-6 bg-background/80 backdrop-blur-md border border-primary/20 rounded-2xl shadow-2xl shadow-primary/10 ring-1 ring-white/5"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse" />
              <ArrowClockwise className="animate-spin text-primary relative z-10" size={24} weight="bold" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-primary">AI is working...</p>
              <p className="text-xs text-muted-foreground">{generationMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full space-y-8 pb-24">
        
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
                onClick={submitIdea} 
                disabled={isGenerating || !rawInput.trim()}
                className="w-full"
              >
                {isGenerating ? <ArrowClockwise className="animate-spin mr-2" /> : <MagicWand className="mr-2" />}
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
                        answerQuestion(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input.value) {
                      answerQuestion(input.value);
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

            {/* Validation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ChartBar className="text-primary" /> Market Analysis
                </h2>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  {validationReport.market_feasibility?.analysis || 'No analysis available'}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0 bg-black/20 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feasibility Score</span>
                <span className={cn(
                  "text-3xl font-black",
                  (validationReport.market_feasibility?.score ?? 0) >= 80 ? "text-emerald-400" :
                  (validationReport.market_feasibility?.score ?? 0) >= 60 ? "text-amber-400" : "text-red-400"
                )}>
                  {validationReport.market_feasibility?.score ?? 0}
                  <span className="text-sm text-muted-foreground font-medium">/100</span>
                </span>
              </div>
            </div>

            {/* Market Analysis Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {(validationReport.market_feasibility?.pillars || []).map((pillar: any) => (
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
              {/* Core Features */}
              <Card className="border-white/5 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartBar className="text-primary" /> Core Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(validationReport.core_features || []).map((feature: any, i: number) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/5 group relative transition-all hover:bg-white/[0.08]">
                      <div className="mt-1 bg-primary/20 p-1 rounded-md shrink-0">
                        <CheckCircle className="text-primary" size={16} weight="fill" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={feature.name}
                          placeholder="Feature Name"
                          onChange={(e) => {
                            const newFeatures = [...(validationReport.core_features || [])];
                            newFeatures[i].name = e.target.value;
                            updateValidationReport({...validationReport, core_features: newFeatures});
                          }}
                          className="h-7 text-sm font-bold bg-transparent border-none p-0 focus-visible:ring-0 mb-0 shadow-none"
                        />
                        <Textarea
                          value={feature.description}
                          placeholder="Feature Description"
                          onChange={(e) => {
                            const newFeatures = [...(validationReport.core_features || [])];
                            newFeatures[i].description = e.target.value;
                            updateValidationReport({...validationReport, core_features: newFeatures});
                          }}
                          className="text-xs text-muted-foreground bg-transparent border-none p-0 focus-visible:ring-0 resize-none min-h-[40px] shadow-none leading-relaxed"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => {
                          const newFeatures = (validationReport.core_features || []).filter((_, idx) => idx !== i);
                          updateValidationReport({...validationReport, core_features: newFeatures});
                        }}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-10 border-dashed border-white/10 text-muted-foreground hover:text-white hover:border-white/30 transition-all"
                    onClick={() => {
                      const newFeatures = [...(validationReport.core_features || []), { name: 'New Feature', description: 'Brief description of the feature...', type: 'Core' }];
                      updateValidationReport({...validationReport, core_features: newFeatures});
                    }}
                  >
                    <Plus className="mr-2" size={14} /> Add Project Feature
                  </Button>
                </CardContent>
              </Card>

              {/* Recommended Stack */}
              <Card className="border-white/5 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stack className="text-primary" /> Recommended Stack
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   {Object.entries(validationReport.tech_stack || {}).map(([key, value]) => (
                     <div key={key}>
                       <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{key}</p>
                       <div className="flex flex-wrap gap-2">
                         {(value || []).map((item: any, i: number) => (
                           <Badge
                            key={i}
                            variant="outline"
                            className="group relative pr-6"
                           >
                             {item}
                             <button
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const newStack = {...(validationReport.tech_stack || {})};
                                (newStack[key as keyof TechStack] as string[]) = (newStack[key as keyof TechStack] as string[]).filter((_, idx) => idx !== i);
                                updateValidationReport({...validationReport, tech_stack: newStack});
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
                              const newStack = {...(validationReport.tech_stack || {})};
                              (newStack[key as keyof TechStack] as string[]) = [...(newStack[key as keyof TechStack] as string[]), e.currentTarget.value];
                              updateValidationReport({...validationReport, tech_stack: newStack});
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

            {/* Improvements & Pricing (NEW) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Improvements */}
              <Card className="border-white/5 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="text-primary" /> Improvements
                  </CardTitle>
                  <CardDescription>Select improvements to automatically apply and re-validate.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {(validationReport.improvements || []).map((improvement, i) => (
                      <div key={i} className="flex items-start space-x-3 p-2 rounded hover:bg-white/5 transition-colors">
                        <Checkbox 
                          id={`improvement-${i}`} 
                          checked={selectedImprovementIndices.includes(i)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedImprovements([...selectedImprovementIndices, i]);
                            } else {
                              setSelectedImprovements(selectedImprovementIndices.filter(index => index !== i));
                            }
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`improvement-${i}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {improvement}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedImprovementIndices.length > 0 && (
                    <Button 
                      onClick={() => acceptImprovements(selectedImprovementIndices)}
                      disabled={isGenerating}
                      className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 border"
                      size="sm"
                    >
                      {isGenerating ? <ArrowClockwise className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                      Apply {selectedImprovementIndices.length} Selected Improvement{selectedImprovementIndices.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Pricing Model */}
              <Card className="border-white/5 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CurrencyDollar className="text-primary" /> Pricing Model
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model Type</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          'One-Time Purchase',
                          'Subscription',
                          'Freemium',
                          'Pay-Per-Use / Credits',
                          'Pay-Per-User',
                          'In-App Purchases'
                        ].map((model) => (
                          <Button
                            key={model}
                            variant={validationReport.pricing_model?.type === model ? 'default' : 'outline'}
                            size="sm"
                            className="text-[10px] h-8 relative group"
                            onClick={() => {
                              const newModel = model;
                              const currentTiers = [...(validationReport.pricing_model?.tiers || [])];
                              
                              // Logic to "migrate" tier names if user switches types manually
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

                                // If switching TO one-time, remove /mo indicators
                                if (newModel === 'One-Time Purchase') {
                                  newPrice = newPrice.replace(/\s*\/\s*(month|mo|year|yr|user)/gi, '').trim();
                                  newAnnual = null;
                                } 
                                // If switching TO recurring, ensure / month exists if missing and not $0
                                else if ((newModel === 'Subscription' || newModel === 'Freemium') && newPrice !== '$0' && !newPrice.includes('/')) {
                                  newPrice = `${newPrice} / month`;
                                }
                                // If switching TO Pay-Per-User
                                else if (newModel === 'Pay-Per-User') {
                                  if (!newPrice.includes('/ user')) {
                                    newPrice = newPrice.replace(/\/\s*(month|mo)/gi, '').trim() + ' / user / month';
                                  }
                                  newAnnual = null;
                                }

                                return { ...tier, name: newName, price: newPrice, annual_price: newAnnual };
                              });

                              updateValidationReport({
                                ...validationReport,
                                pricing_model: {
                                  ...(validationReport.pricing_model || { tiers: [] }),
                                  type: newModel,
                                  tiers: newTiers
                                }
                              });
                            }}
                          >
                            {model}
                            {validationReport.pricing_model?.recommended_type === model && (
                              <span className="ml-1 opacity-60 text-[8px] font-bold">(recommended)</span>
                            )}
                          </Button>
                        ))}
                      </div>
                      {validationReport.pricing_model?.reasoning && (
                        <p className="text-[10px] text-primary/60 italic mt-2">
                          AI Suggestion: {validationReport.pricing_model.reasoning}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiers & Features</p>
                      {(validationReport.pricing_model?.tiers || []).map((tier, i) => (
                        <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5 group relative">
                          <div className="flex justify-between items-center mb-3">
                            <Input
                              value={tier.name}
                              onChange={(e) => {
                                const newTiers = [...(validationReport.pricing_model?.tiers || [])];
                                newTiers[i].name = e.target.value;
                                updateValidationReport({
                                  ...validationReport,
                                  pricing_model: { ...validationReport.pricing_model!, tiers: newTiers }
                                });
                              }}
                              className="h-7 w-24 text-xs font-bold bg-transparent border-none p-0 focus-visible:ring-0"
                            />
                            <div className="flex flex-col items-end">
                              <Input
                                value={tier.price}
                                onChange={(e) => {
                                  const newTiers = [...(validationReport.pricing_model?.tiers || [])];
                                  newTiers[i].price = e.target.value;
                                  updateValidationReport({
                                    ...validationReport,
                                    pricing_model: { ...validationReport.pricing_model!, tiers: newTiers }
                                  });
                                }}
                                className="h-7 w-24 text-xs text-right font-medium bg-transparent border-none p-0 focus-visible:ring-0 text-emerald-400"
                                placeholder={
                                  validationReport.pricing_model?.type === 'Pay-Per-User' ? '$X / user / month' :
                                  validationReport.pricing_model?.type === 'Pay-Per-Use / Credits' ? '$X / 1k credits' :
                                  validationReport.pricing_model?.type === 'One-Time Purchase' ? '$X one-time' :
                                  '$X / month'
                                }
                              />
                              {['Subscription', 'Freemium'].includes(validationReport.pricing_model?.type || '') && tier.price !== '$0' && (
                                <Input
                                  value={tier.annual_price || ''}
                                  onChange={(e) => {
                                    const newTiers = [...(validationReport.pricing_model?.tiers || [])];
                                    newTiers[i].annual_price = e.target.value;
                                    updateValidationReport({
                                      ...validationReport,
                                      pricing_model: { ...validationReport.pricing_model!, tiers: newTiers }
                                    });
                                  }}
                                  className="h-5 w-24 text-[10px] text-right font-medium bg-transparent border-none p-0 focus-visible:ring-0 text-primary/60"
                                  placeholder="Annual: $X / year"
                                />
                              )}
                              {validationReport.pricing_model?.type === 'Pay-Per-User' && (
                                <span className="text-[8px] text-white/30 font-medium">PER USER / MONTH</span>
                              )}
                              {validationReport.pricing_model?.type === 'Pay-Per-Use / Credits' && (
                                <span className="text-[8px] text-white/30 font-medium">CREDITS PACK</span>
                              )}
                              {validationReport.pricing_model?.type === 'One-Time Purchase' && (
                                <span className="text-[8px] text-white/30 font-medium">ONE-TIME PAYMENT</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            {(tier.features || []).map((feat, j) => (
                              <div key={j} className="flex items-center gap-2 group/feat">
                                <CheckCircle size={12} className="text-green-500 shrink-0" />
                                <Input
                                  value={feat}
                                  onChange={(e) => {
                                    const newTiers = [...(validationReport.pricing_model?.tiers || [])];
                                    newTiers[i].features[j] = e.target.value;
                                    updateValidationReport({
                                      ...validationReport,
                                      pricing_model: { ...validationReport.pricing_model!, tiers: newTiers }
                                    });
                                  }}
                                  className="h-5 text-[10px] bg-transparent border-none p-0 focus-visible:ring-0 text-white/60"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 opacity-0 group-hover/feat:opacity-100"
                                  onClick={() => {
                                    const newTiers = [...(validationReport.pricing_model?.tiers || [])];
                                    newTiers[i].features = newTiers[i].features.filter((_, idx) => idx !== j);
                                    updateValidationReport({
                                      ...validationReport,
                                      pricing_model: { ...validationReport.pricing_model!, tiers: newTiers }
                                    });
                                  }}
                                >
                                  <X size={10} />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 text-[9px] w-full border-dashed border border-white/5 mt-1"
                              onClick={() => {
                                const newTiers = [...(validationReport.pricing_model?.tiers || [])];
                                newTiers[i].features = [...newTiers[i].features, 'New Feature'];
                                updateValidationReport({
                                  ...validationReport,
                                  pricing_model: { ...validationReport.pricing_model!, tiers: newTiers }
                                });
                              }}
                            >
                              <Plus size={10} className="mr-1" /> Add Perk
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 absolute -right-2 -top-2 bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 rounded-full"
                            onClick={() => {
                              const newTiers = (validationReport.pricing_model?.tiers || []).filter((_, idx) => idx !== i);
                              updateValidationReport({
                                ...validationReport,
                                pricing_model: { ...validationReport.pricing_model!, tiers: newTiers }
                              });
                            }}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-white"
                        onClick={() => {
                          const newTiers = [...(validationReport.pricing_model?.tiers || []), { name: 'New Tier', price: '$0', features: [] }];
                          updateValidationReport({
                            ...validationReport,
                            pricing_model: { ...(validationReport.pricing_model || { type: 'Freemium' }), tiers: newTiers }
                          });
                        }}
                      >
                        <Plus className="mr-2" size={12} /> Add Tier
                      </Button>
                    </div>
                  </div>
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
                      <Button size="sm" onClick={() => { validateIdea(refineFeedback); setIsRefining(false); }} disabled={!refineFeedback.trim() || isGenerating}>
                        {isGenerating ? <ArrowClockwise className="animate-spin mr-2" /> : <MagicWand className="mr-2" />}
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
                  <Button onClick={generateBlueprint} className="bg-primary text-primary-foreground">
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
                                disabled={isGenerating}
                                className="w-full h-10 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                               >
                                 {isGenerating ? <ArrowClockwise className="animate-spin" /> : <MagicWand weight="bold" />}
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
               {/* No specific 'setPhase' needed as we generate docs one by one or all at once? 
                   Previous logic set phase to DOCUMENTATION. 
                   Wait, store logic for 'generateBlueprint' sets phase to 'BLUEPRINT'. 
                   We need a button to go to DOCUMENTATION phase manually or auto?
                   The original code had a button: */}
               <Button onClick={() => useAIStore.setState({ phase: 'DOCUMENTATION' })} className="bg-primary">
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
                    onClick={() => isGenerated ? setSelectedDocType(doc.id) : generateDoc(doc.id)}
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
                   <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
                     <div>
                       <CardTitle className="text-lg">
                         {selectedDocType ? selectedDocType.replace('_', ' ') : 'Document Viewer'}
                       </CardTitle>
                       <CardDescription>
                         {selectedDoc ? 'View and edit this document with AI.' : 'Select a generated document to preview its content...'}
                       </CardDescription>
                     </div>
                     {selectedDoc && (
                       <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-2 border-primary/20 text-primary hover:bg-primary/10"
                        onClick={() => handleDownloadDoc(selectedDoc.asset_type)}
                       >
                         <FileText size={16} /> Download .docx
                       </Button>
                     )}
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
                          onKeyDown={(e) => e.key === 'Enter' && selectedDocType && chatDoc(selectedDocType, chatMessage).then(() => setChatMessage(''))}
                          disabled={!selectedDoc || isGenerating}
                        />
                        <Button variant="secondary" onClick={() => selectedDocType && chatDoc(selectedDocType, chatMessage).then(() => setChatMessage(''))} disabled={!selectedDoc || isGenerating}>
                          {isGenerating ? <ArrowClockwise className="animate-spin" /> : <ChatCircleText className="mr-2" />}
                          {isGenerating ? '' : 'Send'}
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