import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { aiService } from '@/services/ai.service';
import { ChangeProposal } from './ChangeProposal';
import { useAIStore } from '@/store/aiStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  proposal?: ChangeProposalData;
}

interface ChangeProposalData {
  action: string;
  find: string;
  replace: string;
}

interface AIDocChatPanelProps {
  docId: string;
  title: string;
  onClose: () => void;
}

export const AIDocChatPanel: React.FC<AIDocChatPanelProps> = ({
  docId,
  title,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hello! I'm here to help you with the ${title}. What would you like to change?` }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { applyChange } = useAIStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);

    try {
      const { data } = await aiService.chatDocumentStructured(docId, inputValue);
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.explanation,
        proposal: data.proposal
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptProposal = async (proposal: ChangeProposalData, msgIndex: number) => {
    await applyChange(docId, proposal.find, proposal.replace);
    setMessages(prev => prev.map((msg, i) => i === msgIndex ? { ...msg, proposal: undefined } : msg));
  };

  const handleRejectProposal = (msgIndex: number) => {
    setMessages(prev => prev.map((msg, i) => i === msgIndex ? { ...msg, proposal: undefined } : msg));
  };

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-background lg:w-[400px]">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-foreground">AI Document Assistant</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6 pb-4" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`mt-1 rounded-full p-1.5 ${msg.role === 'user' ? 'bg-primary' : 'border border-border bg-muted'}`}>
                {msg.role === 'user' ? <User className="h-3.5 w-3.5 text-primary-foreground" /> : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <div className="max-w-[85%] space-y-2">
                <div className={`text-sm p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'rounded-tr-none border border-primary/20 bg-primary/10 text-foreground' 
                    : 'rounded-tl-none border border-border bg-muted/50 text-foreground'
                }`}>
                  {msg.content}
                </div>
                
                {msg.proposal && (
                  <ChangeProposal 
                    find={msg.proposal.find}
                    replace={msg.proposal.replace}
                    onAccept={() => handleAcceptProposal(msg.proposal, i)}
                    onReject={() => handleRejectProposal(i)}
                  />
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="mt-1 rounded-full border border-border bg-muted p-1.5">
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="rounded-2xl rounded-tl-none border border-border bg-muted/50 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-muted/30 p-4">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Suggest a change..."
            className="h-10"
            disabled={isTyping}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || isTyping}
            className="h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
