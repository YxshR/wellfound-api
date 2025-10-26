const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {}
    };

    // Check database connection
    try {
      const dbState = mongoose.connection.readyState;
      const dbStates = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };
      
      healthCheck.services.database = {
        status: dbState === 1 ? 'healthy' : 'unhealthy',
        state: dbStates[dbState],
        host: mongoose.connection.host || 'unknown'
      };
    } catch (error) {
      healthCheck.services.database = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    healthCheck.services.memory = {
      status: 'healthy',
      usage: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
      }
    };

    // Check if any service is unhealthy
    const isHealthy = Object.values(healthCheck.services).every(
      service => service.status === 'healthy'
    );

    if (!isHealthy) {
      healthCheck.status = 'DEGRADED';
      return res.status(503).json(healthCheck);
    }

    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check with database connectivity test
router.get('/detailed', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {},
      system: {}
    };

    // Database connectivity test
    try {
      await mongoose.connection.db.admin().ping();
      const dbStats = await mongoose.connection.db.stats();
      
      healthCheck.services.database = {
        status: 'healthy',
        state: 'connected',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        collections: dbStats.collections,
        dataSize: `${Math.round(dbStats.dataSize / 1024 / 1024)} MB`,
        indexSize: `${Math.round(dbStats.indexSize / 1024 / 1024)} MB`
      };
    } catch (error) {
      healthCheck.services.database = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // System information
    healthCheck.system = {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage()
    };

    // Environment variables check (without exposing sensitive data)
    const requiredEnvVars = ['MONGODB_URI', 'GEMINI_API_KEY'];
    healthCheck.services.environment = {
      status: 'healthy',
      variables: {}
    };

    requiredEnvVars.forEach(envVar => {
      healthCheck.services.environment.variables[envVar] = process.env[envVar] ? 'set' : 'missing';
      if (!process.env[envVar]) {
        healthCheck.services.environment.status = 'unhealthy';
      }
    });

    // Check if any service is unhealthy
    const isHealthy = Object.values(healthCheck.services).every(
      service => service.status === 'healthy'
    );

    if (!isHealthy) {
      healthCheck.status = 'DEGRADED';
      return res.status(503).json(healthCheck);
    }

    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness probe (for Kubernetes-style deployments)
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      return res.status(503).json({
        status: 'NOT_READY',
        reason: 'Database not connected'
      });
    }

    // Check if required environment variables are set
    const requiredEnvVars = ['MONGODB_URI', 'GEMINI_API_KEY'];
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
      return res.status(503).json({
        status: 'NOT_READY',
        reason: `Missing environment variables: ${missingVars.join(', ')}`
      });
    }

    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Liveness probe (for Kubernetes-style deployments)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;