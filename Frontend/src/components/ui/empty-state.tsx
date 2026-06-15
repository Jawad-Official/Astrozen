import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";
import { 
  FolderSimple, 
  CircleDashed, 
  MagnifyingGlass, 
  FileText,
  Users,
  CheckCircle,
  Warning,
  Rocket,
  Sparkle
} from "@phosphor-icons/react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  iconType?: "folder" | "issue" | "search" | "document" | "users" | "success" | "warning" | "rocket";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const iconMap = {
  folder: FolderSimple,
  issue: CircleDashed,
  search: MagnifyingGlass,
  document: FileText,
  users: Users,
  success: CheckCircle,
  warning: Warning,
  rocket: Rocket,
};

const sizeClasses = {
  sm: {
    container: "py-8",
    iconWrapper: "w-12 h-12",
    icon: "h-6 w-6",
    title: "text-base",
    description: "text-xs max-w-[240px]",
  },
  md: {
    container: "py-12",
    iconWrapper: "w-16 h-16",
    icon: "h-8 w-8",
    title: "text-lg",
    description: "text-sm max-w-[320px]",
  },
  lg: {
    container: "py-20",
    iconWrapper: "w-20 h-20",
    icon: "h-10 w-10",
    title: "text-xl",
    description: "text-sm max-w-[400px]",
  },
};

export function EmptyState({
  icon,
  iconType,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const IconComponent = iconType ? iconMap[iconType] : null;
  const sizeConfig = sizeClasses[size];

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", sizeConfig.container, className)}>
      <div className={cn(
        "rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-6 shadow-xl relative",
        sizeConfig.iconWrapper
      )}>
        <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-2xl opacity-50" />
        {icon || (IconComponent && <IconComponent className={cn(sizeConfig.icon, "text-muted-foreground/40 relative z-10")} weight="duotone" />)}
      </div>
      
      <h3 className={cn("font-semibold text-foreground mb-2", sizeConfig.title)}>
        {title}
      </h3>
      
      {description && (
        <p className={cn("text-muted-foreground/60 leading-relaxed mb-6", sizeConfig.description)}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={secondaryAction.onClick}
              className="text-muted-foreground/60 hover:text-foreground"
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              size="sm"
              onClick={action.onClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary mb-4" />
      <p className="text-sm text-muted-foreground/60">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this content.",
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-6">
        <Warning className="h-8 w-8 text-destructive/60" weight="duotone" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground/60 mb-6 max-w-[320px]">{message}</p>
      
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

interface SuccessStateProps {
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function SuccessState({
  title,
  message,
  action,
  className,
}: SuccessStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mb-6">
        <CheckCircle className="h-8 w-8 text-success" weight="fill" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {message && (
        <p className="text-sm text-muted-foreground/60 mb-6 max-w-[320px]">{message}</p>
      )}
      
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
