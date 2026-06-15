import React, { useState } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoogleDocEmbedProps {
  embedUrl: string;
  title: string;
  fallbackContent?: string;
}

export const GoogleDocEmbed: React.FC<GoogleDocEmbedProps> = ({ embedUrl, title, fallbackContent }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const canEmbed = Boolean(embedUrl);

  return (
    <div className="relative w-full h-[68vh] min-h-[560px] overflow-hidden rounded-b-lg border-t border-border bg-muted/30">
      {isLoading && !error && canEmbed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Loading document preview</p>
          <p className="mt-1 text-xs text-muted-foreground">The live Google Doc will appear here.</p>
        </div>
      )}

      {error || !canEmbed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive/60" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">Preview unavailable</h3>
          <p className="mb-6 max-w-sm text-sm leading-6 text-muted-foreground">
            There was an issue embedding the Google Doc. You might need to sign in or check permissions.
          </p>
          {fallbackContent && (
            <pre className="mb-6 max-h-64 w-full max-w-2xl overflow-auto rounded-lg border border-border bg-background p-4 text-left text-xs text-muted-foreground">
              {fallbackContent}
            </pre>
          )}
          {canEmbed && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => window.open(embedUrl, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open document
              </Button>
              <Button variant="ghost" onClick={() => { setError(false); setIsLoading(true); }}>
                Retry
              </Button>
            </div>
          )}
        </div>
      ) : (
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full border-none bg-background"
          onLoad={() => setIsLoading(false)}
          onError={() => setError(true)}
          allow="autoplay"
        />
      )}
    </div>
  );
};
