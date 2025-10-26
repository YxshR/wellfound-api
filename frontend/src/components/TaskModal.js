import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../api/tasks';
import { projectsAPI } from '../api/projects';
import { showSuccess } from '../utils/toast';
import { handleError } from '../utils/errorHandler';
import { useFormValidation, validationRules, ValidatedInput, ValidationSummary } from './FormValidation';
import Loading from './Loading';
import './TaskModal.css';

const TaskModal = ({ 
  isOpen, 
  onClose, 
  task, 
  projectId, 
  columnId, 
  onTaskUpdate, 
  onTaskCreate, 
  onTaskDelete 
}) => {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCreateMode = !task;
  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'inprogress', label: 'In Progress' },
    { value: 'done', label: 'Done' }
  ];

  // Form validation
  const formValidation = useFormValidation(
    { title: '', description: '', status: 'todo' },
    {
      title: [
        validationRules.required,
        validationRules.maxLength(200)
      ],
      description: [
        validationRules.maxLength(1000)
      ]
    }
  );

  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Edit mode - populate with existing task data
        formValidation.handleChange('title', task.title || '');
        formValidation.handleChange('description', task.description || '');
        formValidation.handleChange('status', task.status || 'todo');
        setIsEditing(false);
      } else {
        // Create mode - use defaults
        formValidation.reset();
        formValidation.handleChange('status', columnId || 'todo');
        setIsEditing(true);
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, task, columnId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formValidation.validateAll()) {
      return;
    }

    setLoading(true);

    try {
      if (isCreateMode) {
        // Create new task
        const response = await projectsAPI.createTask(projectId, {
          title: formValidation.values.title.trim(),
          description: formValidation.values.description.trim(),
          status: formValidation.values.status
        });
        onTaskCreate(response.data);
        showSuccess('Task created successfully!');
      } else {
        // Update existing task
        const response = await tasksAPI.update(task._id, {
          title: formValidation.values.title.trim(),
          description: formValidation.values.description.trim(),
          status: formValidation.values.status
        });
        onTaskUpdate(response.data);
        showSuccess('Task updated successfully!');
      }
      
      onClose();
    } catch (err) {
      handleError(err, {
        context: isCreateMode ? 'Creating task' : 'Updating task',
        customMessage: `Failed to ${isCreateMode ? 'create' : 'update'} task. Please try again.`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    setLoading(true);

    try {
      await tasksAPI.delete(task._id);
      onTaskDelete(task._id);
      onClose();
      showSuccess('Task deleted successfully!');
    } catch (err) {
      handleError(err, {
        context: 'Deleting task',
        customMessage: 'Failed to delete task. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isCreateMode) {
      onClose();
    } else {
      setIsEditing(false);
      // Reset form data to original task data
      formValidation.handleChange('title', task.title || '');
      formValidation.handleChange('description', task.description || '');
      formValidation.handleChange('status', task.status || 'todo');
    }
    setShowDeleteConfirm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {isCreateMode ? 'Create New Task' : isEditing ? 'Edit Task' : 'Task Details'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="task-form form-container">
          <ValidationSummary errors={formValidation.errors} />
          
          <ValidatedInput
            label="Title"
            required
            error={formValidation.errors.title}
          >
            {isEditing || isCreateMode ? (
              <input
                type="text"
                className="form-input"
                value={formValidation.values.title}
                onChange={(e) => formValidation.handleChange('title', e.target.value)}
                onBlur={() => formValidation.handleBlur('title')}
                placeholder="Enter task title"
                maxLength={200}
                disabled={loading}
              />
            ) : (
              <div className="readonly-field">{formValidation.values.title}</div>
            )}
          </ValidatedInput>

          <ValidatedInput
            label="Description"
            error={formValidation.errors.description}
          >
            {isEditing || isCreateMode ? (
              <textarea
                className="form-textarea"
                value={formValidation.values.description}
                onChange={(e) => formValidation.handleChange('description', e.target.value)}
                onBlur={() => formValidation.handleBlur('description')}
                placeholder="Enter task description (optional)"
                rows={4}
                maxLength={1000}
                disabled={loading}
              />
            ) : (
              <div className="readonly-field description">
                {formValidation.values.description || 'No description provided'}
              </div>
            )}
          </ValidatedInput>

          <ValidatedInput label="Status">
            {isEditing || isCreateMode ? (
              <select
                className="form-input"
                value={formValidation.values.status}
                onChange={(e) => formValidation.handleChange('status', e.target.value)}
                disabled={loading}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="readonly-field">
                {statusOptions.find(opt => opt.value === formValidation.values.status)?.label}
              </div>
            )}
          </ValidatedInput>
          
          {loading && (
            <div className="form-loading-overlay">
              <Loading size="small" message={isCreateMode ? "Creating task..." : "Saving changes..."} />
            </div>
          )}

          {!isCreateMode && task && (
            <div className="task-meta">
              <div className="meta-item">
                <strong>Created:</strong> {new Date(task.createdAt).toLocaleString()}
              </div>
              {task.updatedAt && task.updatedAt !== task.createdAt && (
                <div className="meta-item">
                  <strong>Updated:</strong> {new Date(task.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            {isEditing || isCreateMode ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                  disabled={loading || !formValidation.values.title.trim()}
                >
                  {isCreateMode ? 'Create Task' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                {!showDeleteConfirm ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="btn btn-danger"
                      disabled={loading}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="btn btn-primary"
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn btn-secondary"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className={`btn btn-danger ${loading ? 'btn-loading' : ''}`}
                      disabled={loading}
                    >
                      Confirm Delete
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;