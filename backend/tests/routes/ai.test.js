const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, connectDB } = require('../../server');
const Project = require('../../models/Project');
const Task = require('../../models/Task');
const { aiService } = require('../../services');

// Mock the AI service
jest.mock('../../services', () => ({
  aiService: {
    isConfigured: jest.fn(),
    summarizeProject: jest.fn(),
    answerQuestion: jest.fn(),
    getUsageStats: jest.fn(),
    resetUsageStats: jest.fn()
  }
}));

describe('AI Routes', () => {
  let mongoServer;
  let testProject;
  let testTasks;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_TEST_URI = mongoUri;
    
    // Connect to test database
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database
    await Project.deleteMany({});
    await Task.deleteMany({});
    
    // Create test project
    testProject = await Project.create({
      name: 'Test Project',
      description: 'A test project for AI integration'
    });

    // Create test tasks
    testTasks = await Task.create([
      {
        projectId: testProject._id,
        title: 'Task 1',
        description: 'First test task',
        status: 'todo'
      },
      {
        projectId: testProject._id,
        title: 'Task 2',
        description: 'Second test task',
        status: 'inprogress'
      },
      {
        projectId: testProject._id,
        title: 'Task 3',
        description: 'Third test task',
        status: 'done'
      }
    ]);

    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    aiService.isConfigured.mockReturnValue(true);
    aiService.getUsageStats.mockReturnValue({
      requestCount: 1,
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 50,
        totalCost: 0.001
      },
      rateLimitStatus: {
        requestsInLastMinute: 1,
        maxRequestsPerMinute: 60
      }
    });
  });

  describe('POST /api/ai/summary', () => {
    test('should generate project summary successfully', async () => {
      const mockSummary = {
        summary: 'This is a comprehensive project summary showing good progress.',
        metadata: {
          projectId: testProject._id,
          taskCount: 3,
          generatedAt: new Date().toISOString(),
          tokenUsage: 150
        }
      };

      aiService.summarizeProject.mockResolvedValue(mockSummary);

      const response = await request(app)
        .post('/api/ai/summary')
        .send({ projectId: testProject._id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBe(mockSummary.summary);
      expect(response.body.data.metadata.taskCount).toBe(3);
      expect(response.body.data.cached).toBe(false);
      expect(response.body.data.usageStats).toBeDefined();
      
      expect(aiService.summarizeProject).toHaveBeenCalledWith({
        project: expect.objectContaining({
          name: testProject.name,
          description: testProject.description
        }),
        tasks: expect.arrayContaining([
          expect.objectContaining({ title: 'Task 1' }),
          expect.objectContaining({ title: 'Task 2' }),
          expect.objectContaining({ title: 'Task 3' })
        ])
      });
    });

    test('should return cached response on second request', async () => {
      const mockSummary = {
        summary: 'Cached summary',
        metadata: {
          projectId: testProject._id,
          taskCount: 3,
          generatedAt: new Date().toISOString(),
          tokenUsage: 150
        }
      };

      aiService.summarizeProject.mockResolvedValue(mockSummary);

      // First request
      await request(app)
        .post('/api/ai/summary')
        .send({ projectId: testProject._id })
        .expect(200);

      // Second request should use cache
      const response = await request(app)
        .post('/api/ai/summary')
        .send({ projectId: testProject._id })
        .expect(200);

      expect(response.body.data.cached).toBe(true);
      expect(response.body.data.cacheAge).toBeDefined();
      expect(aiService.summarizeProject).toHaveBeenCalledTimes(1);
    });

    test('should force refresh when requested', async () => {
      const mockSummary = {
        summary: 'Fresh summary',
        metadata: {
          projectId: testProject._id,
          taskCount: 3,
          generatedAt: new Date().toISOString(),
          tokenUsage: 150
        }
      };

      aiService.summarizeProject.mockResolvedValue(mockSummary);

      // First request
      await request(app)
        .post('/api/ai/summary')
        .send({ projectId: testProject._id })
        .expect(200);

      // Second request with force refresh
      const response = await request(app)
        .post('/api/ai/summary')
        .send({ 
          projectId: testProject._id,
          forceRefresh: true 
        })
        .expect(200);

      expect(response.body.data.cached).toBe(false);
      expect(aiService.summarizeProject).toHaveBeenCalledTimes(2);
    });

    test('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/ai/summary')
        .send({ projectId: nonExistentId })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    test('should return 400 for invalid project ID', async () => {
      const response = await request(app)
        .post('/api/ai/summary')
        .send({ projectId: 'invalid-id' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 503 when AI service not configured', async () => {
      aiService.isConfigured.mockReturnValue(false);

      const response = await request(app)
        .post('/api/ai/summary')
        .send({ projectId: testProject._id })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AI_SERVICE_UNAVAILABLE');
    });

    test('should handle rate limit errors', async () => {
      aiService.summarizeProject.mockRejectedValue(new Error('Rate limit exceeded. Please try again later.'));

      const response = await request(app)
        .post('/api/ai/summary')
        .send({ projectId: testProject._id })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('should handle AI service errors', async () => {
      aiService.summarizeProject.mockRejectedValue(new Error('AI service error'));

      const response = await request(app)
        .post('/api/ai/summary')
        .send({ projectId: testProject._id })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AI_SUMMARY_ERROR');
    });
  });

  describe('POST /api/ai/question', () => {
    test('should answer question with project context', async () => {
      const mockAnswer = {
        answer: 'Based on the project data, here is the answer to your question.',
        metadata: {
          question: 'What is the project status?',
          contextType: 'project',
          taskCount: 3,
          generatedAt: new Date().toISOString(),
          tokenUsage: 120
        }
      };

      aiService.answerQuestion.mockResolvedValue(mockAnswer);

      const response = await request(app)
        .post('/api/ai/question')
        .send({
          question: 'What is the project status?',
          projectId: testProject._id,
          includeAllTasks: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.answer).toBe(mockAnswer.answer);
      expect(response.body.data.contextInfo.hasProject).toBe(true);
      expect(response.body.data.contextInfo.taskCount).toBe(3);
      expect(response.body.data.cached).toBe(false);

      expect(aiService.answerQuestion).toHaveBeenCalledWith({
        question: 'What is the project status?',
        context: expect.objectContaining({
          project: expect.objectContaining({
            name: testProject.name
          }),
          tasks: expect.arrayContaining([
            expect.objectContaining({ title: 'Task 1' })
          ])
        })
      });
    });

    test('should answer question with specific tasks', async () => {
      const mockAnswer = {
        answer: 'Answer about specific tasks.',
        metadata: {
          question: 'Tell me about these tasks',
          contextType: 'general',
          taskCount: 2,
          generatedAt: new Date().toISOString(),
          tokenUsage: 100
        }
      };

      aiService.answerQuestion.mockResolvedValue(mockAnswer);

      const response = await request(app)
        .post('/api/ai/question')
        .send({
          question: 'Tell me about these tasks',
          taskIds: [testTasks[0]._id, testTasks[1]._id]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contextInfo.taskCount).toBe(2);
    });

    test('should return cached response for similar questions', async () => {
      const mockAnswer = {
        answer: 'Cached answer',
        metadata: {
          question: 'Same question',
          contextType: 'project',
          taskCount: 3,
          generatedAt: new Date().toISOString(),
          tokenUsage: 100
        }
      };

      aiService.answerQuestion.mockResolvedValue(mockAnswer);

      // First request
      await request(app)
        .post('/api/ai/question')
        .send({
          question: 'Same question',
          projectId: testProject._id
        })
        .expect(200);

      // Second request should use cache
      const response = await request(app)
        .post('/api/ai/question')
        .send({
          question: 'Same question',
          projectId: testProject._id
        })
        .expect(200);

      expect(response.body.data.cached).toBe(true);
      expect(aiService.answerQuestion).toHaveBeenCalledTimes(1);
    });

    test('should return 400 for invalid question', async () => {
      const response = await request(app)
        .post('/api/ai/question')
        .send({
          question: '', // Empty question
          projectId: testProject._id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 404 for non-existent tasks', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/ai/question')
        .send({
          question: 'Valid question',
          taskIds: [nonExistentId]
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TASKS_NOT_FOUND');
    });

    test('should handle AI service errors', async () => {
      aiService.answerQuestion.mockRejectedValue(new Error('AI service error'));

      const response = await request(app)
        .post('/api/ai/question')
        .send({
          question: 'Valid question',
          projectId: testProject._id
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AI_QUESTION_ERROR');
    });
  });

  describe('GET /api/ai/usage', () => {
    test('should return usage statistics', async () => {
      const response = await request(app)
        .get('/api/ai/usage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requestCount).toBeDefined();
      expect(response.body.data.tokenUsage).toBeDefined();
      expect(response.body.data.rateLimitStatus).toBeDefined();
      expect(response.body.data.cacheStats).toBeDefined();
    });

    test('should return 503 when AI service not configured', async () => {
      aiService.isConfigured.mockReturnValue(false);

      const response = await request(app)
        .get('/api/ai/usage')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AI_SERVICE_UNAVAILABLE');
    });
  });

  describe('DELETE /api/ai/cache', () => {
    test('should clear cache successfully', async () => {
      const response = await request(app)
        .delete('/api/ai/cache')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Cache cleared');
      expect(response.body.data.clearedEntries).toBeDefined();
    });
  });

  describe('POST /api/ai/reset-usage', () => {
    test('should reset usage statistics', async () => {
      const response = await request(app)
        .post('/api/ai/reset-usage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Usage statistics reset');
      expect(aiService.resetUsageStats).toHaveBeenCalled();
    });
  });
});