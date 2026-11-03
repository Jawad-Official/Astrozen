import { useEffect, useRef, useState } from 'react';
import {
  ArrowClockwise,
  ChatCircleText,
  Copy,
  DownloadSimple,
  MagicWand,
  PaperPlaneRight,
  TextAa,
  UploadSimple,
  X,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Doc } from './types';
import { DOC_INFO } from './constants';
import { MarkdownView } from './MarkdownView';

const MIN_SELECTION_CHARS = 15;

export const DocViewerDialog = ({
  doc,
  open,
  onOpenChange,
  busy,
  onChat,
  onRewriteSelection,
  onRegenerate,
  onDownload,
  onReplace,
}: {
  doc: Doc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the viewer is waiting on, if anything. */
  busy: 'chat' | 'regenerate' | 'download' | null;
  onChat: (message: string) => Promise<boolean>;
  onRewriteSelection: (selection: string, message: string) => Promise<boolean>;
  onRegenerate: () => void;
  onDownload: () => void;
  onReplace: () => void;
}) => {
  const [message, setMessage] = useState('');
  const [selection, setSelection] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setMessage('');
      setSelection(null);
    }
  }, [open]);

  if (!doc) return null;

  const info = DOC_INFO[doc.asset_type];
  const history = doc.chat_history ?? [];
  const userRequests = history.filter((m) => m.role === 'user');

  const captureSelection = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (!sel || text.length < MIN_SELECTION_CHARS || !contentRef.current) return;
    if (!contentRef.current.contains(sel.anchorNode)) return;
    setSelection(text);
    setShowChat(true);
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text || busy) return;
    const ok = selection ? await onRewriteSelection(selection, text) : await onChat(text);
    if (ok) {
      setMessage('');
      setSelection(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(doc.content);
      toast.success('Markdown copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border w-[96vw] max-w-6xl h-[90vh] p-0 gap-0 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border space-y-1 shrink-0 pr-12">
          <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
            {info?.icon && <info.icon size={20} className="text-primary shrink-0" />}
            <span className="truncate">{info?.label ?? doc.asset_type}</span>
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs">
            Select text to rewrite just that part, or ask the AI to change the whole document.
          </DialogDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleCopy}>
              <Copy className="mr-1.5" /> Copy Markdown
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onDownload} disabled={busy === 'download'}>
              {busy === 'download' ? <ArrowClockwise className="mr-1.5 animate-spin" /> : <DownloadSimple className="mr-1.5" />}
              Download .docx
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onReplace} disabled={!!busy}>
              <UploadSimple className="mr-1.5" /> Replace with file
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onRegenerate} disabled={!!busy}>
              {busy === 'regenerate' ? <ArrowClockwise className="mr-1.5 animate-spin" /> : <MagicWand className="mr-1.5" />}
              Regenerate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] sm:hidden"
              onClick={() => setShowChat((v) => !v)}
            >
              <ChatCircleText className="mr-1.5" /> {showChat ? 'Hide' : 'Edit with AI'}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
          <div
            ref={contentRef}
            onMouseUp={captureSelection}
            onTouchEnd={captureSelection}
            className={cn(
              'flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 relative',
              busy && busy !== 'download' && 'opacity-60 pointer-events-none'
            )}
          >
            {doc.content.trim() ? (
              <MarkdownView content={doc.content} />
            ) : (
              <p className="text-sm text-muted-foreground">This document is empty.</p>
            )}
          </div>

          <aside
            className={cn(
              'sm:w-[340px] shrink-0 border-t sm:border-t-0 sm:border-l border-border flex-col bg-muted/20 max-h-[45%] sm:max-h-none',
              showChat ? 'flex' : 'hidden sm:flex'
            )}
          >
            <div className="px-4 py-3 border-b border-border text-xs font-semibold flex items-center gap-2">
              <ChatCircleText size={14} /> Edit with AI
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
              {userRequests.length === 0 ? (
                <p className="text-[11px] text-muted-foreground leading-5">
                  Try: "Add a section on offline support", "Make the user stories more specific", or select a paragraph and
                  write "shorter".
                </p>
              ) : (
                userRequests.map((m, i) => (
                  <div key={i} className="text-[11px] leading-5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                    {m.content}
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border space-y-2">
              {selection && (
                <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5">
                  <TextAa size={14} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] leading-4 text-muted-foreground line-clamp-3 flex-1">
                    Rewriting selection: “{selection}”
                  </p>
                  <button
                    type="button"
                    aria-label="Clear selection"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setSelection(null)}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={selection ? 'How should this part change?' : 'What should change in this document?'}
                className="min-h-[72px] text-xs bg-background"
                maxLength={5000}
                disabled={!!busy}
              />
              <Button size="sm" className="w-full h-8 text-xs" onClick={handleSend} disabled={!message.trim() || !!busy}>
                {busy === 'chat' ? (
                  <ArrowClockwise className="mr-1.5 animate-spin" />
                ) : (
                  <PaperPlaneRight className="mr-1.5" />
                )}
                {busy === 'chat' ? 'Updating…' : selection ? 'Rewrite selection' : 'Apply change'}
              </Button>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
};
