import React from 'react';
import { ExternalLink, FileText, MoreVertical, RefreshCcw, Trash2, Upload, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentMeta } from '@/services/ai.service';
import { GoogleDocEmbed } from './GoogleDocEmbed';

interface DocumentCardProps {
  document: DocumentMeta;
  onChat: (docId: string) => void;
  onSync: (docId: string) => void;
  onDelete: (docId: string) => void;
  onUpload: (docId: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onChat,
  onSync,
  onDelete,
  onUpload
}) => {
  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base text-card-foreground">{document.title}</CardTitle>
            <CardDescription className="text-xs">
              Updated {new Date(document.updated_at).toLocaleString()}
            </CardDescription>
          </div>
        </div>
        
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => window.open(document.embed_url, '_blank', 'noopener,noreferrer')}
            aria-label="Open document"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => onChat(document.id)}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSync(document.id)}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Sync to R2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpload(document.id)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload .docx
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(document.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <GoogleDocEmbed 
          embedUrl={document.embed_url} 
          title={document.title} 
        />
      </CardContent>
    </Card>
  );
};
