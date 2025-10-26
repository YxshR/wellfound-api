import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiAssistant from './AiAssistant';

// Mock the AI API
jest.mock('../api/ai', () => ({
  aiAPI: {
    generateSummary: jest.fn(),
    askQuestion: jest.fn(),
    getUsageStats: jest.fn(),
    clearCache: jest.fn(),
    resetUsage: jest.fn()
  }
}));

const { aiAPI } = require('../api/ai');

// Mock data
const mockProject = {
  _id: 'project-1',
  name: 'Test Project',
  description: 'Test project description'
};

const mockTasks = [
  {
    _id: 'task-1',
    title: 'Task 1',
    description: 'First task',
    status: 'todo'
  },
  {
    _id: 'task-2',
    title: 'Task 2',
    description: 'Second task',
    status: 'inprogress'
  },
  {
    _id: 'task-3',
    title: 'Task 3',
    description: 'Third task',
    status: 'done'
  }
];

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  projectId: 'project-1',
  project: mockProject,
  tasks: mockTasks
};

describe('AiAssistant Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    test('does not render when isOpen is false', () => {
      render(<AiAssistant {...mockProps} isOpen={false} />);
      expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();
    });

    test('renders when isOpen is true', () => {
      render(<AiAssistant {...mockProps} />);
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    });

    test('closes when close button is clicked', () => {
      render(<AiAssistant {...mockProps} />);
      fireEvent.click(screen.getByLabelText('Close AI Assistant'));
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('closes when overlay is clicked', () => {
      render(<AiAssistant {...mockProps} />);
      fireEvent.click(document.querySelector('.ai-assistant-overlay'));
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('does not close when modal content is clicked', () => {
      render(<AiAssistant {...mockProps} />);
      fireEvent.click(document.querySelector('.ai-assistant-modal'));
      expect(mockProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    test('renders both tabs', () => {
      render(<AiAssistant {...mockProps} />);
      expect(screen.getByText('Project Summary')).toBeInTheDocument();
      expect(screen.getByText('Ask Questions')).toBeInTheDocument();
    });

    test('starts with summary tab active', () => {
      render(<AiAssistant {...mockProps} />);
      expect(screen.getByText('Project Summary')).toHaveClass('active');
      expect(screen.getByText('Ask Questions')).not.toHaveClass('active');
    });

    test('switches to Q&A tab when clicked', () => {
      render(<AiAssistant {...mockProps} />);
      fireEvent.click(screen.getByText('Ask Questions'));
      
      expect(screen.getByText('Ask Questions')).toHaveClass('active');
      expect(screen.getByText('Project Summary')).not.toHaveClass('active');
    });

    test('resets state when modal reopens', () => {
      const { rerender } = render(<AiAssistant {...mockProps} />);
      
      // Switch to Q&A tab and add some conversation
      fireEvent.click(screen.getByText('Ask Questions'));
      
      // Close and reopen modal
      rerender(<AiAssistant {...mockProps} isOpen={false} />);
      rerender(<AiAssistant {...mockProps} isOpen={true} />);
      
      // Should be back to summary tab
      expect(screen.getByText('Project Summary')).toHaveClass('active');
    });
  });

  describe('Project Summary Tab', () => {
    test('renders summary tab content', () => {
      render(<AiAssistant {...mockProps} />);
      expect(screen.getByText('Get an AI-generated summary of your project\'s current status and tasks.')).toBeInTheDocument();
      expect(screen.getByText('Generate Summary')).toBeInTheDocument();
    });

    test('generates summary successfully', async () => {
      const mockSummaryResponse = {
        success: true,
        data: {
          summary: 'This is a test project summary.',
          metadata: {
            tokenUsage: 150
          },
          usageStats: {
            estimatedCost: 0.0025,
            rateLimitStatus: {
              requestsInLastMinute: 1,
              maxRequestsPerMinute: 60
            }
          },
          cached: false
        }
      };

      aiAPI.generateSummary.mockResolvedValue(mockSummaryResponse);

      render(<AiAssistant {...mockProps} />);
      fireEvent.click(screen.getByText('Generate Summary'));

      expect(screen.getByText('Generating...')).toBeInTheDocument();

      await waitFor(() => {
        expect(aiAPI.generateSummary).toHaveBeenCalledWith('project-1');
        expect(screen.getByText('This is a test project summary.')).toBeInTheDocument();
        expect(screen.getByText(/Tokens used: 150/)).toBeInTheDocument();
        expect(screen.getByText(/Estimated cost: \$0\.0025/)).toBeInTheDocument();
      });
    });

    test('shows cached summary indicator', async () => {
      const mockSummaryResponse = {
        success: true,
        data: {
          summary: 'Cached summary.',
          cached: true,
          cacheAge: 120,
          metadata: {
            tokenUsage: 100
          }
        }
      };

      aiAPI.generateSummary.mockResolvedValue(mockSummaryResponse);

      render(<AiAssistant {...mockProps} />);
      fireEvent.click(screen.getByText('Generate Summary'));

      await waitFor(() => {
        expect(screen.getByText(/📋 Cached result \(120s ago\)/)).toBeInTheDocument();
      });
    });

    test('handles summary generation error', async () => {
      aiAPI.generateSummary.mockRejectedValue(new Error('AI service unavailable'));

      render(<AiAssistant {...mockProps} />);
      fireEvent.click(screen.getByText('Generate Summary'));

      await waitFor(() => {
        expect(screen.getByText('AI service unavailable')).toBeInTheDocument();
      });
    });

    test('handles rate limit error', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.response = { status: 429 };
      aiAPI.generateSummary.mockRejectedValue(rateLimitError);

      render(<AiAssistant {...mockProps} />);
      fireEvent.click(screen.getByText('Generate Summary'));

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded. Please wait a moment before trying again.')).toBeInTheDocument();
      });
    });

    test('handles service unavailable error', async () => {
      const serviceError = new Error('Service unavailable');
      serviceError.response = { status: 503 };
      aiAPI.generateSummary.mockRejectedValue(serviceError);

      render(<AiAssistant {...mockProps} />);
      fireEvent.click(screen.getByText('Generate Summary'));

      await waitFor(() => {
        expect(screen.getByText('AI service is currently unavailable. Please check your configuration.')).toBeInTheDocument();
      });
    });

    test('disables generate button while loading', async () => {
      aiAPI.generateSummary.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AiAssistant {...mockProps} />);
      fireEvent.click(screen.getByText('Generate Summary'));

      expect(screen.getByText('Generating...')).toBeDisabled();
    });
  });

  describe('Q&A Tab', () => {
    beforeEach(() => {
      render(<AiAssistant {...mockProps} />);
      fireEvent.click(screen.getByText('Ask Questions'));
    });

    test('renders Q&A tab content', () => {
      expect(screen.getByText('Ask questions about your project, tasks, or get suggestions for improvements.')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ask a question about your project...')).toBeInTheDocument();
      expect(screen.getByText('Ask')).toBeInTheDocument();
    });

    test('shows empty conversation state', () => {
      expect(screen.getByText('Start a conversation by asking a question about your project!')).toBeInTheDocument();
      expect(screen.getByText('Example questions:')).toBeInTheDocument();
    });

    test('asks question successfully', async () => {
      const mockQuestionResponse = {
        success: true,
        data: {
          answer: 'This is the AI response.',
          metadata: {
            tokenUsage: 75
          },
          usageStats: {
            estimatedCost: 0.0015
          },
          cached: false
        }
      };

      aiAPI.askQuestion.mockResolvedValue(mockQuestionResponse);

      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      fireEvent.change(questionInput, { target: { value: 'What tasks need attention?' } });
      fireEvent.click(screen.getByText('Ask'));

      expect(screen.getByText('Asking...')).toBeInTheDocument();

      await waitFor(() => {
        expect(aiAPI.askQuestion).toHaveBeenCalledWith('What tasks need attention?', {
          projectId: 'project-1',
          projectName: 'Test Project',
          projectDescription: 'Test project description',
          tasks: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              title: 'Task 1',
              status: 'todo'
            })
          ])
        });
        expect(screen.getByText('What tasks need attention?')).toBeInTheDocument();
        expect(screen.getByText('This is the AI response.')).toBeInTheDocument();
      });
    });

    test('shows cached response indicator', async () => {
      const mockQuestionResponse = {
        success: true,
        data: {
          answer: 'Cached response.',
          cached: true,
          metadata: {
            tokenUsage: 50
          }
        }
      };

      aiAPI.askQuestion.mockResolvedValue(mockQuestionResponse);

      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      fireEvent.change(questionInput, { target: { value: 'Test question' } });
      fireEvent.click(screen.getByText('Ask'));

      await waitFor(() => {
        expect(screen.getByText(/📋 Cached/)).toBeInTheDocument();
      });
    });

    test('handles question error', async () => {
      aiAPI.askQuestion.mockRejectedValue(new Error('Question failed'));

      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      fireEvent.change(questionInput, { target: { value: 'Test question' } });
      fireEvent.click(screen.getByText('Ask'));

      await waitFor(() => {
        expect(screen.getByText('Question failed')).toBeInTheDocument();
      });
    });

    test('clears conversation', async () => {
      const mockQuestionResponse = {
        success: true,
        data: {
          answer: 'Test response.',
          metadata: { tokenUsage: 50 }
        }
      };

      aiAPI.askQuestion.mockResolvedValue(mockQuestionResponse);

      // Ask a question first
      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      fireEvent.change(questionInput, { target: { value: 'Test question' } });
      fireEvent.click(screen.getByText('Ask'));

      await waitFor(() => {
        expect(screen.getByText('Test response.')).toBeInTheDocument();
      });

      // Clear conversation
      fireEvent.click(screen.getByText('Clear Conversation'));

      expect(screen.getByText('Start a conversation by asking a question about your project!')).toBeInTheDocument();
      expect(screen.queryByText('Test response.')).not.toBeInTheDocument();
    });

    test('disables ask button when input is empty', () => {
      expect(screen.getByText('Ask')).toBeDisabled();
    });

    test('enables ask button when input has text', () => {
      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      
      fireEvent.change(questionInput, { target: { value: 'Test question' } });
      expect(screen.getByText('Ask')).not.toBeDisabled();
    });

    test('disables form while loading', () => {
      aiAPI.askQuestion.mockImplementation(() => new Promise(() => {})); // Never resolves

      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      fireEvent.change(questionInput, { target: { value: 'Test question' } });
      fireEvent.click(screen.getByText('Ask'));

      expect(questionInput).toBeDisabled();
      expect(screen.getByText('Asking...')).toBeDisabled();
    });

    test('shows session usage statistics', async () => {
      const mockQuestionResponse = {
        success: true,
        data: {
          answer: 'Response 1',
          metadata: { tokenUsage: 50 },
          usageStats: { estimatedCost: 0.001 }
        }
      };

      aiAPI.askQuestion.mockResolvedValue(mockQuestionResponse);

      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      fireEvent.change(questionInput, { target: { value: 'Question 1' } });
      fireEvent.click(screen.getByText('Ask'));

      await waitFor(() => {
        expect(screen.getByText(/Session total - Tokens: 50/)).toBeInTheDocument();
        expect(screen.getAllByText(/Cost: \$0\.0010/)).toHaveLength(2); // One in message, one in session total
      });
    });

    test('shows cost warning when cost exceeds threshold', async () => {
      const mockQuestionResponse = {
        success: true,
        data: {
          answer: 'Expensive response',
          metadata: { tokenUsage: 1000 },
          usageStats: { estimatedCost: 0.02 } // Above 0.01 threshold
        }
      };

      aiAPI.askQuestion.mockResolvedValue(mockQuestionResponse);

      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      fireEvent.change(questionInput, { target: { value: 'Expensive question' } });
      fireEvent.click(screen.getByText('Ask'));

      await waitFor(() => {
        expect(screen.getByText(/⚠️ AI usage cost is accumulating/)).toBeInTheDocument();
      });
    });

    test('formats timestamps correctly', async () => {
      const mockQuestionResponse = {
        success: true,
        data: {
          answer: 'Test response',
          metadata: { tokenUsage: 50 }
        }
      };

      aiAPI.askQuestion.mockResolvedValue(mockQuestionResponse);

      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      fireEvent.change(questionInput, { target: { value: 'Test question' } });
      fireEvent.click(screen.getByText('Ask'));

      await waitFor(() => {
        // Check that timestamp is displayed (format: HH:MM)
        expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles missing project data gracefully', () => {
      render(<AiAssistant {...mockProps} project={null} tasks={[]} />);
      fireEvent.click(screen.getByText('Ask Questions'));
      
      expect(screen.getByPlaceholderText('Ask a question about your project...')).toBeInTheDocument();
    });

    test('handles empty tasks array', () => {
      render(<AiAssistant {...mockProps} tasks={[]} />);
      fireEvent.click(screen.getByText('Ask Questions'));
      
      expect(screen.getByText('Start a conversation by asking a question about your project!')).toBeInTheDocument();
    });

    test('handles undefined tasks', () => {
      render(<AiAssistant {...mockProps} tasks={undefined} />);
      fireEvent.click(screen.getByText('Ask Questions'));
      
      expect(screen.getByText('Start a conversation by asking a question about your project!')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<AiAssistant {...mockProps} />);
      expect(screen.getByLabelText('Close AI Assistant')).toBeInTheDocument();
    });

    test('supports keyboard navigation', () => {
      render(<AiAssistant {...mockProps} />);
      
      // Focus close button
      const closeButton = screen.getByLabelText('Close AI Assistant');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
      
      // Focus tab button
      const summaryTab = screen.getByText('Project Summary');
      summaryTab.focus();
      expect(summaryTab).toHaveFocus();
    });

    test('maintains focus management', () => {
      render(<AiAssistant {...mockProps} />);
      
      fireEvent.click(screen.getByText('Ask Questions'));
      
      const questionInput = screen.getByPlaceholderText('Ask a question about your project...');
      questionInput.focus();
      expect(questionInput).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    test('renders properly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      render(<AiAssistant {...mockProps} />);
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    });
  });
});