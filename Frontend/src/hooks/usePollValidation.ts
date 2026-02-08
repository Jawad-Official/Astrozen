import { useState, useEffect } from 'react';
import { ideaValidatorClient } from '../services/idea-validator';
import { ValidationReportResponse } from '../types/ai';

export const usePollValidation = (ideaId: string | null) => {
  const [report, setReport] = useState<ValidationReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ideaId) return;

    let intervalId: any;

    const poll = async () => {
      try {
        const data = await ideaValidatorClient.getValidationReport(ideaId);
        setReport(data);
        setIsLoading(false);
        clearInterval(intervalId);
      } catch (err: any) {
        if (err.response?.status === 202) {
          setIsLoading(true);
        } else {
          setError('Failed to fetch validation report');
          setIsLoading(false);
          clearInterval(intervalId);
        }
      }
    };

    intervalId = setInterval(poll, 3000);
    poll(); // Initial check

    return () => clearInterval(intervalId);
  }, [ideaId]);

  return { report, isLoading, error };
};
