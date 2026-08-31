import { CallToAction } from "@/components/landing/CallToAction";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Pillars } from "@/components/landing/Pillars";
import { Pipeline } from "@/components/landing/Pipeline";

/**
 * Public marketing page at "/".
 *
 * Art-directed dark regardless of the visitor's app theme: the whole
 * treatment is built on the near-black ground and the primary glow, and a
 * first-time visitor has no stored preference to honour anyway. The
 * `theme-dark` class re-declares the theme tokens for this subtree only
 * (see index.css), so a signed-in user on the light theme still gets the
 * intended landing page without their preference being touched.
 *
 * Nothing here waits on the session check - see LandingNav for why that
 * matters on a cold-starting free-tier backend.
 */
export default function LandingPage() {
  return (
    <div className="theme-dark min-h-screen bg-background text-foreground antialiased">
      <LandingNav />
      <main>
        <Hero />
        <Pipeline />
        <Pillars />
        <Features />
        <CallToAction />
      </main>
      <LandingFooter />
    </div>
  );
}
