// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom commands for the Project & Task Management System

// Command to create a test project
Cypress.Commands.add('createProject', (name, description = '') => {
  cy.get('[data-testid="create-project-btn"]').click();
  cy.get('[data-testid="project-name-input"]').type(name);
  if (description) {
    cy.get('[data-testid="project-description-input"]').type(description);
  }
  cy.get('[data-testid="create-project-submit"]').click();
  cy.contains('Project created successfully!').should('be.visible');
});

// Command to create a test task
Cypress.Commands.add('createTask', (columnId, title, description = '') => {
  cy.get(`[data-testid="add-task-${columnId}"]`).click();
  cy.get('[data-testid="task-title-input"]').type(title);
  if (description) {
    cy.get('[data-testid="task-description-input"]').type(description);
  }
  cy.get('[data-testid="task-submit"]').click();
});

// Command to wait for API calls to complete
Cypress.Commands.add('waitForApiCall', (alias) => {
  cy.wait(alias);
});

// Command to check responsive behavior
Cypress.Commands.add('checkResponsive', () => {
  // Test mobile viewport
  cy.viewport(375, 667);
  cy.wait(500);
  
  // Test tablet viewport
  cy.viewport(768, 1024);
  cy.wait(500);
  
  // Test desktop viewport
  cy.viewport(1280, 720);
  cy.wait(500);
});

// Command to clean up test data
Cypress.Commands.add('cleanupTestData', () => {
  // This would typically make API calls to clean up test data
  // For now, we'll just reload the page
  cy.reload();
});

// Command to mock AI responses
Cypress.Commands.add('mockAiResponse', (response) => {
  cy.intercept('POST', '/api/ai/**', {
    statusCode: 200,
    body: { success: true, data: response }
  }).as('aiRequest');
});