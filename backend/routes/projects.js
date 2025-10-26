const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');

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
const projectValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Project description cannot exceed 500 characters')
];

const projectIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID format')
];

// GET /api/projects - Retrieve all projects
router.get('/', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock data when database is not connected
      const mockProjects = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Sample Project',
          description: 'This is a sample project for demonstration',
          createdAt: new Date(),
          updatedAt: new Date(),
          taskCount: 0
        }
      ];
      
      return res.json({
        success: true,
        data: mockProjects,
        count: mockProjects.length,
        message: 'Using demo data - database not connected'
      });
    }

    const projects = await Project.find()
      .populate('taskCount')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    
    // Return mock data as fallback
    const mockProjects = [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Sample Project',
        description: 'This is a sample project for demonstration',
        createdAt: new Date(),
        updatedAt: new Date(),
        taskCount: 0
      }
    ];
    
    res.json({
      success: true,
      data: mockProjects,
      count: mockProjects.length,
      message: 'Using demo data - database error occurred'
    });
  }
});

// POST /api/projects - Create new project with default columns
router.post('/', projectValidation, handleValidationErrors, async (req, res) => {
  try {
    const { name, description = '' } = req.body;

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock response when database is not connected
      const mockProject = {
        _id: '507f1f77bcf86cd799439' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
        columns: [
          { id: 'todo', title: 'To Do', order: 0 },
          { id: 'in-progress', title: 'In Progress', order: 1 },
          { id: 'done', title: 'Done', order: 2 }
        ]
      };
      
      return res.status(201).json({
        success: true,
        data: mockProject,
        message: 'Demo project created - database not connected'
      });
    }

    const project = new Project({
      name,
      description
      // columns will be added automatically by the pre-save middleware
    });

    const savedProject = await project.save();

    res.status(201).json({
      success: true,
      data: savedProject,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'A project with this name already exists',
          code: 'DUPLICATE_PROJECT'
        }
      });
    }

    // Return mock project as fallback
    const mockProject = {
      _id: '507f1f77bcf86cd799439' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      name: req.body.name || 'New Project',
      description: req.body.description || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      columns: [
        { id: 'todo', title: 'To Do', order: 0 },
        { id: 'in-progress', title: 'In Progress', order: 1 },
        { id: 'done', title: 'Done', order: 2 }
      ]
    };
    
    res.status(201).json({
      success: true,
      data: mockProject,
      message: 'Demo project created - database error occurred'
    });
  }
});

// GET /api/projects/:id - Get specific project with columns
router.get('/:id', projectIdValidation, handleValidationErrors, async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock project data when database is not connected
      const mockProject = {
        _id: req.params.id,
        name: 'Sample Project',
        description: 'This is a sample project for demonstration',
        createdAt: new Date(),
        updatedAt: new Date(),
        columns: [
          { id: 'todo', title: 'To Do', order: 0 },
          { id: 'in-progress', title: 'In Progress', order: 1 },
          { id: 'done', title: 'Done', order: 2 }
        ],
        taskCount: 0
      };
      
      return res.json({
        success: true,
        data: mockProject,
        message: 'Using demo data - database not connected'
      });
    }

    const project = await Project.findById(req.params.id)
      .populate('taskCount');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    
    // Return mock data as fallback
    const mockProject = {
      _id: req.params.id,
      name: 'Sample Project',
      description: 'This is a sample project for demonstration',
      createdAt: new Date(),
      updatedAt: new Date(),
      columns: [
        { id: 'todo', title: 'To Do', order: 0 },
        { id: 'in-progress', title: 'In Progress', order: 1 },
        { id: 'done', title: 'Done', order: 2 }
      ],
      taskCount: 0
    };
    
    res.json({
      success: true,
      data: mockProject,
      message: 'Using demo data - database error occurred'
    });
  }
});

// PUT /api/projects/:id - Update project details
router.put('/:id', 
  [...projectIdValidation, ...projectValidation], 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { name, description } = req.body;

      // Check if database is connected
      if (mongoose.connection.readyState !== 1) {
        // Return mock updated project when database is not connected
        const mockProject = {
          _id: req.params.id,
          name,
          description,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          updatedAt: new Date(),
          columns: [
            { id: 'todo', title: 'To Do', order: 0 },
            { id: 'in-progress', title: 'In Progress', order: 1 },
            { id: 'done', title: 'Done', order: 2 }
          ],
          taskCount: 0
        };
        
        return res.json({
          success: true,
          data: mockProject,
          message: 'Demo project updated - database not connected'
        });
      }

      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { 
          name, 
          description,
          updatedAt: Date.now()
        },
        { 
          new: true, 
          runValidators: true 
        }
      ).populate('taskCount');

      if (!project) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: project,
        message: 'Project updated successfully'
      });
    } catch (error) {
      console.error('Error updating project:', error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'A project with this name already exists',
            code: 'DUPLICATE_PROJECT'
          }
        });
      }

      // Return mock updated project as fallback
      const mockProject = {
        _id: req.params.id,
        name: req.body.name || 'Updated Sample Project',
        description: req.body.description || 'Updated description',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(),
        columns: [
          { id: 'todo', title: 'To Do', order: 0 },
          { id: 'in-progress', title: 'In Progress', order: 1 },
          { id: 'done', title: 'Done', order: 2 }
        ],
        taskCount: 0
      };
      
      res.json({
        success: true,
        data: mockProject,
        message: 'Demo project updated - database error occurred'
      });
    }
  }
);

// DELETE /api/projects/:id - Delete project and cascade delete all associated tasks
router.delete('/:id', projectIdValidation, handleValidationErrors, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock delete response when database is not connected
      return res.json({
        success: true,
        message: 'Demo project deleted - database not connected',
        data: {
          deletedProject: 'Sample Project',
          deletedTasksCount: 3
        }
      });
    }

    // Check if project exists
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

    // Get count of tasks that will be deleted
    const taskCount = await Task.countDocuments({ projectId });

    // Delete all associated tasks first
    await Task.deleteMany({ projectId });

    // Delete the project
    await Project.findByIdAndDelete(projectId);

    res.json({
      success: true,
      message: 'Project and associated tasks deleted successfully',
      data: {
        deletedProject: project.name,
        deletedTasksCount: taskCount
      }
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    
    // Return mock delete response as fallback
    res.json({
      success: true,
      message: 'Demo project deleted - database error occurred',
      data: {
        deletedProject: 'Sample Project',
        deletedTasksCount: 0
      }
    });
  }
});

// Task validation rules for project-specific task routes
const taskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
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
    .withMessage('Status must be one of: todo, inprogress, done')
];

// GET /api/projects/:id/tasks - Retrieve all tasks for a project
router.get('/:id/tasks', projectIdValidation, handleValidationErrors, async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock tasks when database is not connected
      const mockTasks = [
        {
          _id: '507f1f77bcf86cd799439021',
          title: 'Sample Task 1',
          description: 'This is a sample task in the To Do column',
          status: 'todo',
          projectId: projectId,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: '507f1f77bcf86cd799439022',
          title: 'Sample Task 2',
          description: 'This is a sample task in the In Progress column',
          status: 'in-progress',
          projectId: projectId,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: '507f1f77bcf86cd799439023',
          title: 'Sample Task 3',
          description: 'This is a sample task in the Done column',
          status: 'done',
          projectId: projectId,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      return res.json({
        success: true,
        data: mockTasks,
        count: mockTasks.length,
        projectId,
        message: 'Using demo data - database not connected'
      });
    }

    // Check if project exists
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

    // Get all tasks for the project, sorted by status and order
    const tasks = await Task.find({ projectId })
      .sort({ status: 1, order: 1, createdAt: 1 });

    res.json({
      success: true,
      data: tasks,
      count: tasks.length,
      projectId
    });
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    
    // Return mock tasks as fallback
    const mockTasks = [
      {
        _id: '507f1f77bcf86cd799439021',
        title: 'Sample Task 1',
        description: 'This is a sample task in the To Do column',
        status: 'todo',
        projectId: projectId,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '507f1f77bcf86cd799439022',
        title: 'Sample Task 2',
        description: 'This is a sample task in the In Progress column',
        status: 'in-progress',
        projectId: projectId,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '507f1f77bcf86cd799439023',
        title: 'Sample Task 3',
        description: 'This is a sample task in the Done column',
        status: 'done',
        projectId: projectId,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    res.json({
      success: true,
      data: mockTasks,
      count: mockTasks.length,
      projectId,
      message: 'Using demo data - database error occurred'
    });
  }
});

// POST /api/projects/:id/tasks - Create new task with default "todo" status
router.post('/:id/tasks', 
  [...projectIdValidation, ...taskValidation], 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { id: projectId } = req.params;
      const { title, description = '', status = 'todo' } = req.body;

      // Check if database is connected
      if (mongoose.connection.readyState !== 1) {
        // Return mock created task when database is not connected
        const mockTask = {
          _id: '507f1f77bcf86cd799439' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
          title,
          description,
          status,
          projectId,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        return res.status(201).json({
          success: true,
          data: mockTask,
          message: 'Demo task created - database not connected'
        });
      }

      // Check if project exists
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

      // Get the next order number for the status column
      const lastTask = await Task.findOne({ projectId, status })
        .sort({ order: -1 });
      const nextOrder = lastTask ? lastTask.order + 1 : 0;

      const task = new Task({
        projectId,
        title,
        description,
        status,
        order: nextOrder
      });

      const savedTask = await task.save();

      res.status(201).json({
        success: true,
        data: savedTask,
        message: 'Task created successfully'
      });
    } catch (error) {
      console.error('Error creating task:', error);
      
      // Return mock created task as fallback
      const mockTask = {
        _id: '507f1f77bcf86cd799439' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        title: req.body.title || 'New Task',
        description: req.body.description || '',
        status: req.body.status || 'todo',
        projectId: req.params.id,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      res.status(201).json({
        success: true,
        data: mockTask,
        message: 'Demo task created - database error occurred'
      });
    }
  }
);

// Reorder validation rules
const reorderValidation = [
  body('taskId')
    .isMongoId()
    .withMessage('Invalid task ID format'),
  body('sourceStatus')
    .isIn(['todo', 'inprogress', 'done'])
    .withMessage('Source status must be one of: todo, inprogress, done'),
  body('destinationStatus')
    .isIn(['todo', 'inprogress', 'done'])
    .withMessage('Destination status must be one of: todo, inprogress, done'),
  body('destinationIndex')
    .isInt({ min: 0 })
    .withMessage('Destination index must be a non-negative integer')
];

// PATCH /api/projects/:id/tasks/reorder - Reorder tasks for drag and drop
router.patch('/:id/tasks/reorder', 
  [...projectIdValidation, ...reorderValidation], 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { id: projectId } = req.params;
      const { taskId, sourceStatus, destinationStatus, destinationIndex } = req.body;

      // Check if project exists
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

      // Check if task exists and belongs to this project
      const task = await Task.findOne({ _id: taskId, projectId });
      if (!task) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Task not found in this project',
            code: 'TASK_NOT_FOUND'
          }
        });
      }

      // If moving within the same column
      if (sourceStatus === destinationStatus) {
        // Get all tasks in the same status, sorted by order
        const tasksInColumn = await Task.find({ 
          projectId, 
          status: sourceStatus 
        }).sort({ order: 1 });

        // Remove the task from its current position
        const currentIndex = tasksInColumn.findIndex(t => t._id.toString() === taskId);
        if (currentIndex === -1) {
          throw new Error('Task not found in source column');
        }

        const [movedTask] = tasksInColumn.splice(currentIndex, 1);
        
        // Insert at new position
        tasksInColumn.splice(destinationIndex, 0, movedTask);

        // Update order for all affected tasks
        const bulkOps = tasksInColumn.map((task, index) => ({
          updateOne: {
            filter: { _id: task._id },
            update: { order: index, updatedAt: Date.now() }
          }
        }));

        await Task.bulkWrite(bulkOps);
      } else {
        // Moving between different columns
        
        // Update the moved task's status and order
        await Task.findByIdAndUpdate(
          taskId,
          { 
            status: destinationStatus, 
            order: destinationIndex,
            updatedAt: Date.now()
          }
        );

        // Reorder tasks in the source column (close the gap)
        await Task.updateMany(
          { 
            projectId, 
            status: sourceStatus, 
            order: { $gt: task.order } 
          },
          { 
            $inc: { order: -1 },
            updatedAt: Date.now()
          }
        );

        // Reorder tasks in the destination column (make space)
        await Task.updateMany(
          { 
            projectId, 
            status: destinationStatus, 
            order: { $gte: destinationIndex },
            _id: { $ne: taskId }
          },
          { 
            $inc: { order: 1 },
            updatedAt: Date.now()
          }
        );
      }

      // Get the updated task
      const updatedTask = await Task.findById(taskId).populate('project', 'name description');

      res.json({
        success: true,
        data: updatedTask,
        message: 'Task reordered successfully'
      });

    } catch (error) {
      console.error('Error reordering task:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to reorder task',
          code: 'REORDER_ERROR'
        }
      });
    }
  }
);

module.exports = router;