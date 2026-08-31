import { motion, useReducedMotion } from "framer-motion";
import {
  Broadcast,
  ChartLineUp,
  FlowArrow,
  Graph,
  Stack,
  UsersThree,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** The six documents Astrozen generates, shown as a stacked manifest. */
const DOCUMENTS = [
  "PRD.md",
  "APP_FLOW.md",
  "TECH_STACK.md",
  "FRONTEND_GUIDELINES.md",
  "BACKEND_SCHEMA.md",
  "IMPLEMENTATION_PLAN.md",
];

const FEATURES = [
  {
    icon: FlowArrow,
    title: "Blueprint diagrams",
    body: "User flows and architecture rendered as real diagrams, generated alongside the docs — not sketched afterwards.",
  },
  {
    icon: Graph,
    title: "Linked, not loose",
    body: "Every document is generated with the others in context, so the schema matches the flow and the plan matches both.",
  },
  {
    icon: Stack,
    title: "Regenerate a section",
    body: "Changed your mind about pricing? Rewrite that section alone instead of starting the document over.",
  },
  {
    icon: UsersThree,
    title: "Teams and triage",
    body: "Organizations, teams, and a triage inbox — the coordination layer is already here, not a roadmap promise.",
  },
  {
    icon: ChartLineUp,
    title: "Insights",
    body: "See where work actually is across projects, issues, and features, without assembling a report by hand.",
  },
  {
    icon: Broadcast,
    title: "Notifications that land",
    body: "Assignment, mention, and status changes reach the right person in their inbox instead of a firehose.",
  },
];

/** Card surface with a blueprint lattice that lights up under the pointer. */
function GridCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/70 bg-card/40 p-6 backdrop-blur-sm transition-all duration-300",
        "hover:border-primary/40 hover:bg-card/70",
        className
      )}
    >
      {/* Lattice: faint at rest, brighter on hover. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.25] transition-opacity duration-300 group-hover:opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)/0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.12) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, black 20%, transparent 75%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Features() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="features"
      className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          What you get
        </p>
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          A specification set, not a chat transcript
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          Six documents that agree with each other, and the workspace to build
          what they describe.
        </p>
      </div>

      <div className="mt-16 grid gap-5 lg:grid-cols-3">
        {/* Manifest card - the six generated documents. */}
        <GridCard className="lg:col-span-1 lg:row-span-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Generated set
          </p>
          <ul className="mt-5 space-y-2.5">
            {DOCUMENTS.map((doc, index) => (
              <motion.li
                key={doc}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: index * 0.07 }}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2.5"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                <span className="font-mono text-[13px] text-foreground">
                  {doc}
                </span>
              </motion.li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Written in one pass with shared context, so they describe the same
            product.
          </p>
        </GridCard>

        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
            >
              <GridCard className="h-full">
                <Icon
                  className="h-6 w-6 text-primary"
                  weight="duotone"
                />
                <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </GridCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
