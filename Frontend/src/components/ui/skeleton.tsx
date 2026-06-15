import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const skeletonVariants = cva(
  "shimmer rounded-md",
  {
    variants: {
      variant: {
        default: "bg-muted/50",
        subtle: "bg-muted/30",
        strong: "bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant }), "animate-pulse", className)}
      {...props}
    />
  );
}

function SkeletonText({ className, lines = 3, ...props }: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && "w-4/5")}
        />
      ))}
    </div>
  );
}

function SkeletonAvatar({ className, size = "md", ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };
  
  return (
    <Skeleton
      className={cn(sizeClasses[size], "rounded-full", className)}
      {...props}
    />
  );
}

function SkeletonButton({ className, size = "md", ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-20",
    md: "h-10 w-24",
    lg: "h-12 w-32",
  };
  
  return (
    <Skeleton
      className={cn(sizeClasses[size], "rounded-lg", className)}
      {...props}
    />
  );
}

function SkeletonInput({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("h-10 w-full rounded-lg", className)}
      {...props}
    />
  );
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-border p-4 space-y-3", className)} {...props}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function SkeletonIssueRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b border-border/50",
        className
      )}
      {...props}
    >
      <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
      <Skeleton className="h-4 w-16 shrink-0" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
      <Skeleton className="h-6 w-6 rounded-full shrink-0" />
    </div>
  );
}

function SkeletonList({ className, count = 5, ...props }: React.HTMLAttributes<HTMLDivElement> & { count?: number }) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonIssueRow key={i} />
      ))}
    </div>
  );
}

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonButton, 
  SkeletonInput, 
  SkeletonCard,
  SkeletonIssueRow,
  SkeletonList 
};
