import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeatureWindow, FEATURE_STATUS_CONFIG, FEATURE_HEALTH_CONFIG, FEATURE_TYPE_CONFIG } from './FeatureWindow';

// Smoke tests for the FeatureWindow.tsx re-export shim (split into
// src/components/feature-window/ during Phase 5c). The split relied on a
// mechanical import-detection script that once silently dropped an entire
// import via a regex double-escaping bug (see AUDIT_REMEDIATION.md) -
// these tests exist so a similarly-dropped export fails loudly here
// instead of surfacing as a runtime crash at every call site.

describe('FeatureWindow namespace re-export', () => {
  it('exposes every sub-component callers rely on as FeatureWindow.X', () => {
    expect(FeatureWindow.PriorityIcon).toBeTypeOf('function');
    expect(FeatureWindow.StatusIcon).toBeTypeOf('function');
    expect(FeatureWindow.HealthIcon).toBeTypeOf('function');
    expect(FeatureWindow.Row).toBeTypeOf('function');
    expect(FeatureWindow.List).toBeTypeOf('function');
    expect(FeatureWindow.Detail).toBeTypeOf('function');
  });

  it('exposes the FEATURE_*_CONFIG constants used across the app', () => {
    expect(FEATURE_STATUS_CONFIG.discovery).toBeDefined();
    expect(FEATURE_HEALTH_CONFIG.on_track).toBeDefined();
    expect(FEATURE_TYPE_CONFIG.new_capability).toBeDefined();
  });
});

describe('FeatureWindow.PriorityIcon / StatusIcon / HealthIcon', () => {
  it('renders without throwing for every priority level', () => {
    for (const priority of ['urgent', 'high', 'medium', 'low', 'none']) {
      const { container } = render(<FeatureWindow.PriorityIcon priority={priority} />);
      expect(container.firstChild).toBeTruthy();
    }
  });

  it('renders without throwing for every health status', () => {
    for (const health of ['on_track', 'at_risk', 'off_track'] as const) {
      const { container } = render(<FeatureWindow.HealthIcon health={health} />);
      expect(container.firstChild).toBeTruthy();
    }
  });
});
