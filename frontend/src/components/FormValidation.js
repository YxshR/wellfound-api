import React from 'react';

// Individual field error component
export const FieldError = ({ error, show = true }) => {
  if (!show || !error) return null;
  
  return (
    <div className="field-error" role="alert">
      {error}
    </div>
  );
};

// Form validation summary component
export const ValidationSummary = ({ errors, show = true }) => {
  if (!show || !errors || Object.keys(errors).length === 0) return null;
  
  const errorMessages = Object.values(errors).filter(Boolean);
  
  if (errorMessages.length === 0) return null;
  
  return (
    <div className="validation-summary" role="alert">
      <div className="validation-summary-header">
        <strong>Please correct the following errors:</strong>
      </div>
      <ul className="validation-summary-list">
        {errorMessages.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
};

// Input wrapper with validation
export const ValidatedInput = ({
  label,
  error,
  required = false,
  children,
  className = '',
  ...props
}) => {
  const hasError = Boolean(error);
  
  return (
    <div className={`form-group ${hasError ? 'has-error' : ''} ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-indicator" aria-label="required">*</span>}
        </label>
      )}
      {children}
      <FieldError error={error} />
    </div>
  );
};

// Validation hook for forms
export const useFormValidation = (initialValues, validationRules) => {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});
  
  // Validate a single field
  const validateField = React.useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;
    
    for (const rule of rules) {
      const error = rule(value, values);
      if (error) return error;
    }
    
    return null;
  }, [validationRules, values]);
  
  // Validate all fields
  const validateAll = React.useCallback(() => {
    const newErrors = {};
    let isValid = true;
    
    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  }, [validateField, validationRules, values]);
  
  // Handle field change
  const handleChange = React.useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);
  
  // Handle field blur
  const handleBlur = React.useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField, values]);
  
  // Reset form
  const reset = React.useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);
  
  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
};

// Common validation rules
export const validationRules = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return null;
  },
  
  minLength: (min) => (value) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },
  
  maxLength: (max) => (value) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  },
  
  email: (value) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  url: (value) => {
    if (value && !/^https?:\/\/.+/.test(value)) {
      return 'Please enter a valid URL';
    }
    return null;
  },
  
  pattern: (regex, message) => (value) => {
    if (value && !regex.test(value)) {
      return message || 'Invalid format';
    }
    return null;
  },
};