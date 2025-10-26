describe('Complete User Workflow', () => {
  beforeEach(() => {
    // Set up comprehensive API intercepts for full workflow
    cy.intercept('GET', '/api/projects', { body: { data: [] } }).as('getEmptyProjects');
    cy.intercept('POST', '/api/projects', { fixture: 'project-created.json' }).as('createProject');
    cy.intercept('GET', '/api/projects/*', { fixture: 'project-details.json' }).as('getProject');
    cy.intercept('GET', '/api/projects/*/tasks', { body: { data: [] } }).as('getEmptyTasks');
    cy.intercept('POST', '/api/projects/*/tasks', { fixture: 'task-created.json' }).as('createTask');
    cy.intercept('PUT', '/api/tasks/*', { fixture: 'task-updated.json' }).as('updateTask');
    cy.intercept('PATCH', '/api/projects/*/tasks/reorder', { statusCode: 200, body: { success: true } }).as('reorderTasks');
    cy.intercept('POST', '/api/ai/summary', { fixture: 'ai-summary.json' }).as('aiSummary');
    cy.intercept('POST', '/api/ai/question', { fixture: 'ai-question.json' }).as('aiQuestion');
    
    cy.visit('/');
  });

  it('should complete full project and task management workflow', () => {
    // Step 1: Start with empty project list
    cy.wait('@getEmptyProjects');
    cy.contains('No projects yet').should('be.visible');
    cy.contains('Create your first project to get started').should('be.visible');

    // Step 2: Create a new project
    cy.get('button').contains('Create Your First Project').click();
    cy.contains('Create New Project').should('be.visible');
    
    cy.get('input[placeholder="Enter project name"]').type('My First Project');
    cy.get('textarea[placeholder*="description"]').type('This is my first project for testing the complete workflow');
    cy.get('button').contains('Create Project').click();
    
    cy.wait('@createProject');
    cy.contains('Project created successfully!').should('be.visible');

    // Step 3: Navigate to project board
    cy.intercept('GET', '/api/projects', { fixture: 'projects.json' }).as('getProjectsWithData');
    cy.reload(); // Simulate page refresh to see new project
    cy.wait('@getProjectsWithData');
    
    cy.get('.project-title').first().click();
    cy.wait('@getProject');
    cy.wait('@getEmptyTasks');

    // Step 4: Verify project board is displayed
    cy.contains('Test Project').should('be.visible'); // From fixture
    cy.get('.kanban-board').should('be.visible');
    cy.get('.column').should('have.length', 3);
    cy.contains('To Do').should('be.visible');
    cy.contains('In Progress').should('be.visible');
    cy.contains('Done').should('be.visible');

    // Step 5: Create first task
    cy.get('.column').contains('To Do').parent().find('button').contains('Add Task').click();
    cy.contains('Create Task').should('be.visible');
    
    cy.get('input[placeholder*="task title"]').type('Setup project structure');
    cy.get('textarea[placeholder*="description"]').type('Create the basic folder structure and initialize the project');
    cy.get('button').contains('Create Task').click();
    
    cy.wait('@createTask');
    cy.contains('Task created successfully!').should('be.visible');

    // Step 6: Create second task
    cy.get('.column').contains('To Do').parent().find('button').contains('Add Task').click();
    cy.get('input[placeholder*="task title"]').type('Implement core features');
    cy.get('textarea[placeholder*="description"]').type('Build the main functionality of the application');
    cy.get('button').contains('Create Task').click();
    
    cy.wait('@createTask');

    // Step 7: Create third task
    cy.get('.column').contains('To Do').parent().find('button').contains('Add Task').click();
    cy.get('input[placeholder*="task title"]').type('Write documentation');
    cy.get('textarea[placeholder*="description"]').type('Create comprehensive documentation for the project');
    cy.get('button').contains('Create Task').click();
    
    cy.wait('@createTask');

    // Step 8: Move task to In Progress (simulate drag and drop)
    cy.intercept('GET', '/api/projects/*/tasks', { fixture: 'tasks.json' }).as('getTasksWithData');
    cy.reload(); // Refresh to see tasks
    cy.wait('@getProject');
    cy.wait('@getTasksWithData');

    // Simulate moving first task to In Progress
    cy.get('.task-card').first().trigger('dragstart');
    cy.get('.column').contains('In Progress').parent().trigger('dragenter');
    cy.get('.column').contains('In Progress').parent().trigger('drop');
    cy.wait('@reorderTasks');

    // Step 9: Edit a task
    cy.get('.task-card').first().click();
    cy.contains('Edit Task').should('be.visible');
    
    cy.get('input[placeholder*="task title"]').clear().type('Updated Task Title');
    cy.get('textarea[placeholder*="description"]').clear().type('Updated task description with more details');
    cy.get('button').contains('Update Task').click();
    
    cy.wait('@updateTask');
    cy.contains('Task updated successfully!').should('be.visible');

    // Step 10: Use AI Assistant for project summary
    cy.get('button').contains('AI Assistant').click();
    cy.contains('AI Assistant').should('be.visible');
    
    cy.get('button').contains('Generate Summary').click();
    cy.wait('@aiSummary');
    cy.contains('Summary generated successfully').should('be.visible');
    cy.get('.summary-content').should('contain.text', 'project summary');

    // Step 11: Ask AI a question
    cy.get('textarea[placeholder*="question"]').type('What is the current status of the project?');
    cy.get('button').contains('Ask Question').click();
    
    cy.wait('@aiQuestion');
    cy.get('.qa-history').should('contain.text', 'What is the current status of the project?');
    cy.get('.ai-response').should('be.visible');

    // Step 12: Close AI Assistant and verify project state
    cy.get('button[aria-label="Close"]').click();
    cy.get('.ai-assistant-modal').should('not.exist');

    // Step 13: Navigate back to project list
    cy.get('a[href="/"]').click(); // Assuming there's a home link
    cy.wait('@getProjectsWithData');
    cy.contains('Projects').should('be.visible');
    cy.get('.project-card').should('be.visible');

    // Workflow completed successfully
    cy.log('Complete workflow test passed successfully');
  });

  it('should handle responsive design throughout the workflow', () => {
    // Test the complete workflow on different screen sizes
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    viewports.forEach((viewport) => {
      cy.log(`Testing ${viewport.name} viewport: ${viewport.width}x${viewport.height}`);
      cy.viewport(viewport.width, viewport.height);

      // Test project list page
      cy.wait('@getEmptyProjects');
      cy.contains('Projects').should('be.visible');
      cy.get('button').contains('Create Your First Project').should('be.visible');

      // Test project creation modal
      cy.get('button').contains('Create Your First Project').click();
      cy.get('input[placeholder="Enter project name"]').should('be.visible');
      cy.get('button').contains('Cancel').click();

      // Navigate to project board (if projects exist)
      cy.intercept('GET', '/api/projects', { fixture: 'projects.json' }).as('getProjectsWithData');
      cy.reload();
      cy.wait('@getProjectsWithData');
      
      cy.get('.project-title').first().click();
      cy.wait('@getProject');
      cy.wait('@getEmptyTasks');

      // Test kanban board responsiveness
      cy.get('.kanban-board').should('be.visible');
      cy.get('.column').should('be.visible');

      // Test AI Assistant responsiveness
      cy.get('button').contains('AI Assistant').click();
      cy.get('.ai-assistant-modal').should('be.visible');
      cy.get('button[aria-label="Close"]').click();

      cy.log(`${viewport.name} viewport test completed`);
    });
  });

  it('should handle error scenarios gracefully', () => {
    // Test network errors
    cy.intercept('GET', '/api/projects', { forceNetworkError: true }).as('networkError');
    cy.reload();
    
    // Should show error message and retry option
    cy.contains('Failed to load').should('be.visible');
    cy.get('button').contains('Try Again').should('be.visible');

    // Test API errors
    cy.intercept('GET', '/api/projects', { statusCode: 500, body: { error: 'Server error' } }).as('serverError');
    cy.get('button').contains('Try Again').click();
    
    cy.contains('Failed to load projects').should('be.visible');

    // Test successful recovery
    cy.intercept('GET', '/api/projects', { fixture: 'projects.json' }).as('getProjectsRecovered');
    cy.get('button').contains('Try Again').click();
    cy.wait('@getProjectsRecovered');
    
    cy.get('.project-card').should('be.visible');
    cy.log('Error handling test completed successfully');
  });

  it('should maintain data consistency throughout the workflow', () => {
    // This test ensures that data remains consistent across different operations
    
    // Start with projects
    cy.intercept('GET', '/api/projects', { fixture: 'projects.json' }).as('getProjects');
    cy.reload();
    cy.wait('@getProjects');

    // Navigate to project
    cy.get('.project-title').first().click();
    cy.wait('@getProject');
    cy.intercept('GET', '/api/projects/*/tasks', { fixture: 'tasks.json' }).as('getTasks');
    cy.wait('@getTasks');

    // Verify task count and distribution
    cy.get('.task-card').should('have.length', 3);
    cy.get('.column').contains('To Do').parent().find('.task-card').should('have.length', 1);
    cy.get('.column').contains('In Progress').parent().find('.task-card').should('have.length', 1);
    cy.get('.column').contains('Done').parent().find('.task-card').should('have.length', 1);

    // Perform operations and verify consistency
    cy.get('.task-card').first().click();
    cy.get('select').select('Done');
    cy.get('button').contains('Update Task').click();
    cy.wait('@updateTask');

    // Data should remain consistent after operations
    cy.contains('Task updated successfully!').should('be.visible');
    
    cy.log('Data consistency test completed successfully');
  });
});