import { useEffect, useRef } from "react";

/**
 * Animated pixel-grid backdrop for the landing page.
 *
 * A single canvas draws a faint blueprint grid, then lights individual
 * cells that decay back to nothing - random ignitions give the surface a
 * constant low-level shimmer, and the pointer lights a soft radius around
 * itself so the page feels alive under the cursor.
 *
 * Cell intensities live in one Float32Array rather than per-cell objects:
 * a 1440p viewport is ~2.5k cells and this runs every frame, so the flat
 * buffer keeps the loop allocation-free.
 *
 * The loop parks itself whenever it isn't worth running - offscreen, on a
 * hidden tab, or when the visitor asked for reduced motion (which draws
 * the static grid exactly once).
 */

const CELL_SIZE = 28;
const DECAY_PER_FRAME = 0.94;
const IGNITIONS_PER_FRAME = 1.4;
const POINTER_RADIUS_CELLS = 3;
const DEFAULT_PRIMARY = "142 76% 36%";

interface PixelGridProps {
  /** Opacity of the whole layer. Lower it behind dense content. */
  className?: string;
}

export function PixelGrid({ className }: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Read the theme's primary hue instead of hardcoding it, so the grid
    // keeps matching the design system if those tokens are ever retuned.
    const primary =
      getComputedStyle(canvas).getPropertyValue("--primary").trim() ||
      DEFAULT_PRIMARY;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let cols = 0;
    let rows = 0;
    let intensities = new Float32Array(0);
    let running = false;
    let visible = true;

    const pointer = { x: -1, y: -1, active: false };

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / CELL_SIZE) + 1;
      rows = Math.ceil(height / CELL_SIZE) + 1;
      intensities = new Float32Array(cols * rows);

      draw();
    }

    function draw() {
      if (!canvas || !ctx) return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      // Static blueprint lattice - one path, stroked once.
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const x = c * CELL_SIZE + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * CELL_SIZE + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.strokeStyle = `hsl(${primary} / 0.07)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Lit cells.
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const value = intensities[r * cols + c];
          if (value < 0.02) continue;
          ctx.fillStyle = `hsl(${primary} / ${value * 0.45})`;
          ctx.fillRect(
            c * CELL_SIZE + 1,
            r * CELL_SIZE + 1,
            CELL_SIZE - 1,
            CELL_SIZE - 1
          );
        }
      }
    }

    function step() {
      if (!running) return;

      for (let i = 0; i < intensities.length; i++) {
        if (intensities[i] > 0.001) intensities[i] *= DECAY_PER_FRAME;
      }

      // Fractional rate: carry the remainder so 1.4/frame really averages 1.4.
      let ignitions = Math.floor(IGNITIONS_PER_FRAME);
      if (Math.random() < IGNITIONS_PER_FRAME % 1) ignitions++;
      for (let i = 0; i < ignitions; i++) {
        const index = Math.floor(Math.random() * intensities.length);
        intensities[index] = 1;
      }

      if (pointer.active) {
        const pc = Math.floor(pointer.x / CELL_SIZE);
        const pr = Math.floor(pointer.y / CELL_SIZE);
        for (let dr = -POINTER_RADIUS_CELLS; dr <= POINTER_RADIUS_CELLS; dr++) {
          for (
            let dc = -POINTER_RADIUS_CELLS;
            dc <= POINTER_RADIUS_CELLS;
            dc++
          ) {
            const r = pr + dr;
            const c = pc + dc;
            if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
            const distance = Math.hypot(dr, dc);
            if (distance > POINTER_RADIUS_CELLS) continue;
            const falloff = 1 - distance / POINTER_RADIUS_CELLS;
            const index = r * cols + c;
            intensities[index] = Math.max(intensities[index], falloff * 0.85);
          }
        }
      }

      draw();
      raf = requestAnimationFrame(step);
    }

    let raf = 0;

    function start() {
      if (running || prefersReducedMotion || !visible) return;
      running = true;
      raf = requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active =
        pointer.x >= 0 &&
        pointer.y >= 0 &&
        pointer.x <= rect.width &&
        pointer.y <= rect.height;
    }

    function handlePointerLeave() {
      pointer.active = false;
    }

    function handleVisibility() {
      if (document.hidden) stop();
      else start();
    }

    resize();

    // Only animate while the canvas is actually on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 }
    );
    observer.observe(canvas);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
