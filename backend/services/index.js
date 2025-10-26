const AIService = require('./AIService');

// Create singleton instance of AIService
const aiService = new AIService();

module.exports = {
  AIService,
  aiService
};