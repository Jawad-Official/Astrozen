import { afterEach, describe, it, expect } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { AIActivityIndicator } from './AIActivityIndicator';
import { trackAI, useAIActivityStore } from '@/store/aiActivityStore';

afterEach(() => {
  cleanup();
  useAIActivityStore.setState({ activities: [] });
});

describe('AIActivityIndicator', () => {
  it('shows while an AI request runs and hides when it settles', async () => {
    render(<AIActivityIndicator />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    let resolve!: (v: string) => void;
    let pending!: Promise<string>;
    act(() => {
      pending = trackAI('Writing App Flow', () => new Promise<string>((r) => { resolve = r; }));
    });

    expect(await screen.findByText('Writing App Flow')).toBeInTheDocument();

    await act(async () => {
      resolve('done');
      await pending;
    });
    expect(useAIActivityStore.getState().activities).toHaveLength(0);
  });

  it('clears the activity even when the request fails', async () => {
    await expect(trackAI('Failing', () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(useAIActivityStore.getState().activities).toHaveLength(0);
  });
});
