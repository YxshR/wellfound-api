const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Task = require('../../models/Task');
const Project = require('../../models/Project');

describe('Task Model', () => {
  let mongoServer;
  let testProject;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await Project.deleteMany({});
    
    // Create a test project for tasks
    testProject = await Project.create({
      name: 'Test Project',
      description: 'A project for testing tasks'
    });
  });

  describe('Task Creation', () => {
    it('should create a task with valid data', async () => {
      const taskData = {
        projectId: testProject._id,
        title: 'Test Task',
        description: 'A test task description',
        status: 'todo',
        order: 1
      };

      const task = new Task(taskData);
      const savedTask = await task.save();

      expect(savedTask._id).toBeDefined();
      expect(savedTask.projectId.toString()).toBe(testProject._id.toString());
      expect(savedTask.title).toBe(taskData.title);
      expect(savedTask.description).toBe(taskData.description);
      expect(savedTask.status).toBe(taskData.status);
      expect(savedTask.order).toBe(taskData.order);
      expect(savedTask.createdAt).toBeDefined();
      expect(savedTask.updatedAt).toBeDefined();
    });

    it('should create a task with minimal data', async () => {
      const taskData = {
        projectId: testProject._id,
        title: 'Minimal Task'
      };

      const task = new Task(taskData);
      const savedTask = await task.save();

      expect(savedTask.title).toBe(taskData.title);
      expect(savedTask.description).toBe('');
      expect(savedTask.status).toBe('todo'); // default status
      expect(savedTask.order).toBe(0); // default order
    });
  });

  describe('Task Validation', () => {
    it('should require a project ID', async () => {
      const task = new Task({ title: 'Test Task' });
      
      await expect(task.save()).rejects.toThrow('Project ID is required');
    });

    it('should require a title', async () => {
      const task = new Task({ projectId: testProject._id });
      
      await expect(task.save()).rejects.toThrow('Task title is required');
    });

    it('should not allow empty title', async () => {
      const task = new Task({ 
        projectId: testProject._id,
        title: '' 
      });
      
      await expect(task.save()).rejects.toThrow('Task title is required');
    });

    it('should not allow title longer than 200 characters', async () => {
      const longTitle = 'a'.repeat(201);
      const task = new Task({ 
        projectId: testProject._id,
        title: longTitle 
      });
      
      await expect(task.save()).rejects.toThrow('Task title cannot exceed 200 characters');
    });

    it('should not allow description longer than 1000 characters', async () => {
      const longDescription = 'a'.repeat(1001);
      const task = new Task({ 
        projectId: testProject._id,
        title: 'Test Task',
        description: longDescription 
      });
      
      await expect(task.save()).rejects.toThrow('Task description cannot exceed 1000 characters');
    });

    it('should only allow valid status values', async () => {
      const task = new Task({ 
        projectId: testProject._id,
        title: 'Test Task',
        status: 'invalid-status'
      });
      
      await expect(task.save()).rejects.toThrow('Status must be one of: todo, inprogress, done');
    });

    it('should not allow negative order values', async () => {
      const task = new Task({ 
        projectId: testProject._id,
        title: 'Test Task',
        order: -1
      });
      
      await expect(task.save()).rejects.toThrow('Order must be a non-negative number');
    });

    it('should trim whitespace from title and description', async () => {
      const task = new Task({
        projectId: testProject._id,
        title: '  Test Task  ',
        description: '  Test description  '
      });
      const savedTask = await task.save();

      expect(savedTask.title).toBe('Test Task');
      expect(savedTask.description).toBe('Test description');
    });
  });

  describe('Task Status Management', () => {
    it('should allow all valid status values', async () => {
      const statuses = ['todo', 'inprogress', 'done'];
      
      for (const status of statuses) {
        const task = new Task({
          projectId: testProject._id,
          title: `Task ${status}`,
          status: status
        });
        const savedTask = await task.save();
        expect(savedTask.status).toBe(status);
      }
    });

    it('should update updatedAt when status changes', async () => {
      const task = await Task.create({
        projectId: testProject._id,
        title: 'Test Task',
        status: 'todo'
      });

      const originalUpdatedAt = task.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      task.status = 'inprogress';
      const updatedTask = await task.save();

      expect(updatedTask.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Task Relationships', () => {
    it('should reference the correct project', async () => {
      const task = await Task.create({
        projectId: testProject._id,
        title: 'Test Task'
      });

      const populatedTask = await Task.findById(task._id).populate('project');
      expect(populatedTask.project.name).toBe(testProject.name);
    });

    it('should handle invalid project references', async () => {
      const invalidProjectId = new mongoose.Types.ObjectId();
      const task = new Task({
        projectId: invalidProjectId,
        title: 'Test Task'
      });

      // Task should save even with invalid project reference
      // (referential integrity is handled at application level)
      const savedTask = await task.save();
      expect(savedTask.projectId.toString()).toBe(invalidProjectId.toString());
    });
  });

  describe('Task Static Methods', () => {
    beforeEach(async () => {
      // Create test tasks with different statuses
      await Task.create([
        { projectId: testProject._id, title: 'Task 1', status: 'todo', order: 1 },
        { projectId: testProject._id, title: 'Task 2', status: 'todo', order: 2 },
        { projectId: testProject._id, title: 'Task 3', status: 'inprogress', order: 1 },
        { projectId: testProject._id, title: 'Task 4', status: 'done', order: 1 }
      ]);
    });

    it('should get tasks by project and status', async () => {
      const todoTasks = await Task.getByProjectAndStatus(testProject._id, 'todo');
      
      expect(todoTasks).toHaveLength(2);
      expect(todoTasks[0].title).toBe('Task 1');
      expect(todoTasks[1].title).toBe('Task 2');
      expect(todoTasks[0].order).toBeLessThanOrEqual(todoTasks[1].order);
    });

    it('should return empty array for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const tasks = await Task.getByProjectAndStatus(nonExistentId, 'todo');
      
      expect(tasks).toHaveLength(0);
    });
  });

  describe('Task Instance Methods', () => {
    it('should move task to different status', async () => {
      const task = await Task.create({
        projectId: testProject._id,
        title: 'Test Task',
        status: 'todo',
        order: 1
      });

      const originalUpdatedAt = task.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 10));

      const movedTask = await task.moveToStatus('inprogress', 5);

      expect(movedTask.status).toBe('inprogress');
      expect(movedTask.order).toBe(5);
      expect(movedTask.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Task CRUD Operations', () => {
    it('should find tasks by project', async () => {
      await Task.create([
        { projectId: testProject._id, title: 'Task 1' },
        { projectId: testProject._id, title: 'Task 2' }
      ]);

      const tasks = await Task.find({ projectId: testProject._id });
      expect(tasks).toHaveLength(2);
    });

    it('should update task details', async () => {
      const task = await Task.create({
        projectId: testProject._id,
        title: 'Original Title'
      });
      
      task.title = 'Updated Title';
      task.description = 'Updated description';
      const updatedTask = await task.save();

      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.description).toBe('Updated description');
    });

    it('should delete tasks', async () => {
      const task = await Task.create({
        projectId: testProject._id,
        title: 'To Delete'
      });
      const taskId = task._id;

      await Task.findByIdAndDelete(taskId);
      const deletedTask = await Task.findById(taskId);

      expect(deletedTask).toBeNull();
    });
  });

  describe('Task Indexes and Performance', () => {
    it('should support text search on title and description', async () => {
      await Task.create([
        { 
          projectId: testProject._id,
          title: 'Implement React component',
          description: 'Create a new React component for the dashboard'
        },
        { 
          projectId: testProject._id,
          title: 'Write tests',
          description: 'Add unit tests for the new component'
        }
      ]);

      const searchResults = await Task.find({ $text: { $search: 'React' } });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Implement React component');
    });
  });
});