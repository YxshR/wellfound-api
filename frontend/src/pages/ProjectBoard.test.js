import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectBoard from './ProjectBoard';

// Mock react-router-dom
const mockParams = { projectId: 'project-1' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams,
}));

// Mock API modules
jest.mock('../api/projects', () => ({
  projectsAPI: {
    getById: jest.fn(),
    getTasks: jest.fn(),
    reorderTasks: jest.fn(),
    createTask: jest.fn()
  }
}));

// Mock components
jest.mock('../components/Column', () => {
  return function MockColumn({ column, tasks, onTaskClick, onAddTask }) {
    return (
      <div data-testid={`column-${column.id}`}>
        <h3>{column.title}</h3>
        <span data-testid={`task-count-${column.id}`}>{tasks.length}</span>
        <button onClick={() => onAddTask(column.id)}>Add Task</button>
        {tasks.map(task => (
          <div key={task._id} onClick={() => onTaskClick(task)}>
            {task.title}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../components/TaskModal', () => {
  return function MockTaskModal({ isOpen, task, columnId, onClose, onTaskCreate, onTaskUpdate, onTaskDelete }) {
    if (!isOpen) return null;
    return (
      <div data-testid="task-modal">
        <h2>{task ? 'Edit Task' : 'Create Task'}</h2>
        {task && <div>Task: {task.title}</div>}
        {columnId && <div>Column: {columnId}</div>}
        <button onClick={onClose}>Close</button>
        <button onClick={() => onTaskCreate({ _id: 'new-task', title: 'New Task' })}>
          Create
        </button>
        <button onClick={() => onTaskUpdate({ ...task, title: 'Updated Task' })}>
          Update
        </button>
        <button onClick={() => onTaskDelete(task?._id)}>Delete</button>
      </div>
    );
  };
});

jest.mock('../components/Loading', () => {
  return function MockLoading() {
    return <div data-testid="loading">Loading...</div>;
  };
});

const { projectsAPI } = require('../api/projects');

// Mock data
const mockProject = {
  _id: 'project-1',
  name: 'Test Project',
  description: 'Test project description',
  columns: [
    { id: 'todo', title: 'To Do', order: 0 },
    { id: 'inprogress', title: 'In Progress', order: 1 },
    { id: 'done', title: 'Done', order: 2 }
  ]
};

const mockTasks = [
  {
    _id: 'task-1',
    title: 'Task 1',
    description: 'Description 1',
    status: 'todo',
    order: 0,
    createdAt: '2023-01-01T00:00:00.000Z'
  },
  {
    _id: 'task-2',
    title: 'Task 2',
    description: 'Description 2',
    status: 'inprogress',
    order: 0,
    createdAt: '2023-01-02T00:00:00.000Z'
  },
  {
    _id: 'task-3',
    title: 'Task 3',
    description: 'Description 3',
    status: 'done',
    order: 0,
    createdAt: '2023-01-03T00:00:00.000Z'
  }
];

// Helper to render component with router
const renderProjectBoard = () => {
  return render(
    <BrowserRouter>
      <ProjectBoard />
    </BrowserRouter>
  );
};

describe('ProjectBoard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    projectsAPI.getById.mockResolvedValue({ data: mockProject });
    projectsAPI.getTasks.mockResolvedValue({ data: mockTasks });
  });

  describe('Loading State', () => {
    test('shows loading spinner initially', () => {
      renderProjectBoard();
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    test('hides loading spinner after data loads', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('Project Data Loading', () => {
    test('loads project and tasks data on mount', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(projectsAPI.getById).toHaveBeenCalledWith('project-1');
        expect(projectsAPI.getTasks).toHaveBeenCalledWith('project-1');
      });
    });

    test('displays project name and description', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('Test project description')).toBeInTheDocument();
      });
    });

    test('renders all columns', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByTestId('column-todo')).toBeInTheDocument();
        expect(screen.getByTestId('column-inprogress')).toBeInTheDocument();
        expect(screen.getByTestId('column-done')).toBeInTheDocument();
      });
    });

    test('displays tasks in correct columns', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByTestId('task-count-todo')).toHaveTextContent('1');
        expect(screen.getByTestId('task-count-inprogress')).toHaveTextContent('1');
        expect(screen.getByTestId('task-count-done')).toHaveTextContent('1');
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error when project loading fails', async () => {
      projectsAPI.getById.mockRejectedValue(new Error('Failed to load'));
      
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load project data. Please try again.')).toBeInTheDocument();
      });
    });

    test('displays error when tasks loading fails', async () => {
      projectsAPI.getTasks.mockRejectedValue(new Error('Failed to load tasks'));
      
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load project data. Please try again.')).toBeInTheDocument();
      });
    });

    test('shows retry button on error', async () => {
      projectsAPI.getById.mockRejectedValue(new Error('Failed to load'));
      
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    test('retries loading when retry button is clicked', async () => {
      projectsAPI.getById.mockRejectedValueOnce(new Error('Failed to load'));
      projectsAPI.getById.mockResolvedValueOnce({ data: mockProject });
      
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Try Again'));
      
      await waitFor(() => {
        expect(projectsAPI.getById).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    test('displays not found message when project does not exist', async () => {
      projectsAPI.getById.mockResolvedValue({ data: null });
      
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Project Not Found')).toBeInTheDocument();
      });
    });
  });

  describe('Default Columns', () => {
    test('uses default columns when project has no custom columns', async () => {
      const projectWithoutColumns = { ...mockProject, columns: [] };
      projectsAPI.getById.mockResolvedValue({ data: projectWithoutColumns });
      
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
      });
    });
  });

  describe('Task Modal Integration', () => {
    test('opens task modal when task is clicked', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Task 1'));
      
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.getByText('Task: Task 1')).toBeInTheDocument();
    });

    test('opens create modal when add task button is clicked', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByTestId('column-todo')).toBeInTheDocument();
      });
      
      const addButtons = screen.getAllByText('Add Task');
      fireEvent.click(addButtons[0]); // Click first add button (todo column)
      
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      expect(screen.getByText('Create Task')).toBeInTheDocument();
      expect(screen.getByText('Column: todo')).toBeInTheDocument();
    });

    test('closes modal when close button is clicked', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Task 1'));
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Close'));
      expect(screen.queryByTestId('task-modal')).not.toBeInTheDocument();
    });

    test('updates task list when task is created', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByTestId('column-todo')).toBeInTheDocument();
      });
      
      const addButtons = screen.getAllByText('Add Task');
      fireEvent.click(addButtons[0]);
      
      fireEvent.click(screen.getByText('Create'));
      
      // Wait for the task to be added to the list
      await waitFor(() => {
        expect(screen.getByText('New Task')).toBeInTheDocument();
      });
    });

    test('updates task list when task is updated', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Task 1'));
      fireEvent.click(screen.getByText('Update'));
      
      expect(screen.getByText('Updated Task')).toBeInTheDocument();
    });

    test('removes task from list when task is deleted', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Task 1'));
      fireEvent.click(screen.getByText('Delete'));
      
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    test('renders drag and drop context', async () => {
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Check that the DragDropContext is rendered (simplified test)
      const kanbanBoard = document.querySelector('.kanban-board');
      expect(kanbanBoard).toBeInTheDocument();
    });

    test('handles drag and drop API errors', async () => {
      projectsAPI.reorderTasks.mockRejectedValue(new Error('Reorder failed'));
      
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // The error handling would be tested through the drag end handler
      // This is a placeholder for more complex drag and drop testing
    });
  });

  describe('Responsive Behavior', () => {
    test('renders correctly with no tasks', async () => {
      projectsAPI.getTasks.mockResolvedValue({ data: [] });
      
      renderProjectBoard();
      
      await waitFor(() => {
        expect(screen.getByTestId('task-count-todo')).toHaveTextContent('0');
        expect(screen.getByTestId('task-count-inprogress')).toHaveTextContent('0');
        expect(screen.getByTestId('task-count-done')).toHaveTextContent('0');
      });
    });

    test('handles large number of tasks', async () => {
      const manyTasks = Array.from({ length: 50 }, (_, i) => ({
        _id: `task-${i}`,
        title: `Task ${i}`,
        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'inprogress' : 'done',
        order: i,
        createdAt: '2023-01-01T00:00:00.000Z'
      }));
      
      projectsAPI.getTasks.mockResolvedValue({ data: manyTasks });
      
      renderProjectBoard();
      
      await waitFor(() => {
        // Check that tasks are distributed across columns
        const todoCount = manyTasks.filter(t => t.status === 'todo').length;
        const inProgressCount = manyTasks.filter(t => t.status === 'inprogress').length;
        const doneCount = manyTasks.filter(t => t.status === 'done').length;
        
        expect(screen.getByTestId('task-count-todo')).toHaveTextContent(todoCount.toString());
        expect(screen.getByTestId('task-count-inprogress')).toHaveTextContent(inProgressCount.toString());
        expect(screen.getByTestId('task-count-done')).toHaveTextContent(doneCount.toString());
      });
    });
  });
});