import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { ScrollArea } from '../ui/scroll-area';
import { CircleNotch } from '@phosphor-icons/react';
import { ideaValidatorClient } from '@/services/idea-validator';
import ReactMarkdown from 'react-markdown';

interface DocPreviewModalProps {
  assetId: string | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DocPreviewModal: React.FC<DocPreviewModalProps> = ({ assetId, title, open, onOpenChange }) => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && assetId) {
      fetchContent();
    } else {
      setContent(null);
    }
  }, [open, assetId]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const data = await ideaValidatorClient.getAssetContent(assetId!);
      setContent(data);
    } catch (err) {
      console.error('Failed to fetch doc content:', err);
      setContent('Failed to load document content.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] bg-[#080808] border-white/[0.08] text-white flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.01]">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-primary/60">Preview:</span> {title}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <CircleNotch className="h-10 w-10 animate-spin text-primary" />
              <p className="text-white/40 text-sm font-medium">Retrieving architected content...</p>
            </div>
          ) : (
            <div className="prose prose-invert prose-zinc max-w-none prose-pre:bg-white/[0.03] prose-pre:border prose-pre:border-white/5">
              <ReactMarkdown>{content || ''}</ReactMarkdown>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
