import api from './index';

// AI API functions
export const aiAPI = {
  // Generate project summary
  generateSummary: async (projectId, forceRefresh = false) => {
    const response = await api.post('/ai/summary', { 
      projectId, 
      forceRefresh 
    });
    return response.data;
  },

  // Ask question about project/tasks
  askQuestion: async (question, context) => {
    const requestData = {
      question,
      projectId: context.projectId,
      includeAllTasks: true // Include all tasks for better context
    };

    const response = await api.post('/ai/question', requestData);
    return response.data;
  },

  // Get AI usage statistics
  getUsageStats: async () => {
    const response = await api.get('/ai/usage');
    return response.data;
  },

  // Clear AI response cache
  clearCache: async () => {
    const response = await api.delete('/ai/cache');
    return response.data;
  },

  // Reset usage statistics
  resetUsage: async () => {
    const response = await api.post('/ai/reset-usage');
    return response.data;
  },
};