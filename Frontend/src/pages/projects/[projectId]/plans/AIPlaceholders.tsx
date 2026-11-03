import { useEffect, useState } from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Placeholders shown where AI output is about to appear, so the page never
 * looks idle or empty while a request is running. Each one cycles through
 * short status lines describing what the model is doing.
 */

const useCyclingMessage = (messages: string[], intervalMs = 3500) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(timer);
  }, [messages.length, intervalMs]);
  return messages[index];
};

const WorkingHeader = ({ title, messages }: { title: string; messages: string[] }) => {
  const message = useCyclingMessage(messages);
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <div className="relative h-10 w-10 shrink-0">
        <div className="absolute inset-0 rounded-full bg-primary/10" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        <Sparkle size={16} weight="fill" className="absolute inset-0 m-auto text-primary animate-pulse" />
      </div>
      <div className="min-w-0">
        <p className="text-sm sm:text-base font-semibold text-foreground">{title}</p>
        <p key={message} className="text-xs text-muted-foreground animate-in fade-in duration-500">
          {message}
        </p>
      </div>
    </div>
  );
};

export const PlansPageSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading project plans">
    <Skeleton className="h-8 w-56" />
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9" />
      ))}
    </div>
    <Skeleton className="h-48 w-full rounded-xl" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  </div>
);

export const ValidationPlaceholder = ({ className }: { className?: string }) => (
  <div className={cn('rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-6 space-y-6', className)} aria-busy="true">
    <WorkingHeader
      title="Validating your idea"
      messages={[
        'Checking market demand and competition…',
        'Assessing technical feasibility…',
        'Shaping core features…',
        'Choosing a tech stack…',
        'Drafting a pricing model…',
      ]}
    />
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-4/5" />
        </div>
      ))}
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  </div>
);

export const BlueprintPlaceholder = () => (
  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-6 space-y-6" aria-busy="true">
    <WorkingHeader
      title="Building the visual blueprint"
      messages={[
        'Mapping screens and services…',
        'Connecting the user flow…',
        'Breaking features into tasks…',
        'Laying out the architecture map…',
      ]}
    />
    <div className="relative h-56 sm:h-72 rounded-xl border border-border bg-card overflow-hidden">
      {[
        'left-[8%] top-[12%]',
        'left-[40%] top-[12%]',
        'left-[72%] top-[12%]',
        'left-[24%] top-[55%]',
        'left-[56%] top-[55%]',
      ].map((pos, i) => (
        <Skeleton key={i} className={cn('absolute h-14 w-[20%] rounded-lg', pos)} style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  </div>
);

/** Small inline placeholder for a doc card while its document is written. */
export const DocCardPlaceholder = () => {
  const message = useCyclingMessage(
    ['Reading earlier documents…', 'Writing sections…', 'Adding detail…', 'Formatting…'],
    4000
  );
  return (
    <div className="mt-3 space-y-1.5" aria-busy="true">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-2 w-5/6" />
      <Skeleton className="h-2 w-2/3" />
      <p key={message} className="text-[10px] pt-1 text-primary font-medium animate-in fade-in duration-500">
        {message}
      </p>
    </div>
  );
};
