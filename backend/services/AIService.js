const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = null;
    this.model = null;
    this.requestCount = 0;
    this.tokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0
    };
    
    // Rate limiting configuration
    this.rateLimitConfig = {
      maxRequestsPerMinute: 60,
      requestTimestamps: []
    };
    
    this.initialize();
  }

  initialize() {
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      console.log('Gemini AI service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini AI service:', error);
      throw new Error('AI service initialization failed');
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured() {
    return this.genAI !== null && this.model !== null;
  }

  /**
   * Rate limiting check
   */
  checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove timestamps older than 1 minute
    this.rateLimitConfig.requestTimestamps = this.rateLimitConfig.requestTimestamps
      .filter(timestamp => timestamp > oneMinuteAgo);
    
    // Check if we've exceeded the rate limit
    if (this.rateLimitConfig.requestTimestamps.length >= this.rateLimitConfig.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    // Add current timestamp
    this.rateLimitConfig.requestTimestamps.push(now);
  }

  /**
   * Estimate token usage and cost
   */
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Update token usage tracking
   */
  updateTokenUsage(inputText, outputText) {
    const inputTokens = this.estimateTokens(inputText);
    const outputTokens = this.estimateTokens(outputText);
    
    this.tokenUsage.inputTokens += inputTokens;
    this.tokenUsage.outputTokens += outputTokens;
    
    // Rough cost estimation (Gemini Pro pricing as of 2024)
    // Input: $0.00025 per 1K tokens, Output: $0.0005 per 1K tokens
    const inputCost = (inputTokens / 1000) * 0.00025;
    const outputCost = (outputTokens / 1000) * 0.0005;
    this.tokenUsage.totalCost += inputCost + outputCost;
    
    return {
      inputTokens,
      outputTokens,
      estimatedCost: inputCost + outputCost
    };
  }

  /**
   * Get current usage statistics
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      tokenUsage: { ...this.tokenUsage },
      rateLimitStatus: {
        requestsInLastMinute: this.rateLimitConfig.requestTimestamps.length,
        maxRequestsPerMinute: this.rateLimitConfig.maxRequestsPerMinute
      }
    };
  }

  /**
   * Generate project summary from tasks
   */
  async summarizeProject(projectData) {
    if (!this.isConfigured()) {
      throw new Error('AI service not properly configured');
    }

    this.checkRateLimit();

    try {
      const { project, tasks } = projectData;
      
      // Prepare context for AI
      const taskSummary = tasks.map(task => 
        `- ${task.title} (${task.status}): ${task.description || 'No description'}`
      ).join('\n');

      const prompt = `
Project Analysis Request:

Project Name: ${project.name}
Project Description: ${project.description || 'No description provided'}
Total Tasks: ${tasks.length}

Tasks Breakdown:
${taskSummary}

Task Status Distribution:
- To Do: ${tasks.filter(t => t.status === 'todo').length}
- In Progress: ${tasks.filter(t => t.status === 'inprogress').length}
- Done: ${tasks.filter(t => t.status === 'done').length}

Please provide a comprehensive project summary that includes:
1. Overall project progress and status
2. Key accomplishments and completed tasks
3. Current work in progress
4. Upcoming tasks and priorities
5. Any potential blockers or areas needing attention
6. Recommendations for next steps

Keep the summary concise but informative, suitable for a project manager or team lead.
      `.trim();

      this.requestCount++;
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      // Update usage tracking
      this.updateTokenUsage(prompt, summary);

      return {
        summary,
        metadata: {
          projectId: project._id,
          taskCount: tasks.length,
          generatedAt: new Date().toISOString(),
          tokenUsage: this.estimateTokens(prompt + summary)
        }
      };

    } catch (error) {
      console.error('Error generating project summary:', error);
      
      if (error.message.includes('Rate limit')) {
        throw error;
      }
      
      throw new Error('Failed to generate project summary. Please try again later.');
    }
  }

  /**
   * Answer questions about tasks and projects
   */
  async answerQuestion(questionData) {
    if (!this.isConfigured()) {
      throw new Error('AI service not properly configured');
    }

    this.checkRateLimit();

    try {
      const { question, context } = questionData;
      
      // Prepare context based on provided data
      let contextText = '';
      
      if (context.project) {
        contextText += `Project: ${context.project.name}\n`;
        contextText += `Description: ${context.project.description || 'No description'}\n\n`;
      }
      
      if (context.tasks && context.tasks.length > 0) {
        contextText += 'Related Tasks:\n';
        context.tasks.forEach((task, index) => {
          contextText += `${index + 1}. ${task.title} (${task.status})\n`;
          if (task.description) {
            contextText += `   Description: ${task.description}\n`;
          }
        });
        contextText += '\n';
      }

      const prompt = `
Context Information:
${contextText}

User Question: ${question}

Please provide a helpful and accurate answer based on the context provided. If the question cannot be answered with the available information, please indicate what additional information would be needed. Focus on being practical and actionable in your response.
      `.trim();

      this.requestCount++;
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const answer = response.text();

      // Update usage tracking
      this.updateTokenUsage(prompt, answer);

      return {
        answer,
        metadata: {
          question,
          contextType: context.project ? 'project' : 'general',
          taskCount: context.tasks ? context.tasks.length : 0,
          generatedAt: new Date().toISOString(),
          tokenUsage: this.estimateTokens(prompt + answer)
        }
      };

    } catch (error) {
      console.error('Error answering question:', error);
      
      if (error.message.includes('Rate limit')) {
        throw error;
      }
      
      throw new Error('Failed to process your question. Please try again later.');
    }
  }

  /**
   * Reset usage statistics (useful for testing or periodic resets)
   */
  resetUsageStats() {
    this.requestCount = 0;
    this.tokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0
    };
    this.rateLimitConfig.requestTimestamps = [];
  }
}

module.exports = AIService;