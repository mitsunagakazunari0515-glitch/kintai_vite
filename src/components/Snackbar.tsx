import React, { useEffect } from 'react';

interface SnackbarProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: type === 'success' ? '#10b981' : '#ef4444',
        color: '#ffffff',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minWidth: '200px',
        maxWidth: '400px'
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '1.25rem',
          lineHeight: '1',
          padding: 0,
          marginLeft: 'auto',
          boxShadow: 'none',
          minHeight: 'auto',
          minWidth: 'auto'
        }}
      >
        ×
      </button>
    </div>
  );
};

