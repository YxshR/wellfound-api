import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { projectsAPI } from '../api/projects';
import Column from '../components/Column';
import TaskModal from '../components/TaskModal';
import AiAssistant from '../components/AiAssistant';
import Loading from '../components/Loading';
import { showError } from '../utils/toast';
import { handleError } from '../utils/errorHandler';
import './ProjectBoard.css';

const ProjectBoard = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [createTaskColumnId, setCreateTaskColumnId] = useState(null);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [dragInProgress, setDragInProgress] = useState(false);

  // Default columns if project doesn't have custom columns
  const defaultColumns = [
    { id: 'todo', title: 'To Do', order: 0 },
    { id: 'inprogress', title: 'In Progress', order: 1 },
    { id: 'done', title: 'Done', order: 2 }
  ];

  const loadProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load project details and tasks in parallel
      const [projectResponse, tasksResponse] = await Promise.all([
        projectsAPI.getById(projectId),
        projectsAPI.getTasks(projectId)
      ]);

      setProject(projectResponse.data);
      setTasks(tasksResponse.data || []);
    } catch (err) {
      const errorInfo = handleError(err, {
        context: 'Loading project data',
        customMessage: 'Failed to load project data. Please try again.',
        showToast: false // We'll show error in UI instead
      });
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const handleDragStart = () => {
    setDragInProgress(true);
  };

  const handleDragEnd = async (result) => {
    setDragInProgress(false);
    
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the task being moved
    const task = tasks.find(t => t._id === draggableId);
    if (!task) return;

    // Store original tasks for rollback
    const originalTasks = [...tasks];

    // Create optimistic update
    const newTasks = Array.from(tasks);
    const taskIndex = newTasks.findIndex(t => t._id === draggableId);
    
    // Remove task from current position
    newTasks.splice(taskIndex, 1);
    
    // Update task status if moved to different column
    const updatedTask = {
      ...task,
      status: destination.droppableId
    };
    
    // Find insertion point in destination column
    const destinationTasks = newTasks.filter(t => t.status === destination.droppableId);
    const insertIndex = destination.index;
    
    // Insert at correct position
    const allTasksBeforeDestination = newTasks.filter(t => t.status !== destination.droppableId);
    const finalTasks = [
      ...allTasksBeforeDestination,
      ...destinationTasks.slice(0, insertIndex),
      updatedTask,
      ...destinationTasks.slice(insertIndex)
    ];

    // Apply optimistic update
    setTasks(finalTasks);

    try {
      // Prepare reorder data for backend
      const reorderData = {
        taskId: draggableId,
        sourceStatus: source.droppableId,
        destinationStatus: destination.droppableId,
        sourceIndex: source.index,
        destinationIndex: destination.index
      };

      // Send update to backend
      await projectsAPI.reorderTasks(projectId, reorderData);
      
      // Reload tasks to ensure consistency
      const tasksResponse = await projectsAPI.getTasks(projectId);
      setTasks(tasksResponse.data || []);
    } catch (err) {
      // Rollback optimistic update
      setTasks(originalTasks);
      handleError(err, {
        context: 'Moving task',
        customMessage: 'Failed to move task. Please try again.'
      });
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setCreateTaskColumnId(null);
    setIsTaskModalOpen(true);
  };

  const handleAddTask = (columnId) => {
    setSelectedTask(null);
    setCreateTaskColumnId(columnId);
    setIsTaskModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setCreateTaskColumnId(null);
  };

  const handleTaskUpdate = (updatedTask) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task._id === updatedTask._id ? updatedTask : task
      )
    );
  };

  const handleTaskCreate = (newTask) => {
    setTasks(prevTasks => [...prevTasks, newTask]);
  };

  const handleTaskDelete = (taskId) => {
    setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
  };

  const handleOpenAiAssistant = () => {
    setIsAiAssistantOpen(true);
  };

  const handleCloseAiAssistant = () => {
    setIsAiAssistantOpen(false);
  };

  const getTasksByStatus = useCallback((status) => {
    return tasks
      .filter(task => task.status === status)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tasks]);

  const columns = useMemo(() => {
    return project?.columns && project.columns.length > 0 
      ? project.columns.sort((a, b) => (a.order || 0) - (b.order || 0))
      : defaultColumns;
  }, [project?.columns]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={loadProjectData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="error-message">
          <h2>Project Not Found</h2>
          <p>The project you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-text">
            <h1>{project.name}</h1>
            {project.description && (
              <p className="project-description">{project.description}</p>
            )}
          </div>
          <button 
            className="ai-assistant-btn"
            onClick={handleOpenAiAssistant}
            title="Open AI Assistant"
          >
            🤖 AI Assistant
          </button>
        </div>
      </div>
      
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={`kanban-board ${dragInProgress ? 'drag-in-progress' : ''}`}>
          {columns.map(column => (
            <Column
              key={column.id}
              column={column}
              tasks={getTasksByStatus(column.id)}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
            />
          ))}
        </div>
      </DragDropContext>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        projectId={projectId}
        columnId={createTaskColumnId}
        onTaskUpdate={handleTaskUpdate}
        onTaskCreate={handleTaskCreate}
        onTaskDelete={handleTaskDelete}
      />

      <AiAssistant
        isOpen={isAiAssistantOpen}
        onClose={handleCloseAiAssistant}
        projectId={projectId}
        project={project}
        tasks={tasks}
      />
    </div>
  );
};

export default ProjectBoard;