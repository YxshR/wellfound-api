const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, connectDB } = require('../../server');
const Project = require('../../models/Project');
const Task = require('../../models/Task');

describe('Project API Endpoints', () => {
  let mongoServer;
  let testProject;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_TEST_URI = mongoUri;
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Clean up and close connections
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await Project.deleteMany({});
    await Task.deleteMany({});
    
    // Create a test project for tests that need existing data
    testProject = await Project.create({
      name: 'Test Project',
      description: 'A test project for integration tests'
    });
  });

  describe('GET /api/projects', () => {
    it('should retrieve all projects with proper structure', async () => {
      // Create additional projects
      await Project.create([
        { name: 'Project 1', description: 'First project' },
        { name: 'Project 2', description: 'Second project' }
      ]);

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3); // Including testProject
      expect(response.body.count).toBe(3);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('description');
      expect(response.body.data[0]).toHaveProperty('columns');
      expect(response.body.data[0]).toHaveProperty('createdAt');
    });

    it('should return empty array when no projects exist', async () => {
      await Project.deleteMany({});

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should return projects sorted by creation date (newest first)', async () => {
      await Project.deleteMany({});
      
      // Create projects with slight delay to ensure different timestamps
      const project1 = await Project.create({ name: 'First Project' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const project2 = await Project.create({ name: 'Second Project' });

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.data[0].name).toBe('Second Project');
      expect(response.body.data[1].name).toBe('First Project');
    });
  });

  describe('POST /api/projects', () => {
    it('should create new project with default columns', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A brand new project'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.description).toBe(projectData.description);
      expect(response.body.data.columns).toHaveLength(3);
      expect(response.body.data.columns[0]).toEqual({
        id: 'todo',
        title: 'To Do',
        order: 0
      });
      expect(response.body.data.columns[1]).toEqual({
        id: 'inprogress',
        title: 'In Progress',
        order: 1
      });
      expect(response.body.data.columns[2]).toEqual({
        id: 'done',
        title: 'Done',
        order: 2
      });
      expect(response.body.message).toBe('Project created successfully');
    });

    it('should create project with empty description when not provided', async () => {
      const projectData = {
        name: 'Project Without Description'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.description).toBe('');
    });

    it('should return validation error for missing name', async () => {
      const projectData = {
        description: 'Project without name'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Project name is required');
    });

    it('should return validation error for empty name', async () => {
      const projectData = {
        name: '',
        description: 'Project with empty name'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for name exceeding 100 characters', async () => {
      const projectData = {
        name: 'a'.repeat(101),
        description: 'Project with very long name'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for description exceeding 500 characters', async () => {
      const projectData = {
        name: 'Valid Project Name',
        description: 'a'.repeat(501)
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should retrieve specific project by ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testProject._id.toString());
      expect(response.body.data.name).toBe(testProject.name);
      expect(response.body.data.description).toBe(testProject.description);
      expect(response.body.data.columns).toHaveLength(3);
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/projects/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
      expect(response.body.error.message).toBe('Project not found');
    });

    it('should return 400 for invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/projects/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Invalid project ID format');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project details successfully', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated project description'
      };

      const response = await request(app)
        .put(`/api/projects/${testProject._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.message).toBe('Project updated successfully');

      // Verify the update persisted in database
      const updatedProject = await Project.findById(testProject._id);
      expect(updatedProject.name).toBe(updateData.name);
      expect(updatedProject.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/projects/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return validation error for invalid update data', async () => {
      const updateData = {
        name: '', // Empty name should fail validation
        description: 'Valid description'
      };

      const response = await request(app)
        .put(`/api/projects/${testProject._id}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid project ID format', async () => {
      const updateData = {
        name: 'Valid Name',
        description: 'Valid description'
      };

      const response = await request(app)
        .put('/api/projects/invalid-id')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project successfully when no tasks exist', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project and associated tasks deleted successfully');
      expect(response.body.data.deletedProject).toBe(testProject.name);
      expect(response.body.data.deletedTasksCount).toBe(0);

      // Verify project was deleted from database
      const deletedProject = await Project.findById(testProject._id);
      expect(deletedProject).toBeNull();
    });

    it('should cascade delete all associated tasks', async () => {
      // Create tasks associated with the test project
      const tasks = await Task.create([
        {
          projectId: testProject._id,
          title: 'Task 1',
          description: 'First task',
          status: 'todo'
        },
        {
          projectId: testProject._id,
          title: 'Task 2',
          description: 'Second task',
          status: 'inprogress'
        },
        {
          projectId: testProject._id,
          title: 'Task 3',
          description: 'Third task',
          status: 'done'
        }
      ]);

      const response = await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedTasksCount).toBe(3);

      // Verify project was deleted
      const deletedProject = await Project.findById(testProject._id);
      expect(deletedProject).toBeNull();

      // Verify all associated tasks were deleted
      const remainingTasks = await Task.find({ projectId: testProject._id });
      expect(remainingTasks).toHaveLength(0);

      // Verify tasks were actually deleted, not just orphaned
      for (const task of tasks) {
        const deletedTask = await Task.findById(task._id);
        expect(deletedTask).toBeNull();
      }
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/projects/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
      expect(response.body.error.message).toBe('Project not found');
    });

    it('should return 400 for invalid project ID format', async () => {
      const response = await request(app)
        .delete('/api/projects/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Invalid project ID format');
    });

    it('should not affect other projects when deleting one project', async () => {
      // Create another project
      const otherProject = await Project.create({
        name: 'Other Project',
        description: 'This should not be deleted'
      });

      // Create tasks for both projects
      await Task.create([
        {
          projectId: testProject._id,
          title: 'Task for test project',
          status: 'todo'
        },
        {
          projectId: otherProject._id,
          title: 'Task for other project',
          status: 'todo'
        }
      ]);

      // Delete the test project
      await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .expect(200);

      // Verify other project still exists
      const remainingProject = await Project.findById(otherProject._id);
      expect(remainingProject).not.toBeNull();
      expect(remainingProject.name).toBe('Other Project');

      // Verify other project's tasks still exist
      const remainingTasks = await Task.find({ projectId: otherProject._id });
      expect(remainingTasks).toHaveLength(1);
    });
  });

  describe('PATCH /api/projects/:id/tasks/reorder', () => {
    let task1, task2, task3;

    beforeEach(async () => {
      // Create test tasks in different statuses
      task1 = await Task.create({
        projectId: testProject._id,
        title: 'Task 1',
        status: 'todo',
        order: 0
      });

      task2 = await Task.create({
        projectId: testProject._id,
        title: 'Task 2',
        status: 'todo',
        order: 1
      });

      task3 = await Task.create({
        projectId: testProject._id,
        title: 'Task 3',
        status: 'inprogress',
        order: 0
      });
    });

    it('should reorder task within same column', async () => {
      const reorderData = {
        taskId: task1._id.toString(),
        sourceStatus: 'todo',
        destinationStatus: 'todo',
        destinationIndex: 1
      };

      const response = await request(app)
        .patch(`/api/projects/${testProject._id}/tasks/reorder`)
        .send(reorderData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('todo');
      expect(response.body.data.order).toBe(1);

      // Verify task order in database
      const tasks = await Task.find({ projectId: testProject._id, status: 'todo' })
        .sort({ order: 1 });
      
      expect(tasks[0]._id.toString()).toBe(task2._id.toString());
      expect(tasks[0].order).toBe(0);
      expect(tasks[1]._id.toString()).toBe(task1._id.toString());
      expect(tasks[1].order).toBe(1);
    });

    it('should move task between different columns', async () => {
      const reorderData = {
        taskId: task1._id.toString(),
        sourceStatus: 'todo',
        destinationStatus: 'inprogress',
        destinationIndex: 0
      };

      const response = await request(app)
        .patch(`/api/projects/${testProject._id}/tasks/reorder`)
        .send(reorderData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('inprogress');
      expect(response.body.data.order).toBe(0);

      // Verify task moved to new column
      const movedTask = await Task.findById(task1._id);
      expect(movedTask.status).toBe('inprogress');
      expect(movedTask.order).toBe(0);

      // Verify original inprogress task was reordered
      const originalInProgressTask = await Task.findById(task3._id);
      expect(originalInProgressTask.order).toBe(1);

      // Verify remaining todo task was reordered
      const remainingTodoTask = await Task.findById(task2._id);
      expect(remainingTodoTask.order).toBe(0);
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const reorderData = {
        taskId: task1._id.toString(),
        sourceStatus: 'todo',
        destinationStatus: 'todo',
        destinationIndex: 1
      };

      const response = await request(app)
        .patch(`/api/projects/${nonExistentId}/tasks/reorder`)
        .send(reorderData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentTaskId = new mongoose.Types.ObjectId();
      const reorderData = {
        taskId: nonExistentTaskId.toString(),
        sourceStatus: 'todo',
        destinationStatus: 'todo',
        destinationIndex: 1
      };

      const response = await request(app)
        .patch(`/api/projects/${testProject._id}/tasks/reorder`)
        .send(reorderData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('should return 400 for invalid task ID format', async () => {
      const reorderData = {
        taskId: 'invalid-id',
        sourceStatus: 'todo',
        destinationStatus: 'todo',
        destinationIndex: 1
      };

      const response = await request(app)
        .patch(`/api/projects/${testProject._id}/tasks/reorder`)
        .send(reorderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid status values', async () => {
      const reorderData = {
        taskId: task1._id.toString(),
        sourceStatus: 'invalid-status',
        destinationStatus: 'todo',
        destinationIndex: 1
      };

      const response = await request(app)
        .patch(`/api/projects/${testProject._id}/tasks/reorder`)
        .send(reorderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for negative destination index', async () => {
      const reorderData = {
        taskId: task1._id.toString(),
        sourceStatus: 'todo',
        destinationStatus: 'todo',
        destinationIndex: -1
      };

      const response = await request(app)
        .patch(`/api/projects/${testProject._id}/tasks/reorder`)
        .send(reorderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});