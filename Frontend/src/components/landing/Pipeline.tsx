import { motion, useReducedMotion } from "framer-motion";
import {
  ChatCircleDots,
  FileText,
  Kanban,
  Lightbulb,
  ShieldCheck,
} from "@phosphor-icons/react";

const STAGES = [
  {
    icon: Lightbulb,
    title: "Drop the idea",
    body: "One sentence is enough. No template, no forms to fill in first.",
  },
  {
    icon: ChatCircleDots,
    title: "Answer the gaps",
    body: "Astrozen asks only what it actually needs to know — up to seven targeted questions.",
  },
  {
    icon: ShieldCheck,
    title: "Get it validated",
    body: "Scored against six pillars before a single line of spec is written.",
  },
  {
    icon: FileText,
    title: "Generate the set",
    body: "Six linked documents plus blueprint diagrams, consistent with each other by construction.",
  },
  {
    icon: Kanban,
    title: "Build it",
    body: "Issues, projects, and teams live in the same workspace as the plan.",
  },
];

export function Pipeline() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="how-it-works"
      className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          The pipeline
        </p>
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Idea in. Buildable plan out.
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          Five stages, one continuous thread. Nothing gets re-typed between
          them.
        </p>
      </div>

      <div className="relative mt-16">
        {/* The rail the stages sit on - draws itself once in view. */}
        <motion.div
          aria-hidden="true"
          initial={reduceMotion ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute left-0 right-0 top-6 hidden h-px origin-left bg-gradient-to-r from-primary/60 via-primary/30 to-transparent lg:block"
        />

        <ol className="grid gap-10 lg:grid-cols-5 lg:gap-6">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <motion.li
                key={stage.title}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.09 }}
                className="relative"
              >
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-background shadow-[0_0_28px_-8px_hsl(var(--primary)/0.5)]">
                  <Icon className="h-5 w-5 text-primary" weight="duotone" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card font-mono text-[10px] text-muted-foreground">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-[15px] font-semibold text-foreground">
                  {stage.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {stage.body}
                </p>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
