import { apiClient } from '../lib/api-client';
import { ProjectIdeaResponse, ClarificationResponse, ValidationReportResponse } from '../types/ai';

export const ideaValidatorClient = {
  createIdea: async (rawInput: string, projectId?: string): Promise<ProjectIdeaResponse> => {
    const response = await apiClient.post('/ideas/', { 
      raw_input: rawInput,
      project_id: projectId 
    });
    return response.data;
  },

  submitAnswer: async (id: string, answer: string, history: { question: string, answer: string }[]): Promise<ClarificationResponse> => {
    const response = await apiClient.post(`/ideas/${id}/clarify`, { 
      answer,
      history 
    });
    return response.data;
  },

  getValidationReport: async (id: string): Promise<ValidationReportResponse> => {
    const response = await apiClient.get(`/ideas/${id}/validation`);
    return response.data;
  },

  startValidation: async (id: string, history: { question: string, answer: string }[]): Promise<any> => {
    const response = await apiClient.post(`/ideas/${id}/start-validation`, { 
      answer: '', // answer field not used here but required by schema
      history 
    });
    return response.data;
  },

  confirmIdea: async (id: string, refinedInput?: string): Promise<any> => {
    const response = await apiClient.post(`/ideas/${id}/confirm`, { answer: refinedInput });
    return response.data;
  },

  refineValidation: async (id: string, section: string, prompt: string): Promise<any> => {
    const response = await apiClient.post(`/ideas/${id}/refine`, { section, prompt });
    return response.data;
  },

  getAssets: async (id: string): Promise<any[]> => {
    const response = await apiClient.get(`/ideas/${id}/assets`);
    return response.data;
  },

  getAssetContent: async (assetId: string): Promise<string> => {
    const response = await apiClient.get(`/assets/${assetId}/content`);
    return response.data;
  },

  getDownloadUrl: async (assetId: string, format: string = 'pdf'): Promise<{ url: string }> => {
    const response = await apiClient.get(`/assets/${assetId}/download?format=${format}`);
    return response.data;
  },

  getDocQuestions: async (ideaId: string, docType: string): Promise<{ questions: string[] }> => {
    const response = await apiClient.get(`/assets/${ideaId}/docs/${docType}/questions`);
    return response.data;
  },

  generateDoc: async (ideaId: string, docType: string, answers?: Record<string, string>): Promise<any> => {
    const response = await apiClient.post(`/assets/${ideaId}/docs/${docType}/generate`, { answers });
    return response.data;
  }
};
