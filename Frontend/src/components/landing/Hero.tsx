import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PixelGrid } from "./PixelGrid";

/**
 * The documents Astrozen actually generates, in generation order.
 *
 * Kept short on purpose: this line is set at text-7xl on desktop and can't
 * wrap (it would reflow mid-keystroke), so a long phrase overflows a phone
 * viewport and gets clipped by the hero's overflow-hidden. "a build plan"
 * stands in for IMPLEMENTATION_PLAN for that reason.
 */
const ARTIFACTS = [
  "a PRD.",
  "an app flow.",
  "a tech stack.",
  "a backend schema.",
  "a build plan.",
];

const TYPE_MS = 55;
const DELETE_MS = 28;
const HOLD_MS = 1600;

/** Types one phrase at a time, deletes it, moves to the next, forever. */
function useTypewriter(phrases: string[], enabled: boolean) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const phrase = phrases[index % phrases.length];

    if (!deleting && text === phrase) {
      const hold = setTimeout(() => setDeleting(true), HOLD_MS);
      return () => clearTimeout(hold);
    }

    if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % phrases.length);
      return;
    }

    const tick = setTimeout(
      () => {
        setText((current) =>
          deleting
            ? phrase.slice(0, current.length - 1)
            : phrase.slice(0, current.length + 1)
        );
      },
      deleting ? DELETE_MS : TYPE_MS
    );
    return () => clearTimeout(tick);
  }, [text, deleting, index, phrases, enabled]);

  return enabled ? text : phrases[0];
}

export function Hero() {
  const reduceMotion = useReducedMotion();
  const typed = useTypewriter(ARTIFACTS, !reduceMotion);

  return (
    <section className="relative isolate overflow-hidden">
      {/* Animated lattice + a green wash that fades the grid into the page. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <PixelGrid />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background" />

      <div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col items-center justify-center px-5 py-28 text-center sm:px-8">
        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="max-w-4xl text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
        >
          Turn a raw idea into{" "}
          {/* Own line with a reserved height: the phrase changes length every
              few seconds, and letting it share a line would shunt the words
              before it around on every keystroke. */}
          <span className="relative block min-h-[1.15em] whitespace-nowrap text-primary">
            {typed}
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-[0.1em] bg-primary align-middle motion-safe:animate-pulse"
            />
          </span>
        </motion.h1>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Astrozen interrogates your idea, validates it against six pillars, and
          generates the full specification set — then tracks the build in the
          same workspace. Planning and shipping stop living in different tools.
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button asChild size="lg" className="group h-12 px-7 text-[15px]">
            <Link to="/register">
              Start building free
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 border-border/70 bg-background/40 px-7 text-[15px] backdrop-blur"
          >
            <Link to="/login">Log in</Link>
          </Button>
        </motion.div>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mt-5 font-mono text-xs text-muted-foreground/70"
        >
          No credit card required — free tier included
        </motion.p>
      </div>
    </section>
  );
}
