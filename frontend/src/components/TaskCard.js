import React, { memo, useMemo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import './TaskCard.css';

const TaskCard = memo(({ task, index, onTaskClick }) => {
  const truncatedDescription = useMemo(() => {
    if (!task.description) return '';
    const maxLength = 100;
    return task.description.length > maxLength 
      ? task.description.substring(0, maxLength) + '...' 
      : task.description;
  }, [task.description]);

  const formattedDate = useMemo(() => {
    return new Date(task.createdAt).toLocaleDateString();
  }, [task.createdAt]);

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
          onClick={() => onTaskClick(task)}
        >
          <div className="task-card-header">
            <h4 className="task-title">{task.title}</h4>
            <div className="drag-handle">⋮⋮</div>
          </div>
          {task.description && (
            <p className="task-description">
              {truncatedDescription}
            </p>
          )}
          <div className="task-meta">
            <span className="task-date">
              {formattedDate}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;