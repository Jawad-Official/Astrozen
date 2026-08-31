import logo from "@/assets/astrozen-logo.png";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  /** Pixel size of the mark itself. Defaults to the nav/footer size. */
  size?: number;
  /** Show the wordmark next to the icon. */
  withLabel?: boolean;
  className?: string;
}

/** The Astrozen icon (and optional wordmark), reused across the public pages. */
export function BrandMark({ size = 28, withLabel = true, className }: BrandMarkProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img
        src={logo}
        alt="Astrozen"
        width={size}
        height={size}
        className="shrink-0 rounded-lg"
        style={{ width: size, height: size }}
      />
      {withLabel && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Astrozen
        </span>
      )}
    </span>
  );
}
