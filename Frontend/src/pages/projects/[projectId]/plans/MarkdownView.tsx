import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * Renders AI-generated / uploaded Markdown docs.
 *
 * react-markdown never renders raw HTML (no rehype-raw), so a doc can't
 * inject script or markup. Links open in a new tab without an opener. Images
 * are dropped: a doc has no legitimate need to make the viewer's browser
 * fetch an arbitrary external URL.
 */
const components: Components = {
  h1: ({ node: _n, ...props }) => <h1 className="text-2xl font-bold tracking-tight mt-2 mb-4 text-foreground" {...props} />,
  h2: ({ node: _n, ...props }) => <h2 className="text-xl font-semibold tracking-tight mt-8 mb-3 pb-2 border-b border-border text-foreground" {...props} />,
  h3: ({ node: _n, ...props }) => <h3 className="text-base font-semibold mt-6 mb-2 text-foreground" {...props} />,
  h4: ({ node: _n, ...props }) => <h4 className="text-sm font-semibold mt-4 mb-2 text-foreground" {...props} />,
  p: ({ node: _n, ...props }) => <p className="text-sm leading-7 my-3 text-foreground/85" {...props} />,
  ul: ({ node: _n, ...props }) => <ul className="list-disc pl-6 my-3 space-y-1 text-sm text-foreground/85" {...props} />,
  ol: ({ node: _n, ...props }) => <ol className="list-decimal pl-6 my-3 space-y-1 text-sm text-foreground/85" {...props} />,
  li: ({ node: _n, ...props }) => <li className="leading-6" {...props} />,
  a: ({ node: _n, ...props }) => (
    <a className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  blockquote: ({ node: _n, ...props }) => (
    <blockquote className="border-l-2 border-primary/40 pl-4 my-4 italic text-muted-foreground" {...props} />
  ),
  hr: () => <hr className="my-6 border-border" />,
  table: ({ node: _n, ...props }) => (
    <div className="my-4 w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  thead: ({ node: _n, ...props }) => <thead className="bg-muted/50" {...props} />,
  th: ({ node: _n, ...props }) => <th className="px-3 py-2 text-left font-semibold border-b border-border" {...props} />,
  td: ({ node: _n, ...props }) => <td className="px-3 py-2 align-top border-b border-border/60" {...props} />,
  pre: ({ node: _n, ...props }) => (
    <pre className="my-4 p-4 rounded-lg bg-muted/60 border border-border overflow-x-auto text-xs leading-6" {...props} />
  ),
  code: ({ node: _n, className, ...props }) => (
    <code className={cn('font-mono text-[0.85em] px-1 py-0.5 rounded bg-muted/60', className)} {...props} />
  ),
  img: () => null,
};

export const MarkdownView = ({ content, className }: { content: string; className?: string }) => (
  <div className={cn('min-w-0 break-words', className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  </div>
);
