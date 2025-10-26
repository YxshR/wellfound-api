import toast from 'react-hot-toast';

// Toast configuration
const toastConfig = {
  duration: 4000,
  position: 'top-right',
  style: {
    borderRadius: '8px',
    background: '#333',
    color: '#fff',
    fontSize: '14px',
    maxWidth: '400px',
  },
};

// Success toast
export const showSuccess = (message) => {
  toast.success(message, {
    ...toastConfig,
    style: {
      ...toastConfig.style,
      background: '#10b981',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10b981',
    },
  });
};

// Error toast
export const showError = (message) => {
  toast.error(message, {
    ...toastConfig,
    duration: 6000, // Longer duration for errors
    style: {
      ...toastConfig.style,
      background: '#ef4444',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#ef4444',
    },
  });
};

// Warning toast
export const showWarning = (message) => {
  toast(message, {
    ...toastConfig,
    icon: '⚠️',
    style: {
      ...toastConfig.style,
      background: '#f59e0b',
    },
  });
};

// Info toast
export const showInfo = (message) => {
  toast(message, {
    ...toastConfig,
    icon: 'ℹ️',
    style: {
      ...toastConfig.style,
      background: '#3b82f6',
    },
  });
};

// Loading toast
export const showLoading = (message) => {
  return toast.loading(message, {
    ...toastConfig,
    style: {
      ...toastConfig.style,
      background: '#6b7280',
    },
  });
};

// Dismiss specific toast
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

// Dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Promise toast - automatically handles loading, success, and error states
export const showPromiseToast = (promise, messages) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong',
    },
    toastConfig
  );
};