const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Database connection middleware
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    // For development, log the warning but allow the request to continue
    console.warn('⚠️  Database not connected, some features may not work properly');
    req.dbConnected = false;
  } else {
    req.dbConnected = true;
  }
  next();
};

// Import route modules
const projectRoutes = require('./projects');
const taskRoutes = require('./tasks');
const aiRoutes = require('./ai');
const healthRoutes = require('./health');

// Route handlers (with database connection check for data routes)
router.use('/projects', checkDBConnection, projectRoutes);
router.use('/tasks', checkDBConnection, taskRoutes);
router.use('/ai', checkDBConnection, aiRoutes); // AI routes need DB for project/task data
router.use('/health', healthRoutes); // Health routes should work without DB

// Default API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Project & Task Management API',
    version: '1.0.0',
    endpoints: {
      projects: '/api/projects',
      tasks: '/api/tasks',
      ai: '/api/ai'
    }
  });
});

module.exports = router;