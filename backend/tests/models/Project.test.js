const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Project = require('../../models/Project');

describe('Project Model', () => {
  let mongoServer;

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
    await Project.deleteMany({});
  });

  describe('Project Creation', () => {
    it('should create a project with valid data', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project description'
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject._id).toBeDefined();
      expect(savedProject.name).toBe(projectData.name);
      expect(savedProject.description).toBe(projectData.description);
      expect(savedProject.createdAt).toBeDefined();
      expect(savedProject.columns).toHaveLength(3);
      expect(savedProject.columns[0].id).toBe('todo');
      expect(savedProject.columns[1].id).toBe('inprogress');
      expect(savedProject.columns[2].id).toBe('done');
    });

    it('should create a project with minimal data (name only)', async () => {
      const projectData = {
        name: 'Minimal Project'
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.name).toBe(projectData.name);
      expect(savedProject.description).toBe('');
      expect(savedProject.columns).toHaveLength(3);
    });

    it('should create default columns when none provided', async () => {
      const project = new Project({ name: 'Test Project' });
      const savedProject = await project.save();

      expect(savedProject.columns).toHaveLength(3);
      expect(savedProject.columns[0]).toMatchObject({
        id: 'todo',
        title: 'To Do',
        order: 0
      });
      expect(savedProject.columns[1]).toMatchObject({
        id: 'inprogress',
        title: 'In Progress',
        order: 1
      });
      expect(savedProject.columns[2]).toMatchObject({
        id: 'done',
        title: 'Done',
        order: 2
      });
    });
  });

  describe('Project Validation', () => {
    it('should require a name', async () => {
      const project = new Project({});
      
      await expect(project.save()).rejects.toThrow('Project name is required');
    });

    it('should not allow empty name', async () => {
      const project = new Project({ name: '' });
      
      await expect(project.save()).rejects.toThrow('Project name is required');
    });

    it('should not allow name longer than 100 characters', async () => {
      const longName = 'a'.repeat(101);
      const project = new Project({ name: longName });
      
      await expect(project.save()).rejects.toThrow('Project name cannot exceed 100 characters');
    });

    it('should not allow description longer than 500 characters', async () => {
      const longDescription = 'a'.repeat(501);
      const project = new Project({ 
        name: 'Test Project',
        description: longDescription 
      });
      
      await expect(project.save()).rejects.toThrow('Project description cannot exceed 500 characters');
    });

    it('should trim whitespace from name and description', async () => {
      const project = new Project({
        name: '  Test Project  ',
        description: '  Test description  '
      });
      const savedProject = await project.save();

      expect(savedProject.name).toBe('Test Project');
      expect(savedProject.description).toBe('Test description');
    });
  });

  describe('Project Custom Columns', () => {
    it('should allow custom columns', async () => {
      const customColumns = [
        { id: 'backlog', title: 'Backlog', order: 0 },
        { id: 'todo', title: 'To Do', order: 1 },
        { id: 'review', title: 'Review', order: 2 },
        { id: 'done', title: 'Done', order: 3 }
      ];

      const project = new Project({
        name: 'Custom Project',
        columns: customColumns
      });
      const savedProject = await project.save();

      expect(savedProject.columns).toHaveLength(4);
      expect(savedProject.columns[0].id).toBe('backlog');
      expect(savedProject.columns[2].id).toBe('review');
    });

    it('should require column id and title', async () => {
      const project = new Project({
        name: 'Test Project',
        columns: [{ title: 'Missing ID' }]
      });

      await expect(project.save()).rejects.toThrow('Column id is required');
    });
  });

  describe('Project CRUD Operations', () => {
    it('should find projects by name', async () => {
      await Project.create({ name: 'Project One' });
      await Project.create({ name: 'Project Two' });

      const foundProject = await Project.findOne({ name: 'Project One' });
      expect(foundProject.name).toBe('Project One');
    });

    it('should update project details', async () => {
      const project = await Project.create({ name: 'Original Name' });
      
      project.name = 'Updated Name';
      project.description = 'Updated description';
      const updatedProject = await project.save();

      expect(updatedProject.name).toBe('Updated Name');
      expect(updatedProject.description).toBe('Updated description');
    });

    it('should delete projects', async () => {
      const project = await Project.create({ name: 'To Delete' });
      const projectId = project._id;

      await Project.findByIdAndDelete(projectId);
      const deletedProject = await Project.findById(projectId);

      expect(deletedProject).toBeNull();
    });
  });

  describe('Project Indexes and Performance', () => {
    it('should support text search on name and description', async () => {
      await Project.create({ 
        name: 'Web Development Project',
        description: 'Building a React application'
      });
      await Project.create({ 
        name: 'Mobile App',
        description: 'Creating a mobile application'
      });

      const searchResults = await Project.find({ $text: { $search: 'React' } });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Web Development Project');
    });
  });
});