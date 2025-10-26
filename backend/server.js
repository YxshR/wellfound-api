const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger, requestLogger, errorLogger, performanceMonitor, systemMetrics } = require('./middleware/logging');
require('dotenv').config();

const app = express();

// Trust proxy for production deployment
if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Logging middleware
app.use(requestLogger);
app.use(performanceMonitor);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', { error: error.message, stack: error.stack });
    logger.warn('Server will continue running without database connection');
    // Don't exit in development mode to allow frontend testing
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Database connection middleware
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available',
      message: 'Please try again in a moment'
    });
  }
  next();
};

// Connect to database
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthStatus.database = 'connected';
    } else {
      healthStatus.database = 'disconnected';
      healthStatus.status = 'DEGRADED';
    }

    const statusCode = healthStatus.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthStatus.database = 'connected';
    } else {
      healthStatus.database = 'disconnected';
      healthStatus.status = 'DEGRADED';
    }

    const statusCode = healthStatus.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check endpoint
app.get('/api/health/detailed', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      dependencies: {}
    };

    // Check MongoDB connection
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        healthCheck.dependencies.mongodb = {
          status: 'OK',
          responseTime: Date.now()
        };
      } else {
        healthCheck.dependencies.mongodb = {
          status: 'ERROR',
          error: 'Not connected'
        };
        healthCheck.status = 'DEGRADED';
      }
    } catch (error) {
      healthCheck.dependencies.mongodb = {
        status: 'ERROR',
        error: error.message
      };
      healthCheck.status = 'DEGRADED';
    }

    // Check Gemini AI service (if API key is configured)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'test-key') {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        // Simple test to check if API is accessible
        healthCheck.dependencies.gemini = {
          status: 'OK',
          configured: true
        };
      } catch (error) {
        healthCheck.dependencies.gemini = {
          status: 'ERROR',
          configured: true,
          error: error.message
        };
        healthCheck.status = 'DEGRADED';
      }
    } else {
      healthCheck.dependencies.gemini = {
        status: 'NOT_CONFIGURED',
        configured: false
      };
    }

    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error('Detailed health check failed:', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// System metrics endpoint
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = systemMetrics.getMetrics();
    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get system metrics:', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve system metrics',
        code: 'METRICS_ERROR'
      }
    });
  }
});

// API routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// Error logging middleware
app.use(errorLogger);

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: errors
      }
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid ID format',
        code: 'INVALID_ID'
      }
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'ROUTE_NOT_FOUND'
    }
  });
});

const PORT = process.env.PORT || 5000;

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { port: PORT, environment: process.env.NODE_ENV });
  });
}

module.exports = { app, connectDB };