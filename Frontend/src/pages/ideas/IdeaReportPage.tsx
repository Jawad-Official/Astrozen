import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePollValidation } from '../../hooks/usePollValidation';
import { ValidationReportView } from '../../components/ai/ValidationReportView';
import { ideaValidatorClient } from '../../services/idea-validator';

export default function IdeaReportPage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const { report, isLoading, error } = usePollValidation(ideaId || null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!ideaId) return;
    setIsConfirming(true);
    try {
      await ideaValidatorClient.confirmIdea(ideaId);
      // Navigate to project detail or asset view
      navigate(`/projects`); // For now, navigate back to projects
    } catch (err) {
      console.error('Failed to confirm idea:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl font-medium animate-pulse">Architecting your project...</p>
          <p className="text-muted-foreground text-sm">This usually takes about 30-60 seconds.</p>
        </div>
      ) : error ? (
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button className="mt-4 underline" onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : report ? (
        <ValidationReportView
          report={report}
          onConfirm={handleConfirm}
          isLoading={isConfirming}
        />
      ) : null}
    </div>
  );
}
