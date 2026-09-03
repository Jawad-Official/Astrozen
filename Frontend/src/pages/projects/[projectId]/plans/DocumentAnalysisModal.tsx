import { ArrowClockwise, CheckCircle, MagicWand } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DOC_INFO } from './constants';

export const DocumentAnalysisModal = ({
  showAnalysisModal,
  setShowAnalysisModal,
  analysisDocType,
  docAnalysis,
  handleDeclineEnhancement,
  handleGenerateEnhancement,
  handleAcceptEnhancement,
  enhancingDoc,
}: {
  showAnalysisModal: boolean;
  setShowAnalysisModal: (open: boolean) => void;
  analysisDocType: string | null;
  docAnalysis: Record<string, any>;
  handleDeclineEnhancement: () => Promise<void>;
  handleGenerateEnhancement: () => Promise<void>;
  handleAcceptEnhancement: () => Promise<void>;
  enhancingDoc: boolean;
}) => {
  return (
    <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
      <DialogContent className="bg-popover border-border w-[95vw] sm:max-w-[600px] p-4 sm:p-6 rounded-2xl shadow-2xl">
        {(() => {
          const analysis = analysisDocType ? docAnalysis[analysisDocType] : undefined;
          return (
        <>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            {analysis?.severity === 'critical' && (
              <span className="text-red-400">Document Review Required</span>
            )}
            {analysis?.severity === 'warning' && (
              <span className="text-yellow-400">Document Enhancement Available</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {DOC_INFO[analysisDocType || '']?.label} - {analysis?.summary}
          </DialogDescription>
        </DialogHeader>

        {analysis && (
          <div className="space-y-4 py-2 sm:py-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold",
                analysis.quality_score >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                analysis.quality_score >= 60 ? "bg-yellow-500/20 text-yellow-400" :
                analysis.quality_score >= 40 ? "bg-orange-500/20 text-orange-400" :
                "bg-red-500/20 text-red-400"
              )}>
                {analysis.quality_score}%
              </div>
              <div>
                <p className="text-sm font-medium">Quality Score</p>
                <p className="text-xs text-white/40">
                  {analysis.is_valid ? "Valid document format" : "Document format issues detected"}
                </p>
              </div>
            </div>

            {analysis.issues?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Issues Found</p>
                <ul className="space-y-1">
                  {analysis.issues.map((issue: string, i: number) => (
                    <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.missing_sections?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Missing Sections</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.missing_sections.map((section: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-xs">
                      {section}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.suggestions?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Suggestions</p>
                <ul className="space-y-1">
                  {analysis.suggestions.map((suggestion: string, i: number) => (
                    <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.ai_can_enhance && !analysis.enhanced_content && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-400 font-medium">AI Can Enhance This Document</p>
                <p className="text-xs text-white/60 mt-1">{analysis.enhancement_preview}</p>
              </div>
            )}

            {analysis.enhanced_content && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Enhanced Version Preview</p>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 max-h-40 overflow-y-auto">
                  <pre className="text-xs text-white/70 whitespace-pre-wrap">{analysis.preview}</pre>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeclineEnhancement}
                className="text-white/60 hover:text-white text-xs"
              >
                Keep Original
              </Button>
              <div className="flex gap-2">
                {analysis.ai_can_enhance && !analysis.enhanced_content && (
                  <Button
                    size="sm"
                    onClick={handleGenerateEnhancement}
                    disabled={enhancingDoc}
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    {enhancingDoc ? <ArrowClockwise className="animate-spin mr-2 h-3 w-3" /> : <MagicWand className="mr-2 h-3 w-3" />}
                    Generate Enhancement
                  </Button>
                )}
                {analysis.enhanced_content && (
                  <Button
                    size="sm"
                    onClick={handleAcceptEnhancement}
                    disabled={enhancingDoc}
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                  >
                    <CheckCircle className="mr-2 h-3 w-3" />
                    Accept Enhancement
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
};
