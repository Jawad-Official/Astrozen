import { motion, useReducedMotion } from "framer-motion";

/** The six pillars every idea is scored against (see the validation service). */
const PILLARS = [
  "Market Demand",
  "Technical Feasibility",
  "Business Model",
  "Competition",
  "User Experience",
  "Scalability",
];

const CENTER = 150;
const RADIUS = 120;
const RINGS = [0.25, 0.5, 0.75, 1];

/** Indicative shape only - not a real score, just the chart's resting state. */
const SAMPLE = [0.88, 0.72, 0.64, 0.58, 0.92, 0.7];

function vertex(index: number, scale: number) {
  const angle = (-90 + index * 60) * (Math.PI / 180);
  return {
    x: CENTER + RADIUS * scale * Math.cos(angle),
    y: CENTER + RADIUS * scale * Math.sin(angle),
  };
}

function polygonPoints(scale: number | number[]) {
  return PILLARS.map((_, index) => {
    const value = Array.isArray(scale) ? scale[index] : scale;
    const { x, y } = vertex(index, value);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function Pillars() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="pillars"
      className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Validation
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Six pillars, before you write any code
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Astrozen pressure-tests the idea across every dimension that
            usually kills a product late — and tells you which one is weak
            while changing course is still cheap.
          </p>

          <ul className="mt-9 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
            {PILLARS.map((pillar, index) => (
              <motion.li
                key={pillar}
                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="flex items-center gap-2.5 text-sm text-foreground"
              >
                <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                {pillar}
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.16),transparent_65%)]"
          />
          <svg
            viewBox="0 0 300 300"
            className="h-auto w-full"
            role="img"
            aria-label="Radar chart illustrating the six validation pillars"
          >
            {/* Concentric lattice rings. */}
            {RINGS.map((ring, index) => (
              <motion.polygon
                key={ring}
                points={polygonPoints(ring)}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeOpacity={0.16}
                strokeWidth={1}
                initial={reduceMotion ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              />
            ))}

            {/* Axes out to each pillar. */}
            {PILLARS.map((pillar, index) => {
              const { x, y } = vertex(index, 1);
              return (
                <motion.line
                  key={pillar}
                  x1={CENTER}
                  y1={CENTER}
                  x2={x}
                  y2={y}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                />
              );
            })}

            {/* The scored shape. */}
            <motion.polygon
              points={polygonPoints(SAMPLE)}
              fill="hsl(var(--primary))"
              fillOpacity={0.18}
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
              style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
            />

            {/* Vertex nodes. */}
            {PILLARS.map((pillar, index) => {
              const { x, y } = vertex(index, SAMPLE[index]);
              return (
                <motion.circle
                  key={pillar}
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill="hsl(var(--primary))"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.9 + index * 0.05 }}
                />
              );
            })}
          </svg>
          <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground/70">
            Illustrative — your score is generated per idea
          </p>
        </div>
      </div>
    </section>
  );
}
