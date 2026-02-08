import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { ideaValidatorClient } from '@/services/idea-validator';
import { CircleNotch, CheckCircle, Sparkle, ChatCircleText, LockSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const DOC_TYPES = [
  "PRD", "APP_FLOW", "TECH_STACK", "FRONTEND_GUIDE", "BACKEND_SCHEMA", "IMPLEMENTATION_PLAN"
];

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
}

interface DocGenerationWizardProps {
  ideaId: string;
  onComplete: () => void;
}

export const DocGenerationWizard: React.FC<DocGenerationWizardProps> = ({ ideaId, onComplete }) => {
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'chatting' | 'generating' | 'done'>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [questionsCount, setQuestionsCount] = useState(0);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  const currentDocType = DOC_TYPES[currentDocIndex];
  const totalProgress = Math.round((currentDocIndex / DOC_TYPES.length) * 100);

  useEffect(() => {
    startDocSession();
  }, [currentDocIndex]);

  const startDocSession = () => {
    setStatus('chatting');
    setMessages([{ 
      role: 'ai', 
      content: `I'm ready to architect the ${currentDocType.replace('_', ' ')}. Do you have specific requirements, or should I suggest the best approach?` 
    }]);
    setQuestionsCount(0);
  };

  const handleSendMessage = async (userMsg?: string) => {
    const msg = userMsg || input;
    if (!msg.trim()) return;

    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setInput('');
    const newCount = questionsCount + 1;
    setQuestionsCount(newCount);

    if (newCount >= 10) { // Max 10 turns
      generateDoc();
      return;
    }

    try {
      // Simulate/Call AI next question for doc
      const response = await ideaValidatorClient.getDocQuestions(ideaId, currentDocType);
      setMessages([...newMessages, { role: 'ai', content: response.questions[0] || "I have enough info. Should I generate?" }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'ai', content: "Got it. Anything else, or should I generate now?" }]);
    }
  };

  const generateDoc = async (useAiSuggestions: boolean = false) => {
    setStatus('generating');
    if (useAiSuggestions) setIsAiSuggesting(true);
    
    try {
      await ideaValidatorClient.generateDoc(ideaId, currentDocType, {
        history: messages,
        use_ai_defaults: useAiSuggestions
      });
      
      const isComplete = await pollDocStatus(currentDocType);
      if (isComplete) {
        if (currentDocIndex < DOC_TYPES.length - 1) {
          setCurrentDocIndex(prev => prev + 1);
        } else {
          setStatus('done');
          setTimeout(onComplete, 2000);
        }
      }
    } catch (err) {
      setStatus('chatting');
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const pollDocStatus = async (type: string) => {
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const assets = await ideaValidatorClient.getAssets(ideaId);
      if (assets.find(a => a.asset_type === type && a.generation_status === 'complete')) return true;
    }
    return false;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Levels Header */}
      <div className="flex gap-2 justify-center mb-8">
        {DOC_TYPES.map((type, i) => (
          <div key={type} className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
              i === currentDocIndex ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20" :
              i < currentDocIndex ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
              "bg-white/5 border-white/10 text-white/20"
            )}>
              {i < currentDocIndex ? <CheckCircle weight="fill" /> : i + 1}
            </div>
            {i < DOC_TYPES.length - 1 && <div className="w-4 h-[1px] bg-white/10" />}
          </div>
        ))}
      </div>

      <Card className="bg-[#0c0c0c] border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/[0.01]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ChatCircleText weight="duotone" className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Generating: {currentDocType.replace('_', ' ')}</CardTitle>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Chat Session • Step {currentDocIndex + 1} of 6</p>
              </div>
            </div>
            <Badge variant="outline" className="h-6 gap-1.5 text-[10px] font-bold border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {10 - questionsCount} Questions Left
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 h-[400px] flex flex-col">
          {status === 'generating' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#080808]">
              <CircleNotch className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-bold text-white">Architecting {currentDocType}...</p>
                <p className="text-[11px] text-white/40 italic mt-1">
                  {isAiSuggesting ? "AI is applying best technical practices..." : "Applying your preferences to the documentation..."}
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                      m.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white/5 text-white/80 rounded-tl-none border border-white/5"
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>

        <CardFooter className="p-4 border-t border-white/5 bg-white/[0.01] gap-3">
          <Input 
            placeholder="Specify something or ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="bg-white/5 border-white/10 h-11 text-sm"
            disabled={status === 'generating'}
          />
          <Button 
            variant="glass-primary" 
            className="h-11 px-6 font-bold"
            onClick={() => handleSendMessage()}
            disabled={status === 'generating' || !input.trim()}
          >
            Send
          </Button>
          <Button 
            variant="glass" 
            className="h-11 px-6 gap-2 text-primary font-bold border-primary/20"
            onClick={() => generateDoc(true)}
            disabled={status === 'generating'}
          >
            <Sparkle weight="fill" /> AI Suggest
          </Button>
        </CardFooter>
      </Card>

      <div className="flex justify-between items-center px-2">
        <p className="text-[11px] text-white/20 italic font-medium flex items-center gap-2">
          <LockSimple /> Next: {DOC_TYPES[currentDocIndex + 1]?.replace('_', ' ') || "Finish"}
        </p>
        <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">{totalProgress}% Total Progress</p>
      </div>
    </div>
  );
};