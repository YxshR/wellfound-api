import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api/projects';
import Loading from '../components/Loading';
import { showSuccess, showError } from '../utils/toast';
import { handleError } from '../utils/errorHandler';
import { useFormValidation, validationRules, ValidatedInput, ValidationSummary } from '../components/FormValidation';
import { useDebounce } from '../utils/debounce';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();
  
  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Form validation for create/edit
  const createFormValidation = useFormValidation(
    { name: '', description: '' },
    {
      name: [
        validationRules.required,
        validationRules.maxLength(100)
      ],
      description: [
        validationRules.maxLength(500)
      ]
    }
  );

  const editFormValidation = useFormValidation(
    { name: '', description: '' },
    {
      name: [
        validationRules.required,
        validationRules.maxLength(100)
      ],
      description: [
        validationRules.maxLength(500)
      ]
    }
  );

  // Filtered projects based on search term
  const filteredProjects = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return projects;
    }
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchLower) ||
      (project.description && project.description.toLowerCase().includes(searchLower))
    );
  }, [projects, debouncedSearchTerm]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (err) {
      handleError(err, {
        context: 'Loading projects',
        customMessage: 'Failed to load projects. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    if (!createFormValidation.validateAll()) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await projectsAPI.create({
        name: createFormValidation.values.name.trim(),
        description: createFormValidation.values.description.trim()
      });
      
      setProjects(prev => [...prev, response.data]);
      setShowCreateModal(false);
      createFormValidation.reset();
      showSuccess('Project created successfully!');
    } catch (err) {
      handleError(err, {
        context: 'Creating project',
        customMessage: 'Failed to create project. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    
    if (!editFormValidation.validateAll() || !selectedProject) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await projectsAPI.update(selectedProject._id, {
        name: editFormValidation.values.name.trim(),
        description: editFormValidation.values.description.trim()
      });
      
      setProjects(prev => 
        prev.map(project => 
          project._id === selectedProject._id ? response.data : project
        )
      );
      setShowEditModal(false);
      setSelectedProject(null);
      editFormValidation.reset();
      showSuccess('Project updated successfully!');
    } catch (err) {
      handleError(err, {
        context: 'Updating project',
        customMessage: 'Failed to update project. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      setSubmitting(true);
      await projectsAPI.delete(selectedProject._id);
      
      setProjects(prev => prev.filter(project => project._id !== selectedProject._id));
      setShowDeleteModal(false);
      setSelectedProject(null);
      showSuccess('Project deleted successfully!');
    } catch (err) {
      handleError(err, {
        context: 'Deleting project',
        customMessage: 'Failed to delete project. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    createFormValidation.reset();
    setShowCreateModal(true);
  };

  const openEditModal = (project) => {
    setSelectedProject(project);
    editFormValidation.reset();
    // Set initial values for edit form
    editFormValidation.handleChange('name', project.name);
    editFormValidation.handleChange('description', project.description || '');
    setShowEditModal(true);
  };

  const openDeleteModal = (project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedProject(null);
    createFormValidation.reset();
    editFormValidation.reset();
  };

  const navigateToProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1>Projects</h1>
            <p>Manage your projects and tasks</p>
          </div>
          <div className="page-header-actions">
            <div className="search-container">
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              className="btn btn-primary"
              onClick={openCreateModal}
            >
              Create Project
            </button>
          </div>
        </div>
      </div>



      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>Create your first project to get started with task management.</p>
            <button 
              className="btn btn-primary"
              onClick={openCreateModal}
            >
              Create Your First Project
            </button>
          </div>
          ) : (
            <div className="empty-state">
              <h3>No projects found</h3>
              <p>No projects match your search criteria. Try adjusting your search terms.</p>
              <button 
                className="btn btn-secondary"
                onClick={() => setSearchTerm('')}
              >
                Clear Search
              </button>
            </div>
          )
        ) : (
          filteredProjects.map(project => (
            <div key={project._id} className="project-card">
              <div className="project-card-header">
                <h3 
                  className="project-title"
                  onClick={() => navigateToProject(project._id)}
                >
                  {project.name}
                </h3>
                <div className="project-actions">
                  <button
                    className="btn-icon"
                    onClick={() => openEditModal(project)}
                    title="Edit project"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => openDeleteModal(project)}
                    title="Delete project"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {project.description && (
                <p className="project-description">{project.description}</p>
              )}
              
              <div className="project-meta">
                <span className="project-date">
                  Created {formatDate(project.createdAt)}
                </span>
              </div>
              
              <button
                className="btn btn-outline btn-full-width"
                onClick={() => navigateToProject(project._id)}
              >
                Open Project
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Project</h2>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <form onSubmit={handleCreateProject} className="form-container">
              <ValidationSummary errors={createFormValidation.errors} />
              
              <ValidatedInput
                label="Project Name"
                required
                error={createFormValidation.errors.name}
              >
                <input
                  type="text"
                  className="form-input"
                  value={createFormValidation.values.name}
                  onChange={(e) => createFormValidation.handleChange('name', e.target.value)}
                  onBlur={() => createFormValidation.handleBlur('name')}
                  placeholder="Enter project name"
                  maxLength={100}
                  disabled={submitting}
                />
              </ValidatedInput>
              
              <ValidatedInput
                label="Description"
                error={createFormValidation.errors.description}
              >
                <textarea
                  className="form-textarea"
                  value={createFormValidation.values.description}
                  onChange={(e) => createFormValidation.handleChange('description', e.target.value)}
                  onBlur={() => createFormValidation.handleBlur('description')}
                  placeholder="Enter project description (optional)"
                  maxLength={500}
                  disabled={submitting}
                />
              </ValidatedInput>
              
              {submitting && (
                <div className="form-loading-overlay">
                  <Loading size="small" message="Creating project..." />
                </div>
              )}
              
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModals}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`}
                  disabled={submitting || !createFormValidation.values.name.trim()}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Project</h2>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <form onSubmit={handleEditProject} className="form-container">
              <ValidationSummary errors={editFormValidation.errors} />
              
              <ValidatedInput
                label="Project Name"
                required
                error={editFormValidation.errors.name}
              >
                <input
                  type="text"
                  className="form-input"
                  value={editFormValidation.values.name}
                  onChange={(e) => editFormValidation.handleChange('name', e.target.value)}
                  onBlur={() => editFormValidation.handleBlur('name')}
                  placeholder="Enter project name"
                  maxLength={100}
                  disabled={submitting}
                />
              </ValidatedInput>
              
              <ValidatedInput
                label="Description"
                error={editFormValidation.errors.description}
              >
                <textarea
                  className="form-textarea"
                  value={editFormValidation.values.description}
                  onChange={(e) => editFormValidation.handleChange('description', e.target.value)}
                  onBlur={() => editFormValidation.handleBlur('description')}
                  placeholder="Enter project description (optional)"
                  maxLength={500}
                  disabled={submitting}
                />
              </ValidatedInput>
              
              {submitting && (
                <div className="form-loading-overlay">
                  <Loading size="small" message="Updating project..." />
                </div>
              )}
              
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModals}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`}
                  disabled={submitting || !editFormValidation.values.name.trim()}
                >
                  Update Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProject && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Project</h2>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <div className="modal-body">
              <p>
                Are you sure you want to delete <strong>"{selectedProject.name}"</strong>?
              </p>
              <p className="text-danger">
                This action cannot be undone. All tasks in this project will also be deleted.
              </p>
            </div>
            
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModals}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-danger ${submitting ? 'btn-loading' : ''}`}
                onClick={handleDeleteProject}
                disabled={submitting}
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;