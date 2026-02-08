import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IdeaInputForm } from '../../components/ai/IdeaInputForm';
import { ChatInterface } from '../../components/ai/ChatInterface';
import { ideaValidatorClient } from '../../services/idea-validator';
import { useAuth } from '@/context/AuthContext';

export default function NewIdeaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'clarify'>('input');
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState('Could you tell me more about the core problem this project solves?');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not logged in (handled by RequireAuth component usually, but we check here too)
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleIdeaSubmit = async (idea: string) => {
    setIsLoading(true);
    try {
      const response = await ideaValidatorClient.createIdea(idea);
      setIdeaId(response.id);
      setStep('clarify');
      // In a real app, the first question would come from AI
    } catch (error) {
      console.error('Failed to create idea:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (answer: string) => {
    if (!ideaId) return;
    setIsLoading(true);
    try {
      const response = await ideaValidatorClient.submitAnswer(ideaId, answer);
      if (response.is_complete) {
        navigate(`/ideas/${ideaId}/report`);
      } else if (response.next_question) {
        setCurrentQuestion(response.next_question);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">AI Project Architect</h1>
      {step === 'input' ? (
        <IdeaInputForm onSubmit={handleIdeaSubmit} isLoading={isLoading} />
      ) : (
        <ChatInterface
          initialQuestion={currentQuestion}
          onAnswer={handleAnswerSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
