import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  illustration?: ReactNode;
}

export function AuthLayout({ children, title, description, illustration }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Content */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 xl:p-24 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10" />
        
        <div className="w-full max-w-sm space-y-8 relative z-10">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
            <CardContent className="pt-6">
              {children}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-muted/30 border-l border-border relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-background via-muted/50 to-muted/80" />
        <div className="relative z-10 p-12">
          {illustration || (
            <div className="space-y-6 max-w-md">
              <div className="h-64 w-full bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center">
                <span className="text-6xl">✨</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Streamline your workflow</h3>
                <p className="text-muted-foreground">
                  Plan, track, and build your next big thing with a tool designed for speed and efficiency.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
