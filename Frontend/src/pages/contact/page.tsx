import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowSquareOut,
  EnvelopeSimple,
  GithubLogo,
  Globe,
  LinkedinLogo,
} from "@phosphor-icons/react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { PixelGrid } from "@/components/landing/PixelGrid";

const CHANNELS = [
  {
    icon: EnvelopeSimple,
    label: "Email",
    value: "jawad.arman.official@gmail.com",
    href: "mailto:jawad.arman.official@gmail.com",
  },
  {
    icon: Globe,
    label: "Portfolio",
    value: "jawad-alarman.onrender.com",
    href: "https://jawad-alarman.onrender.com/",
  },
  {
    icon: GithubLogo,
    label: "GitHub",
    value: "github.com/Jawad-Official",
    href: "https://github.com/Jawad-Official",
  },
  {
    icon: LinkedinLogo,
    label: "LinkedIn",
    value: "linkedin.com/in/jawad-alarman",
    href: "https://www.linkedin.com/in/jawad-alarman/",
  },
] as const;

/**
 * Public "/contact" page - how to reach the person who built Astrozen.
 *
 * Dark-locked and reachable without a session for the same reason the
 * landing page is: this is a public, unauthenticated surface, and nothing
 * on it depends on the /me check resolving.
 */
export default function ContactPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="theme-dark min-h-screen bg-background text-foreground antialiased">
      <LandingNav />

      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
          <PixelGrid />
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.16),transparent_60%)]" />

        {/* pt-16 clears the fixed LandingNav - it has no static-flow height. */}
        <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-36">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Open source
            </p>
            <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Get in touch with the creator
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-pretty text-muted-foreground">
              Astrozen is an open source project built by Jawad Al Arman.
              Questions, bug reports, or just want to talk shop — reach out
              through any of these.
            </p>
          </motion.div>

          <ul className="mt-12 space-y-3">
            {CHANNELS.map((channel, index) => {
              const Icon = channel.icon;
              return (
                <motion.li
                  key={channel.label}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.07 }}
                >
                  <a
                    href={channel.href}
                    target={channel.href.startsWith("http") ? "_blank" : undefined}
                    rel={channel.href.startsWith("http") ? "noreferrer" : undefined}
                    className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card/40 px-5 py-4 backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-card/70"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {channel.label}
                      </span>
                      <span className="block truncate text-[15px] font-medium text-foreground">
                        {channel.value}
                      </span>
                    </span>
                    <ArrowSquareOut className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </a>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
