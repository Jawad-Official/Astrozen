import { Dispatch, SetStateAction } from 'react';
import {
  MagicWand,
  ShieldCheck,
  ArrowClockwise,
  Plus,
  X,
  Lightbulb,
  TrendUp,
  Circuitry,
  Coins,
  Stack,
  Rocket,
  CheckCircle,
  XCircle,
  ArrowRight,
  CheckSquare,
  CreditCard,
  Layout,
  Database,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { aiService } from '@/services/ai.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ValidationReport, Blueprint, PricingTier } from './types';
import { DEFAULT_PRICING_TIERS } from './constants';

type ValidationTab = 'overview' | 'features' | 'techstack' | 'pricing' | 'improvements';

export const ValidationSection = ({
  validationReport,
  setValidationReport,
  blueprint,
  validationTab,
  setValidationTab,
  editingTech,
  setEditingTech,
  techFeedback,
  setTechFeedback,
  isRegeneratingTech,
  handleRegenerateTech,
  handleValidationEdit,
  selectedImprovementIndices,
  setSelectedImprovementIndices,
  improvementStatus,
  setImprovementStatus,
  ideaId,
  revalidating,
  setRevalidating,
  handleGenerateBlueprint,
}: {
  validationReport: ValidationReport | null;
  setValidationReport: Dispatch<SetStateAction<ValidationReport | null>>;
  blueprint: Blueprint | null;
  validationTab: ValidationTab;
  setValidationTab: Dispatch<SetStateAction<ValidationTab>>;
  editingTech: string | null;
  setEditingTech: Dispatch<SetStateAction<string | null>>;
  techFeedback: Record<string, string>;
  setTechFeedback: Dispatch<SetStateAction<Record<string, string>>>;
  isRegeneratingTech: string | null;
  handleRegenerateTech: (field: string) => Promise<void>;
  handleValidationEdit: (updatedReport: ValidationReport) => void;
  selectedImprovementIndices: number[];
  setSelectedImprovementIndices: Dispatch<SetStateAction<number[]>>;
  improvementStatus: Record<number, string>;
  setImprovementStatus: Dispatch<SetStateAction<Record<number, string>>>;
  ideaId: string | null;
  revalidating: boolean;
  setRevalidating: Dispatch<SetStateAction<boolean>>;
  handleGenerateBlueprint: () => Promise<void>;
}) => {
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10 rounded-t-2xl border border-border border-b-0">
         <div className="flex items-center gap-4">
           <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-500/20">
             <ShieldCheck size={24} weight="duotone" />
           </div>
           <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">AI Validation Report</h2>
              {isAccepted ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400/80 font-medium flex items-center gap-1">
                  <CheckCircle size={12} weight="fill" /> Analysis approved
                </p>
              ) : (
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Market feasibility analysis</p>
              )}
           </div>
         </div>

         <div className="flex items-center gap-6 bg-muted/50 px-4 py-3 rounded-xl border border-border">
            <div className="text-right">
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Overall Score</div>
                <div className={cn(
                    "text-3xl font-black leading-tight",
                    score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                )}>
                    {scoreOutOf10}<span className="text-sm text-muted-foreground/40 font-bold">/10</span>
                </div>
            </div>
            <div className="h-12 w-12 relative">
                <svg className="h-full w-full -rotate-90">
                    <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/10" />
                    <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="5" className={cn(score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400")} strokeDasharray="283" strokeDashoffset={283 - (283 * score / 10)} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TrendUp size={16} className={cn(score >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")} />
                </div>
            </div>
         </div>
      </div>

      {/* Tabs Navigation */}
      {!isAccepted && (
        <div className="flex overflow-x-auto gap-1 p-2 bg-muted/20 border-x border-border scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setValidationTab(tab.id as ValidationTab)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                validationTab === tab.id
                  ? "bg-accent text-foreground shadow-lg border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <tab.icon size={14} weight={validationTab === tab.id ? "duotone" : "regular"} />
              {tab.label}
              {tab.count !== null && (
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded text-[9px]",
                  validationTab === tab.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground/60"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className={cn("p-4 sm:p-6 bg-background/50 border border-border rounded-b-2xl shadow-xl", isAccepted && "opacity-60")}>

        {/* OVERVIEW TAB */}
        {(validationTab === 'overview' || isAccepted) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {validationReport.market_feasibility.pillars.map((pillar) => {
                const pillarScore = pillar.status === 'Strong' ? 9 : pillar.status === 'Moderate' ? 7 : pillar.status === 'Weak' ? 4 : 2;
                const scoreColor = pillarScore >= 8 ? "emerald" : pillarScore >= 6 ? "yellow" : "red";
                return (
                <Card key={pillar.name} className="border-border bg-card hover:bg-accent/5 transition-all group overflow-hidden shadow-md">
                  <CardHeader className="py-3 px-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{pillar.name}</span>
                      <Badge variant="secondary" className={cn(
                        "h-5 text-[9px] px-2 font-bold",
                        pillar.status === 'Strong' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                        pillar.status === 'Moderate' ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20" :
                        "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      )}>{pillar.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed min-h-[80px]">
                    {pillar.reason}
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <div className={cn("h-full transition-all duration-500",
                        scoreColor === "emerald" ? "bg-emerald-500" : scoreColor === "yellow" ? "bg-yellow-500" : "bg-red-500"
                      )} style={{ width: `${pillarScore * 10}%` }} />
                  </div>
                  <div className="absolute top-3 right-12">
                    <span className={cn(
                        "text-sm font-black",
                        scoreColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" : scoreColor === "yellow" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
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
                <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" weight="duotone" />
                <h3 className="text-base font-bold text-foreground">Project Core Features</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] uppercase font-bold tracking-widest border-border hover:bg-accent text-primary"
                onClick={() => {
                  const newFeatures = [...(validationReport.core_features || []), { name: 'New Feature', description: 'Description', type: 'Core' }];
                  const updatedReport = {...validationReport, core_features: newFeatures};
                  setValidationReport(updatedReport);
                  handleValidationEdit(updatedReport);
                }}
              >
                <Plus className="mr-1" size={14} weight="bold" /> Add Feature
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(validationReport.core_features || []).map((feature, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-card border border-border group relative flex items-start gap-4 hover:border-primary/20 transition-all shadow-sm">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckSquare size={16} weight="bold" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <Input
                      value={feature.name}
                      onChange={(e) => {
                        const newFeatures = [...(validationReport.core_features || [])];
                        newFeatures[idx].name = e.target.value;
                        const updatedReport = {...validationReport, core_features: newFeatures};
                        setValidationReport(updatedReport);
                        handleValidationEdit(updatedReport);
                      }}
                      className="h-7 text-sm font-bold bg-transparent border-none p-0 focus-visible:ring-0 text-foreground"
                      placeholder="Feature Name"
                    />
                    <Textarea
                      value={feature.description}
                      onChange={(e) => {
                        const newFeatures = [...(validationReport.core_features || [])];
                        newFeatures[idx].description = e.target.value;
                        const updatedReport = {...validationReport, core_features: newFeatures};
                        setValidationReport(updatedReport);
                        handleValidationEdit(updatedReport);
                      }}
                      className="text-[11px] text-muted-foreground bg-transparent border-none p-0 focus-visible:ring-0 resize-none min-h-[40px] leading-relaxed"
                      placeholder="Describe the feature purpose..."
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                    onClick={() => {
                      const newFeatures = (validationReport.core_features || []).filter((_, i) => i !== idx);
                      const updatedReport = {...validationReport, core_features: newFeatures};
                      setValidationReport(updatedReport);
                      handleValidationEdit(updatedReport);
                    }}
                  >
                    <XCircle size={16} />
                  </Button>
                </div>
              ))}

              {validationReport.core_features?.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl opacity-40">
                  <CheckSquare size={48} weight="thin" />
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-foreground">No features defined</p>
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
                <Stack size={18} className="text-emerald-600 dark:text-green-400" weight="duotone" />
                <h3 className="text-base font-bold text-foreground">Technology Stack</h3>
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-card border border-border relative overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <Circuitry size={14} className="text-muted-foreground/40" weight="duotone" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Architecture Overview</span>
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
                      <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/5 group-hover:scale-110 transition-transform">
                        <Layout size={32} weight="duotone" className="text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-black uppercase tracking-wider text-foreground/80">Frontend</div>
                      <div className="text-[9px] text-muted-foreground/40 mt-0.5">Client Side</div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5 max-w-[160px]">
                      {(validationReport.tech_stack.frontend || []).slice(0, 3).map((tech: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="hidden lg:flex items-center"
                  >
                    <div className="flex items-center gap-1">
                      <div className="h-px w-8 bg-gradient-to-r from-purple-500/30 to-transparent" />
                      <ArrowRight size={16} className="text-muted-foreground/20" />
                      <div className="h-px w-8 bg-gradient-to-l from-orange-500/30 to-transparent" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative group">
                      <div className="absolute -inset-3 bg-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                      <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 flex items-center justify-center shadow-lg shadow-orange-500/5 group-hover:scale-110 transition-transform">
                        <Circuitry size={32} weight="duotone" className="text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-black uppercase tracking-wider text-foreground/80">Backend</div>
                      <div className="text-[9px] text-muted-foreground/40 mt-0.5">Server Logic</div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5 max-w-[160px]">
                      {(validationReport.tech_stack.backend || []).slice(0, 3).map((tech: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="hidden lg:flex items-center"
                  >
                    <div className="flex items-center gap-1">
                      <div className="h-px w-8 bg-gradient-to-r from-orange-500/30 to-transparent" />
                      <ArrowRight size={16} className="text-muted-foreground/20" />
                      <div className="h-px w-8 bg-gradient-to-l from-cyan-500/30 to-transparent" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative group">
                      <div className="absolute -inset-3 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                      <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 flex items-center justify-center shadow-lg shadow-cyan-500/5 group-hover:scale-110 transition-transform">
                        <Database size={32} weight="duotone" className="text-cyan-600 dark:text-cyan-400" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-black uppercase tracking-wider text-foreground/80">Database</div>
                      <div className="text-[9px] text-muted-foreground/40 mt-0.5">Storage & Cache</div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5 max-w-[160px]">
                      {(validationReport.tech_stack.database || []).slice(0, 3).map((tech: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 pt-6 border-t border-border"
                >
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <div className="flex items-center gap-2 px-4">
                      <Rocket size={12} className="text-emerald-600/60 dark:text-green-400/60" weight="duotone" />
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">Infrastructure Layer</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {(validationReport.tech_stack.infrastructure || []).map((tech: string, i: number) => (
                      <motion.span
                        key={i}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-green-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
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
                    "p-6 rounded-[2rem] bg-card border transition-all duration-300 relative overflow-hidden group shadow-xl",
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
              {(validationReport.pricing_model.tiers || []).map((tier: PricingTier, i: number) => (
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
                            newTiers[i].features = newTiers[i].features.filter((_: string, idx: number) => idx !== j);
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
                      const newTiers = (validationReport.pricing_model.tiers || []).filter((_: PricingTier, idx: number) => idx !== i);
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
                  let newTier: PricingTier = { name: 'NEW TIER', price: '$0', features: [] };

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
