/**
 * ファイル名: ProgressBar.tsx
 * コンポーネント名: プログレスバー（円形スピナー）
 * 説明: 外部通信中に表示する円形のプログレスバーコンポーネント
 */

import React from 'react';

interface ProgressBarProps {
  /** プログレスバーを表示するかどうか */
  isLoading: boolean;
}

/**
 * プログレスバーコンポーネント（円形スピナー）
 * 外部通信中に表示される回転アニメーション付き円形プログレスバー
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ isLoading }) => {
  if (!isLoading) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #4285F4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      </div>
      <style>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

