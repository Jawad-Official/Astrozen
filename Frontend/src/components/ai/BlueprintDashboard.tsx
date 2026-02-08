import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { 
  CheckCircle, 
  CircleNotch, 
  FileText, 
  Kanban, 
  Target,
  ShieldCheck
} from '@phosphor-icons/react';
import { ProjectAIAsset } from '@/types/issue';
import { cn } from '@/lib/utils';

interface BlueprintDashboardProps {
  assets: ProjectAIAsset[];
  featureCount: number;
}

export const BlueprintDashboard: React.FC<BlueprintDashboardProps> = ({ assets, featureCount }) => {
  const docAssets = assets.filter(a => a.asset_type !== 'DIAGRAM_MERMAID');
  const completedDocs = docAssets.filter(a => a.generation_status === 'complete').length;
  const totalDocs = 6;
  const docProgress = Math.round((completedDocs / totalDocs) * 100);
  
  const isGenerating = assets.some(a => a.generation_status === 'generating');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-white/[0.02] border-white/5 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText size={20} weight="duotone" />
            </div>
            {isGenerating && <CircleNotch size={16} className="animate-spin text-primary" />}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Documentation</p>
            <h4 className="text-2xl font-bold text-white">{completedDocs}<span className="text-white/20 text-lg">/{totalDocs}</span></h4>
          </div>
          <div className="mt-4 space-y-2">
            <Progress value={docProgress} className="h-1 bg-white/5" />
            <p className="text-[10px] text-white/40 font-medium">Technical blueprints ready</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/[0.02] border-white/5 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Kanban size={20} weight="duotone" />
            </div>
            <CheckCircle size={16} className="text-emerald-400/40" weight="fill" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Kanban Ready</p>
            <h4 className="text-2xl font-bold text-white">{featureCount}</h4>
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-white/40 font-medium leading-relaxed">
              Features converted to actionable development tickets.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/[0.02] border-white/5 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <ShieldCheck size={20} weight="duotone" />
            </div>
            <Target size={16} className="text-purple-400/40" weight="fill" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Architecture</p>
            <h4 className="text-2xl font-bold text-white">
              {docProgress === 100 ? 'Verified' : docProgress > 0 ? 'Active' : 'Draft'}
            </h4>
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-white/40 font-medium leading-relaxed">
              AI-driven technical validation and feasibility scoring.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
