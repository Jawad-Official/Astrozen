import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PixelGrid } from "./PixelGrid";

export function CallToAction() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative mx-auto w-full max-w-6xl px-5 pb-28 sm:px-8">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="relative isolate overflow-hidden rounded-3xl border border-primary/25 bg-card/40 px-6 py-16 text-center backdrop-blur-sm sm:px-16 sm:py-20"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <PixelGrid />
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.16),transparent_70%)]" />

        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          Your next idea deserves a real plan
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground">
          Start with one sentence. Leave with a validated specification set and
          a workspace to build it in.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="group h-12 px-7 text-[15px]">
            <Link to="/register">
              Create your account
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 border-border/70 bg-background/40 px-7 text-[15px] backdrop-blur"
          >
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
