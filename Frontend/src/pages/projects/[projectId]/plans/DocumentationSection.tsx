import {
  FileText,
  MagicWand,
  UploadSimple,
  Warning,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  ArrowClockwise,
  LockSimple,
  DownloadSimple,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DOC_ORDER } from '@/services/ai.service';
import { Doc, DocAnalysis } from './types';
import { DOC_INFO } from './constants';
import { DocCardPlaceholder } from './AIPlaceholders';

/** Docs build on each other, and the backend refuses to generate one
 * before the previous doc exists - mirror that here instead of letting
 * the user click Generate and get an error. */
const previousDocType = (docType: string): string | null => {
  const index = DOC_ORDER.indexOf(docType);
  return index > 0 ? DOC_ORDER[index - 1] : null;
};

const needsReview = (analysis?: DocAnalysis | null) =>
  !!analysis && (analysis.severity === 'critical' || analysis.severity === 'warning');

export const DocumentationSection = ({
  docs,
  docAnalysis,
  busyDocType,
  handleOpenDoc,
  handleDownloadDoc,
  handleGenerateDocFlow,
  handleUploadClick,
  openAnalysis,
}: {
  docs: Doc[];
  docAnalysis: Record<string, DocAnalysis>;
  /** Doc type currently being prepared / generated / uploaded. */
  busyDocType: string | null;
  handleOpenDoc: (docType: string) => void;
  handleDownloadDoc: (docType: string) => Promise<void>;
  handleGenerateDocFlow: (type: string) => Promise<void>;
  handleUploadClick: (docType: string) => void;
  openAnalysis: (docType: string) => void;
}) => {
  const completed = DOC_ORDER.filter((type) => docs.some((d) => d.asset_type === type)).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 pt-8 sm:pt-12 border-t border-border">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0 border border-purple-500/20">
            <FileText size={18} weight="bold" className="sm:hidden" />
            <FileText size={20} weight="bold" className="hidden sm:block" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground/90">Documentation</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
              Generate in order. Each document builds on the ones before it.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-foreground/80">{completed} / {DOC_ORDER.length}</div>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden mt-1">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(completed / DOC_ORDER.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {DOC_ORDER.map((id, index) => {
          const info = DOC_INFO[id];
          const doc = docs.find((d) => d.asset_type === id);
          const analysis = docAnalysis[id];
          const prev = previousDocType(id);
          const locked = !doc && !!prev && !docs.some((d) => d.asset_type === prev);
          const busy = busyDocType === id;
          const anyBusy = busyDocType !== null;
          const review = needsReview(analysis);

          return (
            <Card
              key={id}
              data-doc-type={id}
              role={doc ? 'button' : undefined}
              tabIndex={doc ? 0 : undefined}
              className={cn(
                'transition-all group overflow-hidden flex flex-col shadow-sm',
                doc && 'cursor-pointer hover:border-primary/30',
                locked && 'opacity-60',
                analysis?.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                analysis?.severity === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
                doc ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-card border-border'
              )}
              onClick={(e) => {
                if (!doc || (e.target as HTMLElement).closest('.action-btn')) return;
                handleOpenDoc(id);
              }}
              onKeyDown={(e) => {
                if (doc && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                  e.preventDefault();
                  handleOpenDoc(id);
                }
              }}
            >
              <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <info.icon className={doc ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'} size={24} />
                    <span className="text-[10px] font-bold text-muted-foreground/60">{index + 1}</span>
                  </div>
                  {busy ? (
                    <ArrowClockwise className="text-primary animate-spin" />
                  ) : analysis?.severity === 'critical' ? (
                    <Warning className="text-red-600 dark:text-red-400" weight="fill" />
                  ) : analysis?.severity === 'warning' ? (
                    <Lightbulb className="text-yellow-600 dark:text-yellow-400" weight="fill" />
                  ) : doc ? (
                    <CheckCircle className="text-emerald-600 dark:text-emerald-400" weight="fill" />
                  ) : locked ? (
                    <LockSimple className="text-muted-foreground/50" />
                  ) : null}
                </div>
                <CardTitle className="text-sm sm:text-base mt-2 sm:mt-3">{info.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-[11px] sm:text-xs text-muted-foreground/80 line-clamp-2 sm:line-clamp-none sm:min-h-[40px]">
                  {info.summary}
                </p>
                {busy && <DocCardPlaceholder />}
                {!busy && locked && prev && (
                  <p className="text-[10px] mt-2 text-muted-foreground font-medium">
                    Create {DOC_INFO[prev].label} first, or upload your own.
                  </p>
                )}
                {!busy && analysis && (
                  <button
                    type="button"
                    className="action-btn text-[10px] mt-2 text-muted-foreground hover:text-foreground font-medium underline-offset-2 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAnalysis(id);
                    }}
                  >
                    {analysis.quality_score == null
                      ? 'AI review unavailable'
                      : `Quality: ${analysis.quality_score}%${review ? ' - review suggestions' : ''}`}
                  </button>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 sm:p-6 sm:pt-0 flex gap-2">
                {!doc ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={anyBusy}
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
                      disabled={anyBusy || locked}
                      className="action-btn h-7 text-[9px] sm:text-[10px] w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateDocFlow(id);
                      }}
                    >
                      {busy ? <ArrowClockwise className="mr-1 animate-spin" /> : <MagicWand className="mr-1" />}
                      {busy ? 'Generating' : 'Generate'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="action-btn h-7 px-2 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDoc(id);
                      }}
                    >
                      Open <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Download ${info.label} as .docx`}
                      className="action-btn h-7 px-2 ml-auto text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDoc(id);
                      }}
                    >
                      <DownloadSimple size={14} />
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
