import { create } from 'zustand';

/**
 * Tracks AI requests that are in flight anywhere in the app, so a single
 * global indicator can show that something is "cooking" - even after the
 * user leaves the screen that started it. The request itself keeps running
 * (axios isn't cancelled on unmount) and the backend saves the result, so
 * returning to the screen shows it.
 */
export interface AIActivity {
  id: number;
  label: string;
  startedAt: number;
}

interface AIActivityState {
  activities: AIActivity[];
  start: (label: string) => number;
  finish: (id: number) => void;
}

let nextId = 1;

export const useAIActivityStore = create<AIActivityState>((set) => ({
  activities: [],
  start: (label) => {
    const id = nextId++;
    set((state) => ({ activities: [...state.activities, { id, label, startedAt: Date.now() }] }));
    return id;
  },
  finish: (id) => set((state) => ({ activities: state.activities.filter((a) => a.id !== id) })),
}));

/** Run an AI request while it shows in the global activity indicator. */
export async function trackAI<T>(label: string, run: () => Promise<T>): Promise<T> {
  const { start, finish } = useAIActivityStore.getState();
  const id = start(label);
  try {
    return await run();
  } finally {
    finish(id);
  }
}
