const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../server');
const Project = require('../../models/Project');
const Task = require('../../models/Task');

describe('Task Routes', () => {
  let mongoServer;
  let projectId;
  let taskId;

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

  beforeEach(async () => {
    // Clean up database
    await Project.deleteMany({});
    await Task.deleteMany({});

    // Create a test project
    const project = new Project({
      name: 'Test Project',
      description: 'A test project for task testing'
    });
    const savedProject = await project.save();
    projectId = savedProject._id.toString();
  });

  afterAll(async () => {
    // Clean up and close connections
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('GET /api/projects/:id/tasks', () => {
    it('should retrieve all tasks for a project', async () => {
      // Create test tasks
      const task1 = new Task({
        projectId,
        title: 'Task 1',
        description: 'First task',
        status: 'todo',
        order: 0
      });
      const task2 = new Task({
        projectId,
        title: 'Task 2',
        description: 'Second task',
        status: 'inprogress',
        order: 0
      });
      await task1.save();
      await task2.save();

      const response = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.projectId).toBe(projectId);
      expect(response.body.data[0].title).toBe('Task 2'); // inprogress comes before todo in sort
      expect(response.body.data[1].title).toBe('Task 1');
    });

    it('should return empty array for project with no tasks', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/projects/${nonExistentId}/tasks`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 400 for invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/projects/invalid-id/tasks')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/projects/:id/tasks', () => {
    it('should create a new task with default todo status', async () => {
      const taskData = {
        title: 'New Task',
        description: 'A new task description'
      };

      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.description).toBe(taskData.description);
      expect(response.body.data.status).toBe('todo');
      expect(response.body.data.order).toBe(0);
      expect(response.body.data.projectId).toBe(projectId);

      // Verify task was saved to database
      const savedTask = await Task.findById(response.body.data._id);
      expect(savedTask).toBeTruthy();
      expect(savedTask.title).toBe(taskData.title);
    });

    it('should create task with custom status', async () => {
      const taskData = {
        title: 'In Progress Task',
        description: 'A task in progress',
        status: 'inprogress'
      };

      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('inprogress');
    });

    it('should assign correct order number for tasks in same status', async () => {
      // Create first task
      const task1Data = { title: 'Task 1', status: 'todo' };
      const response1 = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send(task1Data)
        .expect(201);

      expect(response1.body.data.order).toBe(0);

      // Create second task with same status
      const task2Data = { title: 'Task 2', status: 'todo' };
      const response2 = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send(task2Data)
        .expect(201);

      expect(response2.body.data.order).toBe(1);
    });

    it('should return 400 for missing title', async () => {
      const taskData = {
        description: 'Task without title'
      };

      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid status', async () => {
      const taskData = {
        title: 'Task with invalid status',
        status: 'invalid-status'
      };

      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const taskData = {
        title: 'Task for non-existent project'
      };

      const response = await request(app)
        .post(`/api/projects/${nonExistentId}/tasks`)
        .send(taskData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });
  });

  describe('GET /api/tasks/:id', () => {
    beforeEach(async () => {
      const task = new Task({
        projectId,
        title: 'Test Task',
        description: 'A test task',
        status: 'todo'
      });
      const savedTask = await task.save();
      taskId = savedTask._id.toString();
    });

    it('should retrieve specific task details', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(taskId);
      expect(response.body.data.title).toBe('Test Task');
      expect(response.body.data.project).toBeTruthy();
      expect(response.body.data.project.name).toBe('Test Project');
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/tasks/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('should return 400 for invalid task ID format', async () => {
      const response = await request(app)
        .get('/api/tasks/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    beforeEach(async () => {
      const task = new Task({
        projectId,
        title: 'Original Task',
        description: 'Original description',
        status: 'todo',
        order: 0
      });
      const savedTask = await task.save();
      taskId = savedTask._id.toString();
    });

    it('should update task details', async () => {
      const updateData = {
        title: 'Updated Task',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.status).toBe('todo'); // Should remain unchanged

      // Verify in database
      const updatedTask = await Task.findById(taskId);
      expect(updatedTask.title).toBe(updateData.title);
    });

    it('should update task status and reorder', async () => {
      // Create another task in inprogress status
      const existingTask = new Task({
        projectId,
        title: 'Existing In Progress',
        status: 'inprogress',
        order: 0
      });
      await existingTask.save();

      const updateData = {
        status: 'inprogress'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('inprogress');
      expect(response.body.data.order).toBe(1); // Should be next in order
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put(`/api/tasks/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('should return 400 for invalid status', async () => {
      const updateData = {
        status: 'invalid-status'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    beforeEach(async () => {
      const task = new Task({
        projectId,
        title: 'Task to Delete',
        description: 'This task will be deleted',
        status: 'todo'
      });
      const savedTask = await task.save();
      taskId = savedTask._id.toString();
    });

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedTask.id).toBe(taskId);
      expect(response.body.data.deletedTask.title).toBe('Task to Delete');

      // Verify task was deleted from database
      const deletedTask = await Task.findById(taskId);
      expect(deletedTask).toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/tasks/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('should return 400 for invalid task ID format', async () => {
      const response = await request(app)
        .delete('/api/tasks/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Integration Tests - Task Operations within Project Context', () => {
    it('should handle complete task lifecycle within a project', async () => {
      // Create a task
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'Lifecycle Test Task',
          description: 'Testing complete lifecycle'
        })
        .expect(201);

      const createdTaskId = createResponse.body.data._id;

      // Retrieve the task
      const getResponse = await request(app)
        .get(`/api/tasks/${createdTaskId}`)
        .expect(200);

      expect(getResponse.body.data.title).toBe('Lifecycle Test Task');

      // Update the task
      const updateResponse = await request(app)
        .put(`/api/tasks/${createdTaskId}`)
        .send({
          title: 'Updated Lifecycle Task',
          status: 'inprogress'
        })
        .expect(200);

      expect(updateResponse.body.data.title).toBe('Updated Lifecycle Task');
      expect(updateResponse.body.data.status).toBe('inprogress');

      // Verify task appears in project tasks
      const projectTasksResponse = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .expect(200);

      const updatedTask = projectTasksResponse.body.data.find(
        task => task._id === createdTaskId
      );
      expect(updatedTask.title).toBe('Updated Lifecycle Task');
      expect(updatedTask.status).toBe('inprogress');

      // Delete the task
      await request(app)
        .delete(`/api/tasks/${createdTaskId}`)
        .expect(200);

      // Verify task is no longer in project tasks
      const finalProjectTasksResponse = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .expect(200);

      const deletedTask = finalProjectTasksResponse.body.data.find(
        task => task._id === createdTaskId
      );
      expect(deletedTask).toBeUndefined();
    });

    it('should handle multiple tasks with different statuses and ordering', async () => {
      // Create multiple tasks with different statuses
      const tasks = [
        { title: 'Todo Task 1', status: 'todo' },
        { title: 'Todo Task 2', status: 'todo' },
        { title: 'InProgress Task 1', status: 'inprogress' },
        { title: 'Done Task 1', status: 'done' }
      ];

      const createdTasks = [];
      for (const taskData of tasks) {
        const response = await request(app)
          .post(`/api/projects/${projectId}/tasks`)
          .send(taskData)
          .expect(201);
        createdTasks.push(response.body.data);
      }

      // Verify tasks are properly ordered
      const projectTasksResponse = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .expect(200);

      const retrievedTasks = projectTasksResponse.body.data;
      
      // Tasks should be sorted by status (done, inprogress, todo) then by order
      expect(retrievedTasks[0].status).toBe('done');
      expect(retrievedTasks[1].status).toBe('inprogress');
      expect(retrievedTasks[2].status).toBe('todo');
      expect(retrievedTasks[3].status).toBe('todo');

      // Verify order within same status
      const todoTasks = retrievedTasks.filter(task => task.status === 'todo');
      expect(todoTasks[0].order).toBe(0);
      expect(todoTasks[1].order).toBe(1);
    });

    it('should handle task operations with invalid data gracefully', async () => {
      // Test creating task with extremely long title
      const longTitle = 'a'.repeat(201);
      await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({ title: longTitle })
        .expect(400);

      // Test creating task with extremely long description
      const longDescription = 'a'.repeat(1001);
      await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({ 
          title: 'Valid Title',
          description: longDescription 
        })
        .expect(400);

      // Create a valid task for update tests
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({ title: 'Test Task' })
        .expect(201);

      const taskId = createResponse.body.data._id;

      // Test updating with invalid data
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: '' })
        .expect(400);

      await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ order: -5 })
        .expect(400);
    });

    it('should maintain data consistency when project is deleted', async () => {
      // Create tasks in the project
      await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({ title: 'Task to be deleted with project' })
        .expect(201);

      // Verify task exists
      const tasksResponse = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .expect(200);

      expect(tasksResponse.body.data).toHaveLength(1);

      // Delete the project
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .expect(200);

      // Verify tasks are also deleted
      const remainingTasks = await Task.find({ projectId });
      expect(remainingTasks).toHaveLength(0);
    });
  });
});