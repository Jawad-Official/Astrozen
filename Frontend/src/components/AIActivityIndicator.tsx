import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkle } from '@phosphor-icons/react';
import { useAIActivityStore } from '@/store/aiActivityStore';

const formatElapsed = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

/**
 * Floating, non-blocking "AI is working" pill. Mounted once at the app root,
 * so it stays visible while the user keeps working on other pages.
 */
export function AIActivityIndicator() {
  const activities = useAIActivityStore((s) => s.activities);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (activities.length === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activities.length]);

  const current = activities[0];
  const elapsed = current ? now - current.startedAt : 0;

  return (
    // Bottom-centre so it never sits under the toasts (bottom-right).
    <div className="pointer-events-none fixed inset-x-0 bottom-4 sm:bottom-6 z-[60] flex justify-center px-4">
    <AnimatePresence>
      {current && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="pointer-events-auto w-full sm:w-auto sm:min-w-[320px] sm:max-w-md flex items-center gap-3 p-3 pr-4 rounded-2xl border border-primary/20 bg-background/90 backdrop-blur-md shadow-2xl shadow-primary/10"
        >
          <div className="relative h-9 w-9 shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            <Sparkle size={16} weight="fill" className="absolute inset-0 m-auto text-primary animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{current.label}</p>
            <p className="text-[11px] text-muted-foreground">
              {elapsed > 45000 ? 'Still working, long outputs take a while' : 'AI is working, you can keep going'}
              {' · '}
              {formatElapsed(elapsed)}
              {activities.length > 1 && ` · +${activities.length - 1} more`}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}
