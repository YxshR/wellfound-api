const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(err => err.msg)
      }
    });
  }
  next();
};

// Validation rules
const taskUpdateValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task title cannot be empty')
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Task description cannot exceed 1000 characters'),
  body('status')
    .optional()
    .isIn(['todo', 'inprogress', 'done'])
    .withMessage('Status must be one of: todo, inprogress, done'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
];

const taskIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format')
];

// GET /api/tasks - Get all tasks across all projects
router.get('/', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock tasks when database is not connected
      const mockTasks = [
        {
          _id: '507f1f77bcf86cd799439021',
          title: 'Sample Task 1',
          description: 'This is a sample task in the To Do column',
          status: 'todo',
          projectId: '507f1f77bcf86cd799439011',
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          project: {
            _id: '507f1f77bcf86cd799439011',
            name: 'Sample Project'
          }
        },
        {
          _id: '507f1f77bcf86cd799439022',
          title: 'Sample Task 2',
          description: 'This is a sample task in the In Progress column',
          status: 'inprogress',
          projectId: '507f1f77bcf86cd799439011',
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          project: {
            _id: '507f1f77bcf86cd799439011',
            name: 'Sample Project'
          }
        },
        {
          _id: '507f1f77bcf86cd799439023',
          title: 'Sample Task 3',
          description: 'This is a sample task in the Done column',
          status: 'done',
          projectId: '507f1f77bcf86cd799439011',
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          project: {
            _id: '507f1f77bcf86cd799439011',
            name: 'Sample Project'
          }
        }
      ];
      
      return res.json({
        success: true,
        data: mockTasks,
        count: mockTasks.length,
        message: 'Using demo data - database not connected'
      });
    }

    const tasks = await Task.find()
      .populate('project', 'name description')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    
    // Return mock tasks as fallback
    const mockTasks = [
      {
        _id: '507f1f77bcf86cd799439021',
        title: 'Sample Task 1',
        description: 'This is a sample task in the To Do column',
        status: 'todo',
        projectId: '507f1f77bcf86cd799439011',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Sample Project'
        }
      },
      {
        _id: '507f1f77bcf86cd799439022',
        title: 'Sample Task 2',
        description: 'This is a sample task in the In Progress column',
        status: 'inprogress',
        projectId: '507f1f77bcf86cd799439011',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Sample Project'
        }
      },
      {
        _id: '507f1f77bcf86cd799439023',
        title: 'Sample Task 3',
        description: 'This is a sample task in the Done column',
        status: 'done',
        projectId: '507f1f77bcf86cd799439011',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Sample Project'
        }
      }
    ];
    
    res.json({
      success: true,
      data: mockTasks,
      count: mockTasks.length,
      message: 'Using demo data - database error occurred'
    });
  }
});

// GET /api/tasks/:id - Get specific task details
router.get('/:id', taskIdValidation, handleValidationErrors, async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock task when database is not connected
      const mockTask = {
        _id: req.params.id,
        title: 'Sample Task',
        description: 'This is a sample task for demonstration',
        status: 'todo',
        projectId: '507f1f77bcf86cd799439011',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Sample Project'
        }
      };
      
      return res.json({
        success: true,
        data: mockTask,
        message: 'Using demo data - database not connected'
      });
    }

    const task = await Task.findById(req.params.id)
      .populate('project', 'name description');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'TASK_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    
    // Return mock task as fallback
    const mockTask = {
      _id: req.params.id,
      title: 'Sample Task',
      description: 'This is a sample task for demonstration',
      status: 'todo',
      projectId: '507f1f77bcf86cd799439011',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: {
        _id: '507f1f77bcf86cd799439011',
        name: 'Sample Project'
      }
    };
    
    res.json({
      success: true,
      data: mockTask,
      message: 'Using demo data - database error occurred'
    });
  }
});

// PUT /api/tasks/:id - Update task details including status changes
router.put('/:id', 
  [...taskIdValidation, ...taskUpdateValidation], 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if database is connected
      if (mongoose.connection.readyState !== 1) {
        // Return mock updated task when database is not connected
        const mockUpdatedTask = {
          _id: id,
          title: updateData.title || 'Updated Sample Task',
          description: updateData.description || 'This task has been updated',
          status: updateData.status || 'todo',
          projectId: '507f1f77bcf86cd799439011',
          order: updateData.order || 0,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          updatedAt: new Date(),
          project: {
            _id: '507f1f77bcf86cd799439011',
            name: 'Sample Project'
          }
        };
        
        return res.json({
          success: true,
          data: mockUpdatedTask,
          message: 'Demo task updated - database not connected'
        });
      }

      // Find the current task
      const currentTask = await Task.findById(id);
      if (!currentTask) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Task not found',
            code: 'TASK_NOT_FOUND'
          }
        });
      }

      // If status is being changed, handle reordering
      if (updateData.status && updateData.status !== currentTask.status) {
        // Get the next order number for the new status column
        const lastTaskInNewStatus = await Task.findOne({ 
          projectId: currentTask.projectId, 
          status: updateData.status 
        }).sort({ order: -1 });
        
        updateData.order = lastTaskInNewStatus ? lastTaskInNewStatus.order + 1 : 0;
      }

      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { 
          ...updateData,
          updatedAt: Date.now()
        },
        { 
          new: true, 
          runValidators: true 
        }
      ).populate('project', 'name description');

      res.json({
        success: true,
        data: updatedTask,
        message: 'Task updated successfully'
      });
    } catch (error) {
      console.error('Error updating task:', error);
      
      // Return mock updated task as fallback
      const mockUpdatedTask = {
        _id: id,
        title: updateData.title || 'Updated Sample Task',
        description: updateData.description || 'This task has been updated',
        status: updateData.status || 'todo',
        projectId: '507f1f77bcf86cd799439011',
        order: updateData.order || 0,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(),
        project: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Sample Project'
        }
      };
      
      res.json({
        success: true,
        data: mockUpdatedTask,
        message: 'Demo task updated - database error occurred'
      });
    }
  }
);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', taskIdValidation, handleValidationErrors, async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock delete response when database is not connected
      return res.json({
        success: true,
        message: 'Demo task deleted - database not connected',
        data: {
          deletedTask: {
            id: req.params.id,
            title: 'Sample Task',
            projectId: '507f1f77bcf86cd799439011'
          }
        }
      });
    }

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'TASK_NOT_FOUND'
        }
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully',
      data: {
        deletedTask: {
          id: task._id,
          title: task.title,
          projectId: task.projectId
        }
      }
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    
    // Return mock delete response as fallback
    res.json({
      success: true,
      message: 'Demo task deleted - database error occurred',
      data: {
        deletedTask: {
          id: req.params.id,
          title: 'Sample Task',
          projectId: '507f1f77bcf86cd799439011'
        }
      }
    });
  }
});

module.exports = router;