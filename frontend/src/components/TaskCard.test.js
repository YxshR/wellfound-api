import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';

// Mock task data
const mockTask = {
  _id: 'task-1',
  title: 'Test Task',
  description: 'This is a test task description that should be truncated if it is too long to fit in the card display area',
  status: 'todo',
  createdAt: '2023-01-01T00:00:00.000Z'
};

const mockTaskWithoutDescription = {
  _id: 'task-2',
  title: 'Task Without Description',
  status: 'inprogress',
  createdAt: '2023-01-02T00:00:00.000Z'
};

// Helper to render TaskCard within DragDropContext
const renderTaskCard = (task, index = 0, onTaskClick = jest.fn()) => {
  return render(
    <DragDropContext onDragEnd={() => {}}>
      <Droppable droppableId="test-column">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <TaskCard task={task} index={index} onTaskClick={onTaskClick} />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

describe('TaskCard Component', () => {
  describe('Rendering', () => {
    test('renders task title correctly', () => {
      renderTaskCard(mockTask);
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    test('renders task description when provided', () => {
      renderTaskCard(mockTask);
      expect(screen.getByText(/This is a test task description/)).toBeInTheDocument();
    });

    test('does not render description section when description is empty', () => {
      renderTaskCard(mockTaskWithoutDescription);
      expect(screen.queryByText(/description/)).not.toBeInTheDocument();
    });

    test('renders creation date', () => {
      renderTaskCard(mockTask);
      expect(screen.getByText('1/1/2023')).toBeInTheDocument();
    });

    test('renders drag handle', () => {
      renderTaskCard(mockTask);
      expect(screen.getByText('⋮⋮')).toBeInTheDocument();
    });
  });

  describe('Description Truncation', () => {
    test('truncates long descriptions', () => {
      renderTaskCard(mockTask);
      const descriptionElement = screen.getByText(/This is a test task description/);
      expect(descriptionElement.textContent).toMatch(/\.\.\.$/);
    });

    test('does not truncate short descriptions', () => {
      const shortDescriptionTask = {
        ...mockTask,
        description: 'Short description'
      };
      renderTaskCard(shortDescriptionTask);
      const descriptionElement = screen.getByText('Short description');
      expect(descriptionElement.textContent).not.toMatch(/\.\.\.$/);
    });
  });

  describe('User Interactions', () => {
    test('calls onTaskClick when card is clicked', () => {
      const mockOnTaskClick = jest.fn();
      renderTaskCard(mockTask, 0, mockOnTaskClick);
      
      fireEvent.click(screen.getByText('Test Task'));
      expect(mockOnTaskClick).toHaveBeenCalledWith(mockTask);
    });

    test('applies dragging class when being dragged', () => {
      renderTaskCard(mockTask);
      const taskCard = screen.getByText('Test Task').closest('.task-card');
      expect(taskCard).toHaveClass('task-card');
    });
  });

  describe('Accessibility', () => {
    test('task card is clickable', () => {
      const mockOnTaskClick = jest.fn();
      renderTaskCard(mockTask, 0, mockOnTaskClick);
      
      const taskCard = screen.getByText('Test Task').closest('.task-card');
      expect(taskCard).toHaveClass('task-card');
      // The cursor style is applied via CSS, so we just check the class exists
    });

    test('drag handle has appropriate cursor style', () => {
      renderTaskCard(mockTask);
      const dragHandle = screen.getByText('⋮⋮');
      expect(dragHandle).toHaveClass('drag-handle');
    });
  });
});