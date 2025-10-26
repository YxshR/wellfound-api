describe('Project Management', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Set up API intercepts
    cy.intercept('GET', '/api/projects', { fixture: 'projects.json' }).as('getProjects');
    cy.intercept('POST', '/api/projects', { fixture: 'project-created.json' }).as('createProject');
    cy.intercept('PUT', '/api/projects/*', { fixture: 'project-updated.json' }).as('updateProject');
    cy.intercept('DELETE', '/api/projects/*', { statusCode: 200, body: { success: true } }).as('deleteProject');
  });

  describe('Project List Page', () => {
    it('should display the project list page', () => {
      cy.contains('Projects').should('be.visible');
      cy.contains('Manage your projects and tasks').should('be.visible');
      cy.get('button').contains('Create Project').should('be.visible');
    });

    it('should show empty state when no projects exist', () => {
      cy.intercept('GET', '/api/projects', { body: { data: [] } }).as('getEmptyProjects');
      cy.reload();
      cy.wait('@getEmptyProjects');
      
      cy.contains('No projects yet').should('be.visible');
      cy.contains('Create your first project to get started').should('be.visible');
      cy.get('button').contains('Create Your First Project').should('be.visible');
    });

    it('should display projects when they exist', () => {
      cy.wait('@getProjects');
      cy.get('.project-card').should('have.length.at.least', 1);
      cy.get('.project-title').should('be.visible');
      cy.get('button').contains('Open Project').should('be.visible');
    });

    it('should filter projects by search term', () => {
      cy.wait('@getProjects');
      cy.get('.search-input').type('Test Project');
      // Projects should be filtered based on search term
      cy.get('.project-card').should('have.length.at.most', 3);
    });
  });

  describe('Project Creation', () => {
    it('should open create project modal', () => {
      cy.get('button').contains('Create Project').click();
      cy.contains('Create New Project').should('be.visible');
      cy.get('input[placeholder="Enter project name"]').should('be.visible');
      cy.get('textarea[placeholder*="description"]').should('be.visible');
    });

    it('should create a new project successfully', () => {
      cy.get('button').contains('Create Project').click();
      
      // Fill in project details
      cy.get('input[placeholder="Enter project name"]').type('Test Project');
      cy.get('textarea[placeholder*="description"]').type('This is a test project description');
      
      // Submit the form
      cy.get('button').contains('Create Project').click();
      
      cy.wait('@createProject');
      cy.contains('Project created successfully!').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.get('button').contains('Create Project').click();
      
      // Try to submit without name
      cy.get('button').contains('Create Project').should('be.disabled');
      
      // Add name and submit should be enabled
      cy.get('input[placeholder="Enter project name"]').type('Test Project');
      cy.get('button').contains('Create Project').should('not.be.disabled');
    });

    it('should close modal on cancel', () => {
      cy.get('button').contains('Create Project').click();
      cy.get('button').contains('Cancel').click();
      cy.contains('Create New Project').should('not.exist');
    });
  });

  describe('Project Editing', () => {
    beforeEach(() => {
      cy.wait('@getProjects');
    });

    it('should open edit modal for existing project', () => {
      cy.get('.project-card').first().find('button[title="Edit project"]').click();
      cy.contains('Edit Project').should('be.visible');
      cy.get('input[placeholder="Enter project name"]').should('have.value');
    });

    it('should update project successfully', () => {
      cy.get('.project-card').first().find('button[title="Edit project"]').click();
      
      // Update project details
      cy.get('input[placeholder="Enter project name"]').clear().type('Updated Project Name');
      cy.get('textarea[placeholder*="description"]').clear().type('Updated description');
      
      // Submit the form
      cy.get('button').contains('Update Project').click();
      
      cy.wait('@updateProject');
      cy.contains('Project updated successfully!').should('be.visible');
    });
  });

  describe('Project Deletion', () => {
    beforeEach(() => {
      cy.wait('@getProjects');
    });

    it('should open delete confirmation modal', () => {
      cy.get('.project-card').first().find('button[title="Delete project"]').click();
      cy.contains('Delete Project').should('be.visible');
      cy.contains('Are you sure you want to delete').should('be.visible');
      cy.contains('This action cannot be undone').should('be.visible');
    });

    it('should delete project successfully', () => {
      cy.get('.project-card').first().find('button[title="Delete project"]').click();
      cy.get('button').contains('Delete Project').click();
      
      cy.wait('@deleteProject');
      cy.contains('Project deleted successfully!').should('be.visible');
    });

    it('should cancel deletion', () => {
      cy.get('.project-card').first().find('button[title="Delete project"]').click();
      cy.get('button').contains('Cancel').click();
      cy.contains('Delete Project').should('not.exist');
    });
  });

  describe('Project Navigation', () => {
    beforeEach(() => {
      cy.wait('@getProjects');
    });

    it('should navigate to project board when clicking project title', () => {
      cy.intercept('GET', '/api/projects/*', { fixture: 'project-details.json' }).as('getProject');
      cy.intercept('GET', '/api/projects/*/tasks', { fixture: 'tasks.json' }).as('getTasks');
      
      cy.get('.project-title').first().click();
      
      cy.wait('@getProject');
      cy.wait('@getTasks');
      cy.url().should('include', '/projects/');
    });

    it('should navigate to project board when clicking Open Project button', () => {
      cy.intercept('GET', '/api/projects/*', { fixture: 'project-details.json' }).as('getProject');
      cy.intercept('GET', '/api/projects/*/tasks', { fixture: 'tasks.json' }).as('getTasks');
      
      cy.get('button').contains('Open Project').first().click();
      
      cy.wait('@getProject');
      cy.wait('@getTasks');
      cy.url().should('include', '/projects/');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      cy.viewport(375, 667);
      cy.wait('@getProjects');
      
      // Check that elements are still visible and functional
      cy.contains('Projects').should('be.visible');
      cy.get('button').contains('Create Project').should('be.visible');
      cy.get('.projects-grid').should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport(768, 1024);
      cy.wait('@getProjects');
      
      // Check that layout adapts to tablet size
      cy.contains('Projects').should('be.visible');
      cy.get('.projects-grid').should('be.visible');
      cy.get('.project-card').should('be.visible');
    });

    it('should work on desktop devices', () => {
      cy.viewport(1920, 1080);
      cy.wait('@getProjects');
      
      // Check that layout works on large screens
      cy.contains('Projects').should('be.visible');
      cy.get('.projects-grid').should('be.visible');
      cy.get('.project-card').should('be.visible');
    });
  });
});