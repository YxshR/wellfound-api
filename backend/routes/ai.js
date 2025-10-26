const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { aiService } = require('../services');
const Project = require('../models/Project');
const Task = require('../models/Task');

const router = express.Router();

// Simple in-memory cache for AI responses
const responseCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Cache key generator for responses
 */
function generateCacheKey(type, projectId, question = '') {
  return `${type}:${projectId}:${question.toLowerCase().trim()}`;
}

/**
 * Get cached response if available and not expired
 */
function getCachedResponse(key) {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    responseCache.delete(key); // Remove expired cache
  }
  return null;
}

/**
 * Cache response
 */
function setCachedResponse(key, data) {
  responseCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Middleware to check if AI service is available
 */
const checkAIService = (req, res, next) => {
  if (!aiService.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'AI service is not available. Please check configuration.',
        code: 'AI_SERVICE_UNAVAILABLE'
      }
    });
  }
  next();
};

/**
 * Validation middleware for handling validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * POST /api/ai/summary
 * Generate AI summary for a project's tasks
 */
router.post('/summary',
  checkAIService,
  [
    body('projectId')
      .isMongoId()
      .withMessage('Valid project ID is required'),
    body('forceRefresh')
      .optional()
      .isBoolean()
      .withMessage('forceRefresh must be a boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId, forceRefresh = false } = req.body;

      // Check cache first (unless force refresh is requested)
      const cacheKey = generateCacheKey('summary', projectId);
      if (!forceRefresh) {
        const cachedResponse = getCachedResponse(cacheKey);
        if (cachedResponse) {
          return res.json({
            success: true,
            data: {
              ...cachedResponse,
              cached: true,
              cacheAge: Math.floor((Date.now() - responseCache.get(cacheKey).timestamp) / 1000)
            }
          });
        }
      }

      // Fetch project and tasks
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
          }
        });
      }

      const tasks = await Task.find({ projectId }).sort({ status: 1, order: 1 });

      // Generate summary using AI service
      const summaryResult = await aiService.summarizeProject({
        project: project.toObject(),
        tasks: tasks.map(task => task.toObject())
      });

      // Cache the response
      setCachedResponse(cacheKey, summaryResult);

      // Get current usage stats
      const usageStats = aiService.getUsageStats();

      res.json({
        success: true,
        data: {
          ...summaryResult,
          cached: false,
          usageStats: {
            requestCount: usageStats.requestCount,
            estimatedCost: usageStats.tokenUsage.totalCost,
            rateLimitStatus: usageStats.rateLimitStatus
          }
        }
      });

    } catch (error) {
      console.error('AI Summary Error:', error);

      // Handle specific AI service errors
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          error: {
            message: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
          }
        });
      }

      if (error.message.includes('AI service not properly configured')) {
        return res.status(503).json({
          success: false,
          error: {
            message: 'AI service configuration error',
            code: 'AI_CONFIG_ERROR'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate project summary',
          code: 'AI_SUMMARY_ERROR'
        }
      });
    }
  }
);

/**
 * POST /api/ai/question
 * Ask questions about tasks and projects
 */
router.post('/question',
  checkAIService,
  [
    body('question')
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Question must be between 1 and 500 characters'),
    body('projectId')
      .optional()
      .isMongoId()
      .withMessage('Valid project ID is required when provided'),
    body('taskIds')
      .optional()
      .isArray()
      .withMessage('taskIds must be an array')
      .custom((taskIds) => {
        if (taskIds && taskIds.some(id => !id.match(/^[0-9a-fA-F]{24}$/))) {
          throw new Error('All task IDs must be valid MongoDB ObjectIds');
        }
        return true;
      }),
    body('includeAllTasks')
      .optional()
      .isBoolean()
      .withMessage('includeAllTasks must be a boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        question, 
        projectId, 
        taskIds = [], 
        includeAllTasks = false 
      } = req.body;

      // Prepare context data
      const context = {};

      // Fetch project if provided
      if (projectId) {
        const project = await Project.findById(projectId);
        if (!project) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Project not found',
              code: 'PROJECT_NOT_FOUND'
            }
          });
        }
        context.project = project.toObject();
      }

      // Fetch tasks based on parameters
      let tasks = [];
      if (projectId && includeAllTasks) {
        // Get all tasks for the project
        tasks = await Task.find({ projectId }).sort({ status: 1, order: 1 });
      } else if (taskIds.length > 0) {
        // Get specific tasks
        tasks = await Task.find({ _id: { $in: taskIds } }).sort({ status: 1, order: 1 });
        
        // Verify all requested tasks exist
        if (tasks.length !== taskIds.length) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'One or more tasks not found',
              code: 'TASKS_NOT_FOUND'
            }
          });
        }
      } else if (projectId) {
        // Get recent tasks for context (limit to 10 most recent)
        tasks = await Task.find({ projectId })
          .sort({ updatedAt: -1 })
          .limit(10);
      }

      context.tasks = tasks.map(task => task.toObject());

      // Check cache for similar questions
      const cacheKey = generateCacheKey('question', projectId || 'general', question);
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        return res.json({
          success: true,
          data: {
            ...cachedResponse,
            cached: true,
            cacheAge: Math.floor((Date.now() - responseCache.get(cacheKey).timestamp) / 1000)
          }
        });
      }

      // Generate answer using AI service
      const answerResult = await aiService.answerQuestion({
        question,
        context
      });

      // Cache the response
      setCachedResponse(cacheKey, answerResult);

      // Get current usage stats
      const usageStats = aiService.getUsageStats();

      res.json({
        success: true,
        data: {
          ...answerResult,
          cached: false,
          contextInfo: {
            hasProject: !!context.project,
            taskCount: context.tasks.length,
            projectName: context.project?.name
          },
          usageStats: {
            requestCount: usageStats.requestCount,
            estimatedCost: usageStats.tokenUsage.totalCost,
            rateLimitStatus: usageStats.rateLimitStatus
          }
        }
      });

    } catch (error) {
      console.error('AI Question Error:', error);

      // Handle specific AI service errors
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          error: {
            message: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
          }
        });
      }

      if (error.message.includes('AI service not properly configured')) {
        return res.status(503).json({
          success: false,
          error: {
            message: 'AI service configuration error',
            code: 'AI_CONFIG_ERROR'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to process your question',
          code: 'AI_QUESTION_ERROR'
        }
      });
    }
  }
);

/**
 * GET /api/ai/usage
 * Get current AI usage statistics
 */
router.get('/usage', checkAIService, (req, res) => {
  try {
    const usageStats = aiService.getUsageStats();
    
    res.json({
      success: true,
      data: {
        ...usageStats,
        cacheStats: {
          cachedResponses: responseCache.size,
          cacheHitRate: 'Not tracked' // Could be implemented if needed
        }
      }
    });
  } catch (error) {
    console.error('AI Usage Stats Error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve usage statistics',
        code: 'USAGE_STATS_ERROR'
      }
    });
  }
});

/**
 * DELETE /api/ai/cache
 * Clear AI response cache (admin function)
 */
router.delete('/cache', checkAIService, (req, res) => {
  try {
    const cacheSize = responseCache.size;
    responseCache.clear();
    
    res.json({
      success: true,
      data: {
        message: 'Cache cleared successfully',
        clearedEntries: cacheSize
      }
    });
  } catch (error) {
    console.error('AI Cache Clear Error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clear cache',
        code: 'CACHE_CLEAR_ERROR'
      }
    });
  }
});

/**
 * POST /api/ai/reset-usage
 * Reset usage statistics (admin function)
 */
router.post('/reset-usage', checkAIService, (req, res) => {
  try {
    aiService.resetUsageStats();
    
    res.json({
      success: true,
      data: {
        message: 'Usage statistics reset successfully'
      }
    });
  } catch (error) {
    console.error('AI Usage Reset Error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to reset usage statistics',
        code: 'USAGE_RESET_ERROR'
      }
    });
  }
});

module.exports = router;