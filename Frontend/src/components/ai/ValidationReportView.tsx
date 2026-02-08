import React, { useState, useEffect } from 'react';
import { ValidationReportResponse } from '../../types/ai';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Check, X, ArrowsClockwise, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface SectionState {
  status: 'pending' | 'accepted' | 'declined';
  refinePrompt: string;
}

interface ValidationReportViewProps {
  report: ValidationReportResponse;
  onConfirm: (refinedDescription?: string) => void;
  onRefine: (section: string, prompt: string) => Promise<void>;
  isLoading: boolean;
}

export const ValidationReportView: React.FC<ValidationReportViewProps> = ({ 
  report, 
  onConfirm, 
  onRefine,
  isLoading 
}) => {
  const [sections, setSections] = useState<Record<string, SectionState>>({
    market: { status: 'pending', refinePrompt: '' },
    pricing: { status: 'pending', refinePrompt: '' },
    features: { status: 'pending', refinePrompt: '' },
    stack: { status: 'pending', refinePrompt: '' },
  });

  const [refinedDesc, setRefinedDesc] = useState(report?.refined_description || '');

  useEffect(() => {
    if (report?.refined_description) {
      setRefinedDesc(report.refined_description);
    }
  }, [report]);

  const updateSection = (name: string, patch: Partial<SectionState>) => {
    setSections(prev => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  };

  const isAllAccepted = Object.values(sections).every(s => s.status === 'accepted');

  const SectionHeader = ({ title, section }: { title: string, section: string }) => (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">{title}</h3>
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-7 px-2 gap-1 text-[10px]", sections[section].status === 'accepted' ? "text-emerald-400 bg-emerald-400/10" : "text-white/20")}
          onClick={() => updateSection(section, { status: 'accepted' })}
        >
          <Check weight="bold" /> Accept
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-7 px-2 gap-1 text-[10px]", sections[section].status === 'declined' ? "text-red-400 bg-red-400/10" : "text-white/20")}
          onClick={() => updateSection(section, { status: 'declined' })}
        >
          <X weight="bold" /> Decline
        </Button>
      </div>
    </div>
  );

  if (!report) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Validation Report</h2>
        <Badge variant={report.market_analysis?.viability === 'High' ? 'default' : 'secondary'}>
          Overall Viability: {report.market_analysis?.viability || 'Unknown'}
        </Badge>
      </div>

      {/* 6 Pillars View */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(report.market_analysis?.pillar_scores || {}).map(([key, value]) => (
          <Card key={key} className="bg-white/[0.02] border-white/5">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-primary uppercase mb-1">{key.replace('_', ' ')}</p>
              <p className="text-xs text-white/60 leading-tight">{value as string}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white/[0.01] border-white/5">
        <CardHeader className="pb-2"><CardTitle className="text-sm">AI Summary</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-white/70">{refinedDesc || 'No summary generated.'}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={cn("bg-white/[0.01] border-white/5", sections.market.status === 'declined' && "border-red-500/20")}>
          <CardContent className="p-6">
            <SectionHeader title="Market Analysis" section="market" />
            {sections.market.status === 'declined' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <Textarea 
                  placeholder="Describe what you want to change..."
                  value={sections.market.refinePrompt}
                  onChange={(e) => updateSection('market', { refinePrompt: e.target.value })}
                  className="text-xs min-h-[80px] bg-white/5 border-white/10"
                />
                <Button size="sm" className="h-8 gap-2 text-[10px]" onClick={() => onRefine('market_analysis', sections.market.refinePrompt)}>
                  <Sparkle weight="fill" /> Refine with AI
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">Target: <span className="text-white/60">{report.market_analysis.target_audience}</span></p>
                <div className="flex flex-wrap gap-2">
                  {report.market_analysis.competitors.map((c, i) => <Badge key={i} variant="secondary" className="text-[10px]">{c}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn("bg-white/[0.01] border-white/5", sections.pricing.status === 'declined' && "border-red-500/20")}>
          <CardContent className="p-6">
            <SectionHeader title="Pricing Strategy" section="pricing" />
            {sections.pricing.status === 'declined' ? (
              <div className="space-y-4">
                <Textarea 
                  placeholder="Describe your pricing requirements..."
                  value={sections.pricing.refinePrompt}
                  onChange={(e) => updateSection('pricing', { refinePrompt: e.target.value })}
                  className="text-xs min-h-[80px] bg-white/5 border-white/10"
                />
                <Button size="sm" className="h-8 gap-2 text-[10px]" onClick={() => onRefine('pricing_model', sections.pricing.refinePrompt)}>
                  <Sparkle weight="fill" /> Refine Pricing
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-bold text-primary">{report.pricing_model.strategy}</p>
                <p className="text-xs text-white/40 italic">{report.pricing_model.rationale}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cn("bg-white/[0.01] border-white/5", sections.features.status === 'declined' && "border-red-500/20")}>
        <CardContent className="p-6">
          <SectionHeader title="Core Features" section="features" />
          {sections.features.status === 'declined' ? (
             <div className="space-y-4">
                <Textarea 
                  placeholder="Tell AI which features to change..."
                  value={sections.features.refinePrompt}
                  onChange={(e) => updateSection('features', { refinePrompt: e.target.value })}
                  className="text-xs min-h-[80px] bg-white/5 border-white/10"
                />
                <Button size="sm" className="h-8 gap-2 text-[10px]" onClick={() => onRefine('core_features', sections.features.refinePrompt)}>
                  <Sparkle weight="fill" /> Regenerate Features
                </Button>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.core_features.map((f, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex justify-between mb-1">
                    <p className="text-xs font-bold text-white/80">{f.name}</p>
                    <Badge variant="outline" className="text-[9px] py-0 h-4">{f.priority}</Badge>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">{f.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={cn("bg-white/[0.01] border-white/5", sections.stack.status === 'declined' && "border-red-500/20")}>
        <CardContent className="p-6">
          <SectionHeader title="Technology Stack" section="stack" />
          {sections.stack.status === 'declined' ? (
             <div className="space-y-4">
                <Textarea 
                  placeholder="Describe your tech preferences..."
                  value={sections.stack.refinePrompt}
                  onChange={(e) => updateSection('stack', { refinePrompt: e.target.value })}
                  className="text-xs min-h-[80px] bg-white/5 border-white/10"
                />
                <Button size="sm" className="h-8 gap-2 text-[10px]" onClick={() => onRefine('tech_stack', sections.stack.refinePrompt)}>
                  <Sparkle weight="fill" /> Update Stack
                </Button>
             </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {Object.entries(report.tech_stack).map(([key, val]) => (
                <div key={key} className="px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
                  <p className="text-[9px] font-black uppercase text-primary/60 mb-0.5">{key}</p>
                  <p className="text-xs font-bold text-primary">{val as string}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-4 pt-10">
        {!isAllAccepted && <p className="text-[11px] text-white/20 italic">Accept all sections to unlock Phase 3: Visual Blueprint</p>}
        <Button 
          size="lg" 
          className="px-12 font-black uppercase tracking-widest h-14"
          disabled={!isAllAccepted || isLoading}
          onClick={() => onConfirm(refinedDesc)}
        >
          {isLoading ? <ArrowsClockwise className="h-5 w-5 animate-spin" /> : "Accept & Proceed"}
        </Button>
      </div>
    </div>
  );
};