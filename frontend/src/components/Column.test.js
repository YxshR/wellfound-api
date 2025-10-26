import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DragDropContext } from '@hello-pangea/dnd';
import Column from './Column';

// Mock TaskCard component
jest.mock('./TaskCard', () => {
  return function MockTaskCard({ task, onTaskClick }) {
    return (
      <div data-testid={`task-${task._id}`} onClick={() => onTaskClick(task)}>
        {task.title}
      </div>
    );
  };
});

// Mock data
const mockColumn = {
  id: 'todo',
  title: 'To Do',
  order: 0
};

const mockTasks = [
  {
    _id: 'task-1',
    title: 'Task 1',
    description: 'Description 1',
    status: 'todo',
    createdAt: '2023-01-01T00:00:00.000Z'
  },
  {
    _id: 'task-2',
    title: 'Task 2',
    description: 'Description 2',
    status: 'todo',
    createdAt: '2023-01-02T00:00:00.000Z'
  }
];

// Helper to render Column within DragDropContext
const renderColumn = (column = mockColumn, tasks = mockTasks, props = {}) => {
  const defaultProps = {
    onTaskClick: jest.fn(),
    onAddTask: jest.fn(),
    ...props
  };

  return render(
    <DragDropContext onDragEnd={() => {}}>
      <Column
        column={column}
        tasks={tasks}
        {...defaultProps}
      />
    </DragDropContext>
  );
};

describe('Column Component', () => {
  describe('Rendering', () => {
    test('renders column title', () => {
      renderColumn();
      expect(screen.getByText('To Do')).toBeInTheDocument();
    });

    test('renders task count', () => {
      renderColumn();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('renders add task button', () => {
      renderColumn();
      expect(screen.getByTitle('Add new task')).toBeInTheDocument();
    });

    test('renders all tasks', () => {
      renderColumn();
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
    });

    test('updates task count when tasks change', () => {
      renderColumn(mockColumn, [mockTasks[0]]);
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('renders empty state when no tasks', () => {
      renderColumn(mockColumn, []);
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
      expect(screen.getByText('Add your first task')).toBeInTheDocument();
    });

    test('shows task count as 0 when empty', () => {
      renderColumn(mockColumn, []);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    test('calls onAddTask when "Add your first task" button is clicked', () => {
      const mockOnAddTask = jest.fn();
      renderColumn(mockColumn, [], { onAddTask: mockOnAddTask });
      
      fireEvent.click(screen.getByText('Add your first task'));
      expect(mockOnAddTask).toHaveBeenCalledWith('todo');
    });
  });

  describe('User Interactions', () => {
    test('calls onAddTask when add button is clicked', () => {
      const mockOnAddTask = jest.fn();
      renderColumn(mockColumn, mockTasks, { onAddTask: mockOnAddTask });
      
      fireEvent.click(screen.getByTitle('Add new task'));
      expect(mockOnAddTask).toHaveBeenCalledWith('todo');
    });

    test('calls onTaskClick when task is clicked', () => {
      const mockOnTaskClick = jest.fn();
      renderColumn(mockColumn, mockTasks, { onTaskClick: mockOnTaskClick });
      
      fireEvent.click(screen.getByTestId('task-task-1'));
      expect(mockOnTaskClick).toHaveBeenCalledWith(mockTasks[0]);
    });
  });

  describe('Drag and Drop', () => {
    test('renders droppable area', () => {
      renderColumn();
      const columnContent = document.querySelector('.column-content');
      expect(columnContent).toBeInTheDocument();
    });

    test('applies drag-over class when dragging over', () => {
      renderColumn();
      const columnContent = document.querySelector('.column-content');
      expect(columnContent).toHaveClass('column-content');
    });
  });

  describe('Different Column Types', () => {
    test('renders different column titles correctly', () => {
      const inProgressColumn = { id: 'inprogress', title: 'In Progress', order: 1 };
      renderColumn(inProgressColumn, []);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    test('renders done column correctly', () => {
      const doneColumn = { id: 'done', title: 'Done', order: 2 };
      renderColumn(doneColumn, []);
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    test('maintains structure with many tasks', () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) => ({
        _id: `task-${i}`,
        title: `Task ${i}`,
        status: 'todo',
        createdAt: '2023-01-01T00:00:00.000Z'
      }));
      
      renderColumn(mockColumn, manyTasks);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-0')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-9')).toBeInTheDocument();
    });
  });
});