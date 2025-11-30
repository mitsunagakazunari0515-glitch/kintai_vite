import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fontSizes } from '../config/fontSizes';

/**
 * ヘッダーコンポーネントのプロパティを表すインターフェース。
 */
interface HeaderProps {
  /** モバイル表示かどうか。デフォルトはfalse。 */
  isMobile?: boolean;
}

/**
 * アプリケーションのヘッダーコンポーネント。
 * システム名、ユーザー情報、ログアウトボタンを表示します。
 *
 * @param {HeaderProps} props - ヘッダーのプロパティ。
 * @returns {JSX.Element} ヘッダーコンポーネント。
 */
export const Header: React.FC<HeaderProps> = ({ isMobile = false }) => {
  const { logout, userRole, userId } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #5b3b1f 0%, #8b5a2b 60%, #c47c3f 100%)',
        color: 'white',
        padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '0.75rem' : '0',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? '1.125rem' : '1.5rem' }}>
          A・1勤怠管理システム
        </h1>
        <span
          style={{
            fontSize: isMobile ? '0.9rem' : '1rem',
            opacity: 0.9
          }}
        >
          （{userRole === 'admin' ? '管理者' : '従業員'}）
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'flex-end' : 'flex-end',
          color: '#ffffff'
        }}
      >
        <span style={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
          従業員名：{userId || 'ゲスト'}
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            cursor: 'pointer',
            fontSize: isMobile ? fontSizes.navLink.mobile : fontSizes.navLink.desktop,
            whiteSpace: 'nowrap',
            boxShadow: 'none',
            borderRadius: 0,
            minHeight: 'auto',
            minWidth: 'auto'
          }}
        >
          <svg
            width={isMobile ? 22 : 26}
            height={isMobile ? 22 : 26}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            {/* 外枠（左側の柱＋内側の空白） */}
            <path
              d="M4 3H13C13.5523 3 14 3.44772 14 4V7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M4 21H13C13.5523 21 14 20.5523 14 20V17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M4 3V21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* 右向きの矢印 */}
            <path
              d="M11 12H20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 9L20 12L16 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>ログアウト</span>
        </button>
      </div>
    </header>
  );
};

