import {
  FileText,
  MagicWand,
  UploadSimple,
  Warning,
  Lightbulb,
  CheckCircle,
  ArrowRight,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Doc } from './types';
import { DOC_INFO } from './constants';

export const DocumentationSection = ({
  docs,
  docAnalysis,
  handleDownloadDoc,
  handleGenerateDocFlow,
  handleUploadClick,
  setAnalysisDocType,
  setShowAnalysisModal,
}: {
  docs: Doc[];
  docAnalysis: Record<string, any>;
  handleDownloadDoc: (docType: string) => Promise<void>;
  handleGenerateDocFlow: (type: string) => Promise<void>;
  handleUploadClick: (docType: string) => void;
  setAnalysisDocType: (docType: string | null) => void;
  setShowAnalysisModal: (open: boolean) => void;
}) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 pt-8 sm:pt-12 border-t border-border">
       <div className="flex items-center justify-between">
           <div className="flex items-center gap-3 sm:gap-4">
             <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0 border border-purple-500/20">
               <FileText size={18} weight="bold" className="sm:hidden" />
               <FileText size={20} weight="bold" className="hidden sm:block" />
             </div>
             <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground/90">Documentation</h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Technical specifications and guides</p>
             </div>
           </div>
       </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
           {Object.entries(DOC_INFO).map(([id, info]) => {
              const isGenerated = docs.find(d => d.asset_type === id);
              const hasAnalysis = docAnalysis[id];
              const analysisSeverity = hasAnalysis?.severity;
              return (
                 <Card
                   key={id}
                   className={cn(
                     "cursor-pointer hover:border-primary/30 transition-all group overflow-hidden flex flex-col shadow-sm",
                     hasAnalysis && analysisSeverity === 'critical' ? "bg-red-500/5 border-red-500/20" :
                     hasAnalysis && analysisSeverity === 'warning' ? "bg-yellow-500/5 border-yellow-500/20" :
                     isGenerated ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border"
                   )}
                   onClick={(e) => {
                       if ((e.target as HTMLElement).closest('.action-btn')) return;
                       if (hasAnalysis) {
                         setAnalysisDocType(id);
                         setShowAnalysisModal(true);
                       } else if (isGenerated) handleDownloadDoc(id);
                       else handleGenerateDocFlow(id);
                   }}
                 >
                    <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                       <div className="flex justify-between items-start">
                          <info.icon className={isGenerated ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/40"} size={24} />
                          {hasAnalysis && analysisSeverity === 'critical' && (
                            <Warning className="text-red-600 dark:text-red-400" weight="fill" />
                          )}
                          {hasAnalysis && analysisSeverity === 'warning' && (
                            <Lightbulb className="text-yellow-600 dark:text-yellow-400" weight="fill" />
                          )}
                          {isGenerated && !hasAnalysis && <CheckCircle className="text-emerald-600 dark:text-emerald-400" weight="fill" />}
                       </div>
                       <CardTitle className="text-sm sm:text-base mt-2 sm:mt-3">{info.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 pt-0 sm:p-6 sm:pt-0">
                       <p className="text-[11px] sm:text-xs text-muted-foreground/80 line-clamp-2 sm:line-clamp-none sm:min-h-[40px]">{info.summary}</p>
                       {hasAnalysis && (
                         <p className="text-[10px] mt-2 text-muted-foreground/60 font-medium">
                           Quality: {hasAnalysis.quality_score}% - Click to review
                         </p>
                       )}
                    </CardContent>
                    <CardFooter className="p-4 pt-0 sm:p-6 sm:pt-0 flex gap-2">
                       {!isGenerated ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="action-btn h-7 text-[9px] sm:text-[10px] w-full border-border hover:bg-accent"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleUploadClick(id);
                                }}
                            >
                                <UploadSimple className="mr-1" /> Upload
                            </Button>
                            <Button
                                size="sm"
                                className="action-btn h-7 text-[9px] sm:text-[10px] w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
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
                            className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform"
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
  );
};
