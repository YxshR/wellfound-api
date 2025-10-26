import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskModal from './TaskModal';

// Mock the API modules
jest.mock('../api/tasks', () => ({
  tasksAPI: {
    update: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../api/projects', () => ({
  projectsAPI: {
    createTask: jest.fn()
  }
}));

const { tasksAPI } = require('../api/tasks');
const { projectsAPI } = require('../api/projects');

// Mock data
const mockTask = {
  _id: 'task-1',
  title: 'Test Task',
  description: 'Test description',
  status: 'todo',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z'
};

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  projectId: 'project-1',
  onTaskUpdate: jest.fn(),
  onTaskCreate: jest.fn(),
  onTaskDelete: jest.fn()
};

describe('TaskModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    test('does not render when isOpen is false', () => {
      render(<TaskModal {...mockProps} isOpen={false} />);
      expect(screen.queryByText('Task Details')).not.toBeInTheDocument();
    });

    test('renders when isOpen is true', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    test('closes when overlay is clicked', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(document.querySelector('.modal-overlay'));
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('closes when close button is clicked', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(screen.getByText('×'));
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('does not close when modal content is clicked', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(document.querySelector('.modal-content'));
      expect(mockProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Create Mode', () => {
    test('renders create mode when no task is provided', () => {
      render(<TaskModal {...mockProps} columnId="todo" />);
      expect(screen.getByText('Create New Task')).toBeInTheDocument();
      expect(screen.getByText('Create Task')).toBeInTheDocument();
    });

    test('initializes form with default values in create mode', () => {
      render(<TaskModal {...mockProps} columnId="inprogress" />);
      expect(screen.getByPlaceholderText('Enter task title')).toHaveValue('');
      expect(screen.getByRole('combobox')).toHaveValue('inprogress');
    });

    test('creates new task successfully', async () => {
      const newTask = { _id: 'new-task', title: 'New Task', status: 'todo' };
      projectsAPI.createTask.mockResolvedValue({ data: newTask });

      render(<TaskModal {...mockProps} columnId="todo" />);
      
      fireEvent.change(screen.getByPlaceholderText('Enter task title'), {
        target: { value: 'New Task' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter task description (optional)'), {
        target: { value: 'New description' }
      });
      
      fireEvent.click(screen.getByText('Create Task'));

      await waitFor(() => {
        expect(projectsAPI.createTask).toHaveBeenCalledWith('project-1', {
          title: 'New Task',
          description: 'New description',
          status: 'todo'
        });
        expect(mockProps.onTaskCreate).toHaveBeenCalledWith(newTask);
        expect(mockProps.onClose).toHaveBeenCalled();
      });
    });

    test('validates required title field', () => {
      render(<TaskModal {...mockProps} columnId="todo" />);
      
      const createButton = screen.getByText('Create Task');
      expect(createButton).toBeDisabled();
      
      fireEvent.change(screen.getByPlaceholderText('Enter task title'), {
        target: { value: 'Test Title' }
      });
      
      expect(createButton).not.toBeDisabled();
    });

    test('shows error when creation fails', async () => {
      projectsAPI.createTask.mockRejectedValue(new Error('Creation failed'));

      render(<TaskModal {...mockProps} columnId="todo" />);
      
      fireEvent.change(screen.getByPlaceholderText('Enter task title'), {
        target: { value: 'New Task' }
      });
      fireEvent.click(screen.getByText('Create Task'));

      await waitFor(() => {
        expect(screen.getByText('Failed to save task. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('View Mode', () => {
    test('renders task details in view mode', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      
      expect(screen.getByText('Task Details')).toBeInTheDocument();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('To Do')).toBeInTheDocument();
    });

    test('shows creation and update dates', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/1\/1\/2023/)).toBeInTheDocument();
    });

    test('switches to edit mode when edit button is clicked', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
    });

    test('shows delete button in view mode', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    test('populates form with existing task data', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(screen.getByText('Edit'));
      
      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toHaveValue('todo');
    });

    test('updates task successfully', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      tasksAPI.update.mockResolvedValue({ data: updatedTask });

      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(screen.getByText('Edit'));
      
      fireEvent.change(screen.getByDisplayValue('Test Task'), {
        target: { value: 'Updated Task' }
      });
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(tasksAPI.update).toHaveBeenCalledWith('task-1', {
          title: 'Updated Task',
          description: 'Test description',
          status: 'todo'
        });
        expect(mockProps.onTaskUpdate).toHaveBeenCalledWith(updatedTask);
        expect(mockProps.onClose).toHaveBeenCalled();
      });
    });

    test('cancels edit mode and reverts changes', () => {
      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(screen.getByText('Edit'));
      
      fireEvent.change(screen.getByDisplayValue('Test Task'), {
        target: { value: 'Changed Title' }
      });
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(screen.getByText('Task Details')).toBeInTheDocument();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    test('shows error when update fails', async () => {
      tasksAPI.update.mockRejectedValue(new Error('Update failed'));

      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(screen.getByText('Edit'));
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Failed to save task. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Task Deletion', () => {
    test('deletes task with confirmation', async () => {
      // Mock window.confirm
      window.confirm = jest.fn(() => true);
      tasksAPI.delete.mockResolvedValue({});

      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?');
        expect(tasksAPI.delete).toHaveBeenCalledWith('task-1');
        expect(mockProps.onTaskDelete).toHaveBeenCalledWith('task-1');
        expect(mockProps.onClose).toHaveBeenCalled();
      });
    });

    test('cancels deletion when user declines confirmation', () => {
      window.confirm = jest.fn(() => false);

      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(screen.getByText('Delete'));

      expect(tasksAPI.delete).not.toHaveBeenCalled();
      expect(mockProps.onTaskDelete).not.toHaveBeenCalled();
    });

    test('shows error when deletion fails', async () => {
      window.confirm = jest.fn(() => true);
      tasksAPI.delete.mockRejectedValue(new Error('Deletion failed'));

      render(<TaskModal {...mockProps} task={mockTask} />);
      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText('Failed to delete task. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    test('trims whitespace from title', async () => {
      const newTask = { _id: 'new-task', title: 'Trimmed Task', status: 'todo' };
      projectsAPI.createTask.mockResolvedValue({ data: newTask });

      render(<TaskModal {...mockProps} columnId="todo" />);
      
      fireEvent.change(screen.getByPlaceholderText('Enter task title'), {
        target: { value: '  Trimmed Task  ' }
      });
      fireEvent.click(screen.getByText('Create Task'));

      await waitFor(() => {
        expect(projectsAPI.createTask).toHaveBeenCalledWith('project-1', {
          title: 'Trimmed Task',
          description: '',
          status: 'todo'
        });
      });
    });

    test('shows error for empty title', async () => {
      render(<TaskModal {...mockProps} columnId="todo" />);
      
      fireEvent.change(screen.getByPlaceholderText('Enter task title'), {
        target: { value: '   ' }
      });
      fireEvent.click(screen.getByText('Create Task'));

      await waitFor(() => {
        expect(screen.getByText('Task title is required')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading state during task creation', async () => {
      projectsAPI.createTask.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<TaskModal {...mockProps} columnId="todo" />);
      
      fireEvent.change(screen.getByPlaceholderText('Enter task title'), {
        target: { value: 'New Task' }
      });
      fireEvent.click(screen.getByText('Create Task'));

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    test('disables form during loading', async () => {
      projectsAPI.createTask.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<TaskModal {...mockProps} columnId="todo" />);
      
      fireEvent.change(screen.getByPlaceholderText('Enter task title'), {
        target: { value: 'New Task' }
      });
      fireEvent.click(screen.getByText('Create Task'));

      expect(screen.getByPlaceholderText('Enter task title')).toBeDisabled();
      expect(screen.getByText('Saving...')).toBeDisabled();
    });
  });
});