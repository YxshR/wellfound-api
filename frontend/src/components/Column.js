import React, { memo, useMemo, useCallback } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import './Column.css';

const Column = memo(({ column, tasks, onTaskClick, onAddTask }) => {
  const taskCount = useMemo(() => tasks.length, [tasks.length]);
  
  const handleAddTask = useCallback(() => {
    onAddTask(column.id);
  }, [onAddTask, column.id]);
  
  return (
    <div className="column">
      <div className="column-header">
        <h3 className="column-title">{column.title}</h3>
        <span className="task-count">{taskCount}</span>
        <button 
          className="add-task-btn"
          onClick={handleAddTask}
          title="Add new task"
        >
          +
        </button>
      </div>
      
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-content ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task._id}
                task={task}
                index={index}
                onTaskClick={onTaskClick}
              />
            ))}
            {provided.placeholder}
            
            {tasks.length === 0 && (
              <div className="empty-column">
                <p>No tasks yet</p>
                <button 
                  className="add-first-task-btn"
                  onClick={handleAddTask}
                >
                  Add your first task
                </button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
});

Column.displayName = 'Column';

export default Column;