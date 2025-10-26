import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectList from './ProjectList';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

// Mock the API
jest.mock('../api/projects', () => ({
  projectsAPI: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getById: jest.fn(),
    getTasks: jest.fn(),
    createTask: jest.fn(),
    reorderTasks: jest.fn()
  }
}));

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Helper function to render component with router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Mock project data
const mockProjects = [
  {
    _id: '1',
    name: 'Test Project 1',
    description: 'Test description 1',
    createdAt: '2023-01-01T00:00:00.000Z'
  },
  {
    _id: '2',
    name: 'Test Project 2',
    description: 'Test description 2',
    createdAt: '2023-01-02T00:00:00.000Z'
  }
];

// Import the mocked API after the mock is set up
const { projectsAPI } = require('../api/projects');

describe('ProjectList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    projectsAPI.getAll.mockResolvedValue({ data: mockProjects });
  });

  describe('Component Rendering', () => {
    test('renders page header with title and description', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Projects')).toBeInTheDocument();
        expect(screen.getByText('Manage your projects and tasks')).toBeInTheDocument();
        expect(screen.getByText('Create Project')).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      renderWithRouter(<ProjectList />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    test('renders project list after loading', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
        expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      });
    });

    test('renders empty state when no projects exist', async () => {
      projectsAPI.getAll.mockResolvedValue({ data: [] });
      
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('No projects yet')).toBeInTheDocument();
        expect(screen.getByText('Create your first project to get started with task management.')).toBeInTheDocument();
      });
    });

    test('renders error state when API fails', async () => {
      projectsAPI.getAll.mockRejectedValue(new Error('API Error'));
      
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load projects. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Project Creation', () => {
    test('opens create modal when create button is clicked', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Create Project'));
      
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter project name')).toBeInTheDocument();
    });

    test('creates new project successfully', async () => {
      const newProject = {
        _id: '3',
        name: 'New Project',
        description: 'New description',
        createdAt: '2023-01-03T00:00:00.000Z'
      };
      
      projectsAPI.create.mockResolvedValue({ data: newProject });
      
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      // Open create modal
      const createButtons = screen.getAllByText('Create Project');
      fireEvent.click(createButtons[0]); // Click the header button
      
      // Fill form
      fireEvent.change(screen.getByPlaceholderText('Enter project name'), {
        target: { value: 'New Project' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter project description (optional)'), {
        target: { value: 'New description' }
      });
      
      // Submit form - use the submit button in modal (type="submit")
      const submitButtons = screen.getAllByRole('button', { name: /create project/i });
      const modalSubmitButton = submitButtons.find(btn => btn.type === 'submit');
      fireEvent.click(modalSubmitButton);
      
      await waitFor(() => {
        expect(projectsAPI.create).toHaveBeenCalledWith({
          name: 'New Project',
          description: 'New description'
        });
      });
    });

    test('validates required fields in create form', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      // Open create modal
      const createButtons = screen.getAllByText('Create Project');
      fireEvent.click(createButtons[0]); // Click the header button
      
      // Try to submit without name - find the submit button by role
      const submitButtons = screen.getAllByRole('button', { name: /create project/i });
      const modalSubmitButton = submitButtons.find(btn => btn.type === 'submit');
      expect(modalSubmitButton).toBeDisabled();
      
      // Add name
      fireEvent.change(screen.getByPlaceholderText('Enter project name'), {
        target: { value: 'Test Name' }
      });
      
      expect(modalSubmitButton).not.toBeDisabled();
    });

    test('closes create modal when cancel is clicked', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      // Open create modal
      const createButtons = screen.getAllByText('Create Project');
      fireEvent.click(createButtons[0]); // Click the header button
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      
      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
    });
  });

  describe('Project Editing', () => {
    test('opens edit modal when edit button is clicked', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      // Click edit button (first edit icon)
      const editButtons = screen.getAllByTitle('Edit project');
      fireEvent.click(editButtons[0]);
      
      expect(screen.getByText('Edit Project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Project 1')).toBeInTheDocument();
    });

    test('updates project successfully', async () => {
      const updatedProject = {
        _id: '1',
        name: 'Updated Project',
        description: 'Updated description',
        createdAt: '2023-01-01T00:00:00.000Z'
      };
      
      projectsAPI.update.mockResolvedValue({ data: updatedProject });
      
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      // Open edit modal
      const editButtons = screen.getAllByTitle('Edit project');
      fireEvent.click(editButtons[0]);
      
      // Update form
      const nameInput = screen.getByDisplayValue('Test Project 1');
      fireEvent.change(nameInput, { target: { value: 'Updated Project' } });
      
      // Submit form
      fireEvent.click(screen.getByText('Update Project'));
      
      await waitFor(() => {
        expect(projectsAPI.update).toHaveBeenCalledWith('1', {
          name: 'Updated Project',
          description: 'Test description 1'
        });
      });
    });
  });

  describe('Project Deletion', () => {
    test('opens delete modal when delete button is clicked', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      // Click delete button (first delete icon)
      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);
      
      expect(screen.getByRole('heading', { name: /delete project/i })).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });

    test('deletes project successfully', async () => {
      projectsAPI.delete.mockResolvedValue({});
      
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      // Open delete modal
      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);
      
      // Confirm deletion - use the delete button in modal
      const confirmDeleteButton = screen.getByRole('button', { name: /delete project/i });
      fireEvent.click(confirmDeleteButton);
      
      await waitFor(() => {
        expect(projectsAPI.delete).toHaveBeenCalledWith('1');
      });
    });

    test('cancels deletion when cancel is clicked', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      // Open delete modal
      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);
      
      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(screen.queryByText('Delete Project')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    test('navigates to project board when project title is clicked', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Test Project 1'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });

    test('navigates to project board when Open Project button is clicked', async () => {
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      const openButtons = screen.getAllByText('Open Project');
      fireEvent.click(openButtons[0]);
      
      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });
  });

  describe('Error Handling', () => {
    test('displays error message when project creation fails', async () => {
      projectsAPI.create.mockRejectedValue(new Error('Creation failed'));
      
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
      
      // Open create modal and submit
      const createButtons = screen.getAllByText('Create Project');
      fireEvent.click(createButtons[0]); // Click the header button
      fireEvent.change(screen.getByPlaceholderText('Enter project name'), {
        target: { value: 'Test Project' }
      });
      
      // Submit using the form submit button
      const submitButtons = screen.getAllByRole('button', { name: /create project/i });
      const modalSubmitButton = submitButtons.find(btn => btn.type === 'submit');
      fireEvent.click(modalSubmitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create project. Please try again.')).toBeInTheDocument();
      });
    });

    test('dismisses error message when dismiss button is clicked', async () => {
      projectsAPI.getAll.mockRejectedValue(new Error('API Error'));
      
      renderWithRouter(<ProjectList />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load projects. Please try again.')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Dismiss'));
      
      expect(screen.queryByText('Failed to load projects. Please try again.')).not.toBeInTheDocument();
    });
  });
});