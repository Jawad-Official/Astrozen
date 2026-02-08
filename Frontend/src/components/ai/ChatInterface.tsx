import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

interface Message {
  role: 'ai' | 'user';
  content: string;
}

interface ChatInterfaceProps {
  initialQuestion: string;
  onAnswer: (answer: string) => void;
  isLoading: boolean;
  currentIndex?: number;
  totalQuestions?: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  initialQuestion,
  onAnswer,
  isLoading,
  currentIndex = 0,
  totalQuestions = 7
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: initialQuestion }
  ]);
  const [input, setInput] = useState('');

  const questionsLeft = Math.max(0, totalQuestions - currentIndex);
  const progress = Math.min(100, Math.round((currentIndex / totalQuestions) * 100));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const userMessage = input.trim();
      setMessages([...messages, { role: 'user', content: userMessage }]);
      setInput('');
      onAnswer(userMessage);
    }
  };

  // Note: In a real app, you'd update messages when the parent provides a new question
  React.useEffect(() => {
    if (initialQuestion && messages[messages.length - 1].content !== initialQuestion) {
        setMessages(prev => [...prev, { role: 'ai', content: initialQuestion }]);
    }
  }, [initialQuestion]);

  return (
    <Card className="w-full max-w-2xl mx-auto h-[550px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-2">
              Discovery Phase 
              <Badge variant="outline" className="text-[10px] py-0 h-4">{questionsLeft} questions left</Badge>
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-2">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2 animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input
            placeholder="Type your answer..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};