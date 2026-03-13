/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getErrorMessage } from '@/lib/errors';
import 'react-toastify/dist/ReactToastify.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const recentToastMapRef = useRef(new Map());

  const show = useCallback((kind, message, options = {}) => {
    const normalizedMessage = String(message || '')
      .trim()
      .replace(/\s+/g, ' ');
    if (!normalizedMessage) return;

    const toastId = options.toastId || `${kind}:${normalizedMessage.toLowerCase()}`;
    const now = Date.now();
    const dedupeWindowMs = 2500;
    const lastShownAt = recentToastMapRef.current.get(toastId) || 0;
    if (now - lastShownAt < dedupeWindowMs) return;
    if (toast.isActive(toastId)) return;

    recentToastMapRef.current.set(toastId, now);
    if (recentToastMapRef.current.size > 200) {
      for (const [id, shownAt] of recentToastMapRef.current.entries()) {
        if (now - shownAt > 30000) recentToastMapRef.current.delete(id);
      }
    }

    toast[kind](normalizedMessage, { ...options, toastId });
  }, []);

  const value = useMemo(
    () => ({
      success: (message, options) => show('success', message, options),
      info: (message, options) => show('info', message, options),
      warning: (message, options) => show('warning', message, options),
      error: (message, options) => show('error', message, options),
      apiError: (error, fallback, options) =>
        show('error', getErrorMessage(error, fallback), options),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3200}
        limit={3}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
