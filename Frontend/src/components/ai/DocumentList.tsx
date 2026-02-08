import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  FileText, 
  Download, 
  CircleNotch, 
  Play, 
  Warning, 
  Eye,
  CheckCircle
} from '@phosphor-icons/react';
import { ideaValidatorClient } from '@/services/idea-validator';
import { ProjectAIAsset } from '@/types/issue';
import { cn } from '@/lib/utils';
import { useToast } from '../ui/use-toast';
import { DocPreviewModal } from './DocPreviewModal';

import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const ALL_DOC_TYPES = [
  "PRD", "APP_FLOW", "TECH_STACK", "FRONTEND_GUIDE", "BACKEND_SCHEMA", "IMPLEMENTATION_PLAN"
];

interface DocumentListProps {
  assets: ProjectAIAsset[];
  projectId?: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({ assets, projectId }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const [previewAsset, setPreviewAsset] = useState<{ id: string, type: string } | null>(null);

  const handleDownload = async (assetId: string, format: string) => {
    try {
      const response = await ideaValidatorClient.getDownloadUrl(assetId, format);
      window.open(response.url, '_blank');
    } catch (err) {
      console.error('Failed to download asset:', err);
      toast({
        title: "Download Failed",
        description: `Could not retrieve the ${format.toUpperCase()} version.`,
        variant: "destructive"
      });
    }
  };

  const handleGenerate = async (docType: string) => {
    if (!projectId) return;
    setIsGenerating(prev => ({ ...prev, [docType]: true }));
    try {
      await ideaValidatorClient.generateDoc(projectId, docType);
      toast({
        title: `Generation Started`,
        description: `${docType} is being generated in the background.`,
      });
    } catch (err) {
      toast({
        title: `Generation Failed`,
        description: `Could not start generation for ${docType}.`,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(prev => ({ ...prev, [docType]: false }));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ALL_DOC_TYPES.map((type) => {
        const asset = assets.find(a => a.asset_type === type);
        const status = asset?.generation_status || 'pending';
        const isCurrentlyGenerating = isGenerating[type] || status === 'generating';

        return (
          <Card key={type} className={cn(
            "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] transition-all group overflow-hidden",
            status === 'failed' && "border-red-500/20 bg-red-500/[0.01]"
          )}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileText weight="duotone" className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  {status === 'complete' ? (
                    <CheckCircle weight="fill" className="h-4 w-4 text-emerald-400" />
                  ) : status === 'failed' ? (
                    <Warning weight="fill" className="h-4 w-4 text-red-400" />
                  ) : isCurrentlyGenerating ? (
                    <CircleNotch className="h-4 w-4 animate-spin text-primary" />
                  ) : null}
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-bold uppercase border-white/5",
                    status === 'complete' ? "text-emerald-400/60 bg-emerald-400/5" :
                    status === 'failed' ? "text-red-400/60 bg-red-400/5" :
                    "text-white/20"
                  )}>
                    {status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h4 className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                  {type.replace('_', ' ')}
                </h4>
                <p className="text-[11px] text-white/20 font-medium">
                  {status === 'complete' ? `Generated ${new Date(asset!.created_at).toLocaleDateString()}` : 'Not yet architected'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {status === 'complete' ? (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="glass" 
                          size="sm" 
                          className="flex-1 h-8 text-[10px] font-bold gap-2"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#0c0c0c] border-white/10 text-white">
                        <DropdownMenuItem onClick={() => handleDownload(asset!.id, 'pdf')} className="text-xs focus:bg-primary/20 cursor-pointer">
                          PDF Document (.pdf)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(asset!.id, 'docx')} className="text-xs focus:bg-primary/20 cursor-pointer">
                          Word Document (.docx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(asset!.id, 'md')} className="text-xs focus:bg-primary/20 cursor-pointer">
                          Markdown Source (.md)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      variant="glass" 
                      size="icon" 
                      className="h-8 w-8 text-white/40"
                      title="Preview"
                      onClick={() => setPreviewAsset({ id: asset!.id, type: type })}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="glass-primary" 
                    size="sm" 
                    className="w-full h-8 text-[10px] font-bold gap-2"
                    onClick={() => handleGenerate(type)}
                    disabled={isCurrentlyGenerating}
                  >
                    {isCurrentlyGenerating ? (
                      <CircleNotch className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play weight="fill" className="h-2.5 w-2.5" />
                    )}
                    Generate Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <DocPreviewModal 
        open={!!previewAsset}
        onOpenChange={(open) => !open && setPreviewAsset(null)}
        assetId={previewAsset?.id || null}
        title={previewAsset?.type.replace('_', ' ') || ''}
      />
    </div>
  );
};
