import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row sm:px-8">
        <BrandMark size={24} />

        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <Link to="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Log in
          </Link>
        </nav>

        <p className="font-mono text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} Astrozen
        </p>
      </div>
    </footer>
  );
}
