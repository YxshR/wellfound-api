const AIService = require('../../services/AIService');

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn()
      })
    }))
  };
});

describe('AIService', () => {
  let aiService;
  let mockModel;
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.GEMINI_API_KEY;
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalEnv;
  });

  beforeEach(() => {
    // Set up environment
    process.env.GEMINI_API_KEY = 'test-api-key';
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up the mock model
    mockModel = {
      generateContent: jest.fn()
    };
    
    // Mock the GoogleGenerativeAI constructor and getGenerativeModel
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue(mockModel)
    }));
    
    // Create new instance for each test
    aiService = new AIService();
  });

  afterEach(() => {
    if (aiService) {
      aiService.resetUsageStats();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid API key', () => {
      expect(aiService.isConfigured()).toBe(true);
    });

    test('should handle missing API key gracefully', () => {
      delete process.env.GEMINI_API_KEY;
      const serviceWithoutKey = new AIService();
      expect(serviceWithoutKey.isConfigured()).toBe(false);
    });

    test('should initialize with default usage stats', () => {
      const stats = aiService.getUsageStats();
      expect(stats.requestCount).toBe(0);
      expect(stats.tokenUsage.inputTokens).toBe(0);
      expect(stats.tokenUsage.outputTokens).toBe(0);
      expect(stats.tokenUsage.totalCost).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', () => {
      expect(() => aiService.checkRateLimit()).not.toThrow();
    });

    test('should throw error when rate limit exceeded', () => {
      // Simulate exceeding rate limit
      for (let i = 0; i < 60; i++) {
        aiService.rateLimitConfig.requestTimestamps.push(Date.now());
      }
      
      expect(() => aiService.checkRateLimit()).toThrow('Rate limit exceeded');
    });

    test('should clean up old timestamps', () => {
      const oldTimestamp = Date.now() - 70000; // 70 seconds ago
      aiService.rateLimitConfig.requestTimestamps.push(oldTimestamp);
      
      aiService.checkRateLimit();
      
      expect(aiService.rateLimitConfig.requestTimestamps).not.toContain(oldTimestamp);
    });
  });

  describe('Token Usage Tracking', () => {
    test('should estimate tokens correctly', () => {
      const text = 'This is a test string with about twenty characters';
      const tokens = aiService.estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    test('should update token usage stats', () => {
      const inputText = 'Input text';
      const outputText = 'Output text';
      
      const usage = aiService.updateTokenUsage(inputText, outputText);
      
      expect(usage.inputTokens).toBeGreaterThan(0);
      expect(usage.outputTokens).toBeGreaterThan(0);
      expect(usage.estimatedCost).toBeGreaterThan(0);
      
      const stats = aiService.getUsageStats();
      expect(stats.tokenUsage.inputTokens).toBe(usage.inputTokens);
      expect(stats.tokenUsage.outputTokens).toBe(usage.outputTokens);
    });
  });

  describe('Project Summarization', () => {
    const mockProjectData = {
      project: {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Project',
        description: 'A test project'
      },
      tasks: [
        {
          title: 'Task 1',
          description: 'First task',
          status: 'todo'
        },
        {
          title: 'Task 2',
          description: 'Second task',
          status: 'inprogress'
        },
        {
          title: 'Task 3',
          description: 'Third task',
          status: 'done'
        }
      ]
    };

    test('should generate project summary successfully', async () => {
      const mockResponse = {
        response: Promise.resolve({
          text: () => 'This is a mock project summary with progress analysis and recommendations.'
        })
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await aiService.summarizeProject(mockProjectData);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('projectId');
      expect(result.metadata).toHaveProperty('taskCount', 3);
      expect(result.metadata).toHaveProperty('generatedAt');
      expect(mockModel.generateContent).toHaveBeenCalledTimes(1);
    });

    test('should throw error when AI service not configured', async () => {
      delete process.env.GEMINI_API_KEY;
      const unconfiguredService = new AIService();

      await expect(unconfiguredService.summarizeProject(mockProjectData))
        .rejects.toThrow('AI service not properly configured');
    });

    test('should handle API errors gracefully', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('API Error'));

      await expect(aiService.summarizeProject(mockProjectData))
        .rejects.toThrow('Failed to generate project summary');
    });

    test('should increment request count', async () => {
      const mockResponse = {
        response: Promise.resolve({
          text: () => 'Mock summary'
        })
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);

      await aiService.summarizeProject(mockProjectData);

      const stats = aiService.getUsageStats();
      expect(stats.requestCount).toBe(1);
    });
  });

  describe('Question Answering', () => {
    const mockQuestionData = {
      question: 'What is the status of the project?',
      context: {
        project: {
          name: 'Test Project',
          description: 'A test project'
        },
        tasks: [
          {
            title: 'Task 1',
            description: 'First task',
            status: 'todo'
          }
        ]
      }
    };

    test('should answer questions successfully', async () => {
      const mockResponse = {
        response: Promise.resolve({
          text: () => 'This is a mock answer to the question about project status.'
        })
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await aiService.answerQuestion(mockQuestionData);

      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('question');
      expect(result.metadata).toHaveProperty('contextType');
      expect(result.metadata).toHaveProperty('taskCount', 1);
      expect(mockModel.generateContent).toHaveBeenCalledTimes(1);
    });

    test('should handle questions without project context', async () => {
      const questionWithoutProject = {
        question: 'General question',
        context: {
          tasks: []
        }
      };

      const mockResponse = {
        response: Promise.resolve({
          text: () => 'Mock answer'
        })
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await aiService.answerQuestion(questionWithoutProject);

      expect(result.metadata.contextType).toBe('general');
      expect(result.metadata.taskCount).toBe(0);
    });

    test('should throw error when AI service not configured', async () => {
      delete process.env.GEMINI_API_KEY;
      const unconfiguredService = new AIService();

      await expect(unconfiguredService.answerQuestion(mockQuestionData))
        .rejects.toThrow('AI service not properly configured');
    });

    test('should handle API errors gracefully', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('API Error'));

      await expect(aiService.answerQuestion(mockQuestionData))
        .rejects.toThrow('Failed to process your question');
    });
  });

  describe('Usage Statistics', () => {
    test('should return correct usage statistics', () => {
      const stats = aiService.getUsageStats();
      
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('tokenUsage');
      expect(stats).toHaveProperty('rateLimitStatus');
      expect(stats.tokenUsage).toHaveProperty('inputTokens');
      expect(stats.tokenUsage).toHaveProperty('outputTokens');
      expect(stats.tokenUsage).toHaveProperty('totalCost');
    });

    test('should reset usage statistics', () => {
      // Add some usage
      aiService.updateTokenUsage('input', 'output');
      aiService.requestCount = 5;
      
      aiService.resetUsageStats();
      
      const stats = aiService.getUsageStats();
      expect(stats.requestCount).toBe(0);
      expect(stats.tokenUsage.inputTokens).toBe(0);
      expect(stats.tokenUsage.outputTokens).toBe(0);
      expect(stats.tokenUsage.totalCost).toBe(0);
    });
  });
});