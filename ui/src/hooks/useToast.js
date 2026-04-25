import toast from 'react-hot-toast';

export function useToast() {
  const success = (message, options = {}) => {
    return toast.success(message, {
      style: {
        background: '#0d1a22',
        border: '1px solid #22c55e',
        color: '#22c55e'
      },
      duration: 3000,
      ...options
    });
  };

  const error = (message, options = {}) => {
    return toast.error(message, {
      style: {
        background: '#0d1a22',
        border: '1px solid #ef4444',
        color: '#ef4444'
      },
      duration: 5000,
      ...options
    });
  };

  const warning = (message, options = {}) => {
    return toast(message, {
      style: {
        background: '#0d1a22',
        border: '1px solid #f59e0b',
        color: '#f59e0b'
      },
      duration: 5000,
      ...options
    });
  };

  const info = (message, options = {}) => {
    return toast(message, {
      style: {
        background: '#0d1a22',
        border: '1px solid #3b82f6',
        color: '#3b82f6'
      },
      duration: 3000,
      ...options
    });
  };

  const dismiss = (toastId) => toast.dismiss(toastId);

  return { success, error, warning, info, dismiss };
}