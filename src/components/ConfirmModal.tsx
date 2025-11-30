/**
 * 確認モーダルコンポーネント
 * ユーザーに確認を求める際に使用するモーダル
 */

import React from 'react';
import { fontSizes } from '../config/fontSizes';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isMobile?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  onConfirm,
  onCancel,
  isMobile = window.innerWidth <= 768
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        padding: isMobile ? '1rem' : '1.4rem'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: isMobile ? '1.5rem' : '1.4rem',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          marginBottom: '1rem',
          fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop,
          fontWeight: 'bold'
        }}>
          {title}
        </h3>
        <p style={{
          marginBottom: '1.5rem',
          fontSize: fontSizes.medium,
          color: '#6b7280',
          lineHeight: '1.6'
        }}>
          {message}
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: 'none',
              minHeight: 'auto',
              minWidth: 'auto',
              transition: 'background-color 0.2s, transform 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4b5563';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6b7280';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: 'none',
              minHeight: 'auto',
              minWidth: 'auto',
              transition: 'background-color 0.2s, transform 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

