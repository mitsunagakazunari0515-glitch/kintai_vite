/**
 * 確認モーダルコンポーネント。
 * ユーザーに確認を求める際に使用するモーダルです。
 */

import React from 'react';
import { fontSizes } from '../config/fontSizes';
import { CancelButton, DeleteButton } from './Button';

/**
 * 確認モーダルコンポーネントのプロパティを表すインターフェース。
 */
interface ConfirmModalProps {
  /** モーダルの表示状態。 */
  isOpen: boolean;
  /** モーダルのタイトル。 */
  title: string;
  /** モーダルのメッセージ。 */
  message: string;
  /** 確認ボタンのテキスト。デフォルトは'確認'。 */
  confirmText?: string;
  /** キャンセルボタンのテキスト。デフォルトは'キャンセル'。 */
  cancelText?: string;
  /** 確認時の処理を行う関数。 */
  onConfirm: () => void;
  /** キャンセル時の処理を行う関数。 */
  onCancel: () => void;
  /** モバイル表示かどうか。デフォルトは画面幅に基づいて自動判定。 */
  isMobile?: boolean;
}

/**
 * 確認モーダルコンポーネント。
 * ユーザーに確認を求める際に使用するモーダルです。
 * 背景をクリックするとキャンセルされます。
 *
 * @param {ConfirmModalProps} props - 確認モーダルのプロパティ。
 * @returns {JSX.Element | null} 確認モーダルコンポーネント。isOpenがfalseの場合はnullを返します。
 * @example
 * ```typescript
 * <ConfirmModal
 *   isOpen={showModal}
 *   title="削除確認"
 *   message="本当に削除しますか？"
 *   confirmText="削除"
 *   cancelText="キャンセル"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowModal(false)}
 * />
 * ```
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = '確認',
  cancelText: _cancelText = 'キャンセル',
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
          <CancelButton
            type="button"
            onClick={onCancel}
            fullWidth
          />
          {confirmText === '削除' ? (
            <DeleteButton
              type="button"
              onClick={onConfirm}
              fullWidth
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

