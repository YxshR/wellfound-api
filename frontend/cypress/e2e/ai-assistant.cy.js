describe('AI Assistant', () => {
  beforeEach(() => {
    // Set up API intercepts
    cy.intercept('GET', '/api/projects/*', { fixture: 'project-details.json' }).as('getProject');
    cy.intercept('GET', '/api/projects/*/tasks', { fixture: 'tasks.json' }).as('getTasks');
    cy.intercept('POST', '/api/ai/summary', { fixture: 'ai-summary.json' }).as('aiSummary');
    cy.intercept('POST', '/api/ai/question', { fixture: 'ai-question.json' }).as('aiQuestion');
    
    // Visit a project board
    cy.visit('/projects/test-project-id');
    cy.wait('@getProject');
    cy.wait('@getTasks');
  });

  describe('AI Assistant Interface', () => {
    it('should display AI Assistant button on project board', () => {
      cy.get('button').contains('AI Assistant').should('be.visible');
    });

    it('should open AI Assistant modal when button is clicked', () => {
      cy.get('button').contains('AI Assistant').click();
      cy.contains('AI Assistant').should('be.visible');
      cy.get('.ai-assistant-modal').should('be.visible');
    });

    it('should close AI Assistant modal', () => {
      cy.get('button').contains('AI Assistant').click();
      cy.get('button[aria-label="Close"]').click();
      cy.get('.ai-assistant-modal').should('not.exist');
    });

    it('should display AI Assistant features', () => {
      cy.get('button').contains('AI Assistant').click();
      
      // Check for summary and Q&A sections
      cy.contains('Project Summary').should('be.visible');
      cy.contains('Ask a Question').should('be.visible');
      cy.get('button').contains('Generate Summary').should('be.visible');
      cy.get('textarea[placeholder*="question"]').should('be.visible');
    });
  });

  describe('Project Summarization', () => {
    beforeEach(() => {
      cy.get('button').contains('AI Assistant').click();
    });

    it('should generate project summary successfully', () => {
      cy.get('button').contains('Generate Summary').click();
      
      cy.wait('@aiSummary');
      cy.contains('Summary generated successfully').should('be.visible');
      cy.get('.summary-content').should('be.visible');
      cy.get('.summary-content').should('contain.text', 'project summary');
    });

    it('should show loading state during summary generation', () => {
      cy.intercept('POST', '/api/ai/summary', { delay: 2000, fixture: 'ai-summary.json' }).as('slowSummary');
      
      cy.get('button').contains('Generate Summary').click();
      cy.contains('Generating summary').should('be.visible');
      cy.get('.loading-spinner').should('be.visible');
      
      cy.wait('@slowSummary');
      cy.contains('Generating summary').should('not.exist');
    });

    it('should handle summary generation errors', () => {
      cy.intercept('POST', '/api/ai/summary', { statusCode: 500, body: { error: 'AI service unavailable' } }).as('summaryError');
      
      cy.get('button').contains('Generate Summary').click();
      
      cy.wait('@summaryError');
      cy.contains('Failed to generate summary').should('be.visible');
      cy.contains('AI service unavailable').should('be.visible');
    });

    it('should regenerate summary when requested', () => {
      // Generate initial summary
      cy.get('button').contains('Generate Summary').click();
      cy.wait('@aiSummary');
      
      // Regenerate summary
      cy.get('button').contains('Regenerate').click();
      cy.wait('@aiSummary');
      cy.contains('Summary updated').should('be.visible');
    });

    it('should display summary metadata', () => {
      cy.get('button').contains('Generate Summary').click();
      cy.wait('@aiSummary');
      
      // Check for metadata like token usage, cost estimation
      cy.get('.summary-metadata').should('be.visible');
      cy.contains('tokens used').should('be.visible');
    });
  });

  describe('Question and Answer', () => {
    beforeEach(() => {
      cy.get('button').contains('AI Assistant').click();
    });

    it('should ask questions about the project', () => {
      const question = 'What tasks are currently in progress?';
      
      cy.get('textarea[placeholder*="question"]').type(question);
      cy.get('button').contains('Ask Question').click();
      
      cy.wait('@aiQuestion');
      cy.get('.qa-history').should('contain.text', question);
      cy.get('.ai-response').should('be.visible');
    });

    it('should display conversation history', () => {
      // Ask first question
      cy.get('textarea[placeholder*="question"]').type('How many tasks are completed?');
      cy.get('button').contains('Ask Question').click();
      cy.wait('@aiQuestion');
      
      // Ask second question
      cy.get('textarea[placeholder*="question"]').clear().type('What is the project status?');
      cy.get('button').contains('Ask Question').click();
      cy.wait('@aiQuestion');
      
      // Check that both questions and answers are in history
      cy.get('.qa-history').should('contain.text', 'How many tasks are completed?');
      cy.get('.qa-history').should('contain.text', 'What is the project status?');
      cy.get('.ai-response').should('have.length', 2);
    });

    it('should validate question input', () => {
      // Try to ask empty question
      cy.get('button').contains('Ask Question').should('be.disabled');
      
      // Add question text
      cy.get('textarea[placeholder*="question"]').type('Test question');
      cy.get('button').contains('Ask Question').should('not.be.disabled');
    });

    it('should handle Q&A errors gracefully', () => {
      cy.intercept('POST', '/api/ai/question', { statusCode: 500, body: { error: 'AI service error' } }).as('questionError');
      
      cy.get('textarea[placeholder*="question"]').type('Test question');
      cy.get('button').contains('Ask Question').click();
      
      cy.wait('@questionError');
      cy.contains('Failed to get answer').should('be.visible');
    });

    it('should show loading state during question processing', () => {
      cy.intercept('POST', '/api/ai/question', { delay: 2000, fixture: 'ai-question.json' }).as('slowQuestion');
      
      cy.get('textarea[placeholder*="question"]').type('Test question');
      cy.get('button').contains('Ask Question').click();
      
      cy.contains('Getting answer').should('be.visible');
      cy.get('.loading-spinner').should('be.visible');
      
      cy.wait('@slowQuestion');
      cy.contains('Getting answer').should('not.exist');
    });

    it('should clear question input after asking', () => {
      cy.get('textarea[placeholder*="question"]').type('Test question');
      cy.get('button').contains('Ask Question').click();
      
      cy.wait('@aiQuestion');
      cy.get('textarea[placeholder*="question"]').should('have.value', '');
    });
  });

  describe('AI Assistant Context and Features', () => {
    beforeEach(() => {
      cy.get('button').contains('AI Assistant').click();
    });

    it('should provide context about current project', () => {
      cy.contains('Current Project:').should('be.visible');
      cy.contains('Test Project').should('be.visible');
      cy.contains('tasks in project').should('be.visible');
    });

    it('should show cost estimation and usage warnings', () => {
      cy.get('button').contains('Generate Summary').click();
      cy.wait('@aiSummary');
      
      cy.contains('Cost estimate').should('be.visible');
      cy.contains('tokens').should('be.visible');
    });

    it('should provide helpful suggestions for questions', () => {
      cy.contains('Suggested questions:').should('be.visible');
      cy.get('.suggested-question').should('have.length.at.least', 1);
    });

    it('should allow clicking suggested questions', () => {
      cy.get('.suggested-question').first().click();
      cy.get('textarea[placeholder*="question"]').should('not.have.value', '');
    });
  });

  describe('Responsive Design for AI Assistant', () => {
    it('should work on mobile devices', () => {
      cy.viewport(375, 667);
      
      cy.get('button').contains('AI Assistant').click();
      cy.get('.ai-assistant-modal').should('be.visible');
      
      // Check that interface adapts to mobile
      cy.get('button').contains('Generate Summary').should('be.visible');
      cy.get('textarea[placeholder*="question"]').should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport(768, 1024);
      
      cy.get('button').contains('AI Assistant').click();
      cy.get('.ai-assistant-modal').should('be.visible');
      
      // Check that layout works on tablet
      cy.contains('Project Summary').should('be.visible');
      cy.contains('Ask a Question').should('be.visible');
    });

    it('should maintain functionality on large screens', () => {
      cy.viewport(1920, 1080);
      
      cy.get('button').contains('AI Assistant').click();
      cy.get('.ai-assistant-modal').should('be.visible');
      
      // Check that modal scales properly
      cy.get('.ai-assistant-content').should('be.visible');
    });
  });

  describe('AI Assistant Integration', () => {
    it('should integrate with project data for context', () => {
      cy.get('button').contains('AI Assistant').click();
      
      // AI should have access to current project and task data
      cy.get('button').contains('Generate Summary').click();
      cy.wait('@aiSummary');
      
      // Summary should reference actual project data
      cy.get('.summary-content').should('contain.text', 'Test Project');
    });

    it('should handle rate limiting gracefully', () => {
      cy.intercept('POST', '/api/ai/**', { statusCode: 429, body: { error: 'Rate limit exceeded' } }).as('rateLimited');
      
      cy.get('button').contains('AI Assistant').click();
      cy.get('button').contains('Generate Summary').click();
      
      cy.wait('@rateLimited');
      cy.contains('Rate limit exceeded').should('be.visible');
      cy.contains('Please try again later').should('be.visible');
    });

    it('should cache responses to reduce API calls', () => {
      cy.get('button').contains('AI Assistant').click();
      
      // Generate summary
      cy.get('button').contains('Generate Summary').click();
      cy.wait('@aiSummary');
      
      // Close and reopen AI assistant
      cy.get('button[aria-label="Close"]').click();
      cy.get('button').contains('AI Assistant').click();
      
      // Summary should still be available (cached)
      cy.get('.summary-content').should('be.visible');
    });
  });
});