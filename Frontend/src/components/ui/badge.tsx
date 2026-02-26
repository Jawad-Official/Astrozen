import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground",
        outline:
          "border border-input bg-transparent text-foreground",
        success:
          "bg-success/10 text-success border border-success/20",
        warning:
          "bg-warning/10 text-warning border border-warning/20",
        info:
          "bg-info/10 text-info border border-info/20",
        ghost:
          "bg-muted text-muted-foreground border border-border",
        surface:
          "bg-muted/50 text-muted-foreground/80 border border-border/50",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

function BadgeDot({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "h-1.5 w-1.5 rounded-full bg-current mr-1.5",
        className
      )}
      {...props}
    />
  );
}

export { Badge, BadgeDot, badgeVariants };
