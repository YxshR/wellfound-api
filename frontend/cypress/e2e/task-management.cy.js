describe('Task Management', () => {
  beforeEach(() => {
    // Set up API intercepts
    cy.intercept('GET', '/api/projects/*', { fixture: 'project-details.json' }).as('getProject');
    cy.intercept('GET', '/api/projects/*/tasks', { fixture: 'tasks.json' }).as('getTasks');
    cy.intercept('POST', '/api/projects/*/tasks', { fixture: 'task-created.json' }).as('createTask');
    cy.intercept('PUT', '/api/tasks/*', { fixture: 'task-updated.json' }).as('updateTask');
    cy.intercept('DELETE', '/api/tasks/*', { statusCode: 200, body: { success: true } }).as('deleteTask');
    cy.intercept('PATCH', '/api/projects/*/tasks/reorder', { statusCode: 200, body: { success: true } }).as('reorderTasks');
    
    // Visit a project board
    cy.visit('/projects/test-project-id');
    cy.wait('@getProject');
    cy.wait('@getTasks');
  });

  describe('Kanban Board Display', () => {
    it('should display the project board with columns', () => {
      cy.contains('Test Project').should('be.visible');
      cy.get('.kanban-board').should('be.visible');
      cy.get('.column').should('have.length', 3);
      cy.contains('To Do').should('be.visible');
      cy.contains('In Progress').should('be.visible');
      cy.contains('Done').should('be.visible');
    });

    it('should display tasks in their respective columns', () => {
      cy.get('.column').contains('To Do').parent().find('.task-card').should('exist');
      cy.get('.task-card').should('have.length.at.least', 1);
      cy.get('.task-card').first().should('contain.text');
    });

    it('should show add task buttons in each column', () => {
      cy.get('.column').each(($column) => {
        cy.wrap($column).find('button').contains('Add Task').should('be.visible');
      });
    });
  });

  describe('Task Creation', () => {
    it('should open task creation modal from column', () => {
      cy.get('.column').contains('To Do').parent().find('button').contains('Add Task').click();
      cy.contains('Create Task').should('be.visible');
      cy.get('input[placeholder*="task title"]').should('be.visible');
      cy.get('textarea[placeholder*="description"]').should('be.visible');
    });

    it('should create a new task successfully', () => {
      cy.get('.column').contains('To Do').parent().find('button').contains('Add Task').click();
      
      // Fill in task details
      cy.get('input[placeholder*="task title"]').type('New Test Task');
      cy.get('textarea[placeholder*="description"]').type('This is a test task description');
      
      // Submit the form
      cy.get('button').contains('Create Task').click();
      
      cy.wait('@createTask');
      cy.contains('Task created successfully!').should('be.visible');
    });

    it('should validate required fields for task creation', () => {
      cy.get('.column').contains('To Do').parent().find('button').contains('Add Task').click();
      
      // Try to submit without title
      cy.get('button').contains('Create Task').should('be.disabled');
      
      // Add title and submit should be enabled
      cy.get('input[placeholder*="task title"]').type('Test Task');
      cy.get('button').contains('Create Task').should('not.be.disabled');
    });

    it('should close task modal on cancel', () => {
      cy.get('.column').contains('To Do').parent().find('button').contains('Add Task').click();
      cy.get('button').contains('Cancel').click();
      cy.contains('Create Task').should('not.exist');
    });
  });

  describe('Task Editing', () => {
    it('should open task edit modal when clicking on task', () => {
      cy.get('.task-card').first().click();
      cy.contains('Edit Task').should('be.visible');
      cy.get('input[placeholder*="task title"]').should('have.value');
    });

    it('should update task successfully', () => {
      cy.get('.task-card').first().click();
      
      // Update task details
      cy.get('input[placeholder*="task title"]').clear().type('Updated Task Title');
      cy.get('textarea[placeholder*="description"]').clear().type('Updated task description');
      
      // Submit the form
      cy.get('button').contains('Update Task').click();
      
      cy.wait('@updateTask');
      cy.contains('Task updated successfully!').should('be.visible');
    });

    it('should change task status from modal', () => {
      cy.get('.task-card').first().click();
      
      // Change status
      cy.get('select').select('In Progress');
      cy.get('button').contains('Update Task').click();
      
      cy.wait('@updateTask');
      cy.contains('Task updated successfully!').should('be.visible');
    });
  });

  describe('Task Deletion', () => {
    it('should delete task from modal', () => {
      cy.get('.task-card').first().click();
      cy.get('button').contains('Delete Task').click();
      
      // Confirm deletion
      cy.get('button').contains('Delete').click();
      
      cy.wait('@deleteTask');
      cy.contains('Task deleted successfully!').should('be.visible');
    });

    it('should cancel task deletion', () => {
      cy.get('.task-card').first().click();
      cy.get('button').contains('Delete Task').click();
      
      // Cancel deletion
      cy.get('button').contains('Cancel').click();
      cy.contains('Delete Task').should('not.exist');
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('should move task between columns using drag and drop', () => {
      // Get the first task in To Do column
      cy.get('.column').contains('To Do').parent()
        .find('.task-card').first()
        .as('sourceTask');
      
      // Get the In Progress column
      cy.get('.column').contains('In Progress').parent()
        .as('targetColumn');
      
      // Perform drag and drop
      cy.get('@sourceTask').trigger('dragstart');
      cy.get('@targetColumn').trigger('dragenter');
      cy.get('@targetColumn').trigger('dragover');
      cy.get('@targetColumn').trigger('drop');
      
      cy.wait('@reorderTasks');
    });

    it('should provide visual feedback during drag', () => {
      cy.get('.task-card').first().trigger('dragstart');
      cy.get('.kanban-board').should('have.class', 'drag-in-progress');
    });

    it('should reorder tasks within the same column', () => {
      const todoColumn = cy.get('.column').contains('To Do').parent();
      
      // Get first and second tasks
      todoColumn.find('.task-card').first().as('firstTask');
      todoColumn.find('.task-card').eq(1).as('secondTask');
      
      // Drag first task below second task
      cy.get('@firstTask').trigger('dragstart');
      cy.get('@secondTask').trigger('dragenter');
      cy.get('@secondTask').trigger('drop');
      
      cy.wait('@reorderTasks');
    });
  });

  describe('Task Details and Information', () => {
    it('should display task information on cards', () => {
      cy.get('.task-card').first().within(() => {
        cy.get('.task-title').should('be.visible');
        cy.get('.task-description').should('be.visible');
      });
    });

    it('should show full task details in modal', () => {
      cy.get('.task-card').first().click();
      
      cy.get('input[placeholder*="task title"]').should('be.visible');
      cy.get('textarea[placeholder*="description"]').should('be.visible');
      cy.get('select').should('be.visible'); // Status selector
    });

    it('should display task creation and update dates', () => {
      cy.get('.task-card').first().click();
      // Check if date information is displayed (implementation dependent)
      cy.get('.modal-content').should('contain.text', 'Created');
    });
  });

  describe('Responsive Design for Kanban Board', () => {
    it('should work on mobile devices', () => {
      cy.viewport(375, 667);
      
      // Check that kanban board adapts to mobile
      cy.get('.kanban-board').should('be.visible');
      cy.get('.column').should('be.visible');
      
      // Tasks should still be clickable
      cy.get('.task-card').first().should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport(768, 1024);
      
      // Check that columns are properly arranged
      cy.get('.kanban-board').should('be.visible');
      cy.get('.column').should('have.length', 3);
      
      // Drag and drop should still work
      cy.get('.task-card').first().should('be.visible');
    });

    it('should maintain functionality on large screens', () => {
      cy.viewport(1920, 1080);
      
      // Check that layout scales properly
      cy.get('.kanban-board').should('be.visible');
      cy.get('.column').should('be.visible');
      cy.get('.task-card').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle task creation errors gracefully', () => {
      cy.intercept('POST', '/api/projects/*/tasks', { statusCode: 500, body: { error: 'Server error' } }).as('createTaskError');
      
      cy.get('.column').contains('To Do').parent().find('button').contains('Add Task').click();
      cy.get('input[placeholder*="task title"]').type('Test Task');
      cy.get('button').contains('Create Task').click();
      
      cy.wait('@createTaskError');
      cy.contains('Failed to create task').should('be.visible');
    });

    it('should handle drag and drop errors with rollback', () => {
      cy.intercept('PATCH', '/api/projects/*/tasks/reorder', { statusCode: 500, body: { error: 'Server error' } }).as('reorderError');
      
      // Perform drag and drop
      cy.get('.task-card').first().trigger('dragstart');
      cy.get('.column').contains('In Progress').parent().trigger('drop');
      
      cy.wait('@reorderError');
      cy.contains('Failed to move task').should('be.visible');
    });

    it('should handle network errors gracefully', () => {
      cy.intercept('GET', '/api/projects/*/tasks', { forceNetworkError: true }).as('networkError');
      cy.reload();
      
      cy.contains('Failed to load').should('be.visible');
      cy.get('button').contains('Try Again').should('be.visible');
    });
  });
});