import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 ring-1 ring-primary/30">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold text-foreground">Astrozen</span>
        </div>

        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
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
