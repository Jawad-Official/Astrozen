import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';

interface IdeaInputFormProps {
  onSubmit: (idea: string) => void;
  isLoading: boolean;
}

export const IdeaInputForm: React.FC<IdeaInputFormProps> = ({ onSubmit, isLoading }) => {
  const [idea, setIdea] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      onSubmit(idea);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>What's your project idea?</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Textarea
            placeholder="Describe your idea in detail..."
            className="min-h-[200px]"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            disabled={isLoading}
          />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading || !idea.trim()}>
            {isLoading ? 'Starting...' : 'Validate Idea'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
