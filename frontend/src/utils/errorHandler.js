import { showError } from './toast';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

// Extract error message from different error formats
export const getErrorMessage = (error) => {
  // If it's already a string
  if (typeof error === 'string') {
    return error;
  }

  // If it's an axios error
  if (error.response) {
    // Server responded with error status
    const { data, status } = error.response;
    
    if (data?.message) {
      return data.message;
    }
    
    if (data?.error?.message) {
      return data.error.message;
    }
    
    // Default messages based on status code
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        return 'The provided data is invalid.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Internal server error. Please try again.';
      case 502:
        return 'Service temporarily unavailable. Please try again.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return `Server error (${status}). Please try again.`;
    }
  }
  
  // If it's a network error
  if (error.request) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // If it has a message property
  if (error.message) {
    return error.message;
  }
  
  // Fallback
  return 'An unexpected error occurred. Please try again.';
};

// Get error type from error object
export const getErrorType = (error) => {
  if (error.response) {
    const { status } = error.response;
    
    switch (status) {
      case 400:
      case 422:
        return ERROR_TYPES.VALIDATION;
      case 401:
        return ERROR_TYPES.AUTHENTICATION;
      case 403:
        return ERROR_TYPES.AUTHORIZATION;
      case 404:
        return ERROR_TYPES.NOT_FOUND;
      case 500:
      case 502:
      case 503:
        return ERROR_TYPES.SERVER;
      default:
        return ERROR_TYPES.SERVER;
    }
  }
  
  if (error.request) {
    return ERROR_TYPES.NETWORK;
  }
  
  return ERROR_TYPES.UNKNOWN;
};

// Handle error with appropriate user feedback
export const handleError = (error, options = {}) => {
  const {
    showToast = true,
    customMessage = null,
    logError = true,
    context = 'Unknown operation',
  } = options;

  // Log error for debugging
  if (logError) {
    console.error(`Error in ${context}:`, error);
  }

  const errorMessage = customMessage || getErrorMessage(error);
  const errorType = getErrorType(error);

  // Show toast notification if enabled
  if (showToast) {
    showError(errorMessage);
  }

  return {
    message: errorMessage,
    type: errorType,
    originalError: error,
  };
};

// Retry function with exponential backoff
export const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except for 408, 429
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        const status = error.response.status;
        if (status !== 408 && status !== 429) {
          throw error;
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Validation error formatter
export const formatValidationErrors = (errors) => {
  if (Array.isArray(errors)) {
    return errors.map(error => error.message || error).join(', ');
  }
  
  if (typeof errors === 'object') {
    return Object.values(errors).flat().join(', ');
  }
  
  return errors.toString();
};