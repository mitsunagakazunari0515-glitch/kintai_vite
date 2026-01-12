import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fontSizes } from '../config/fontSizes';
import { MenuIcon, CloseIcon } from './Icons';

/**
 * ヘッダーコンポーネントのプロパティを表すインターフェース。
 */
interface HeaderProps {
  /** モバイル表示かどうか。デフォルトはfalse。 */
  isMobile?: boolean;
  /** ユーザーのロール（管理者または従業員）。 */
  userRole?: 'admin' | 'employee';
  /** 未対応申請数。デフォルトは0。 */
  pendingRequestCount?: number;
}

/**
 * アプリケーションのヘッダーコンポーネント。
 * システム名、ユーザー情報、ログアウトボタンを表示します。
 * モバイル表示時はバーガーメニューを表示します。
 *
 * @param {HeaderProps} props - ヘッダーのプロパティ。
 * @returns {JSX.Element} ヘッダーコンポーネント。
 */
export const Header: React.FC<HeaderProps> = ({ isMobile = false, userRole: propUserRole, pendingRequestCount = 0 }) => {
  const { logout, userRole: contextUserRole, userId, userName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = propUserRole || contextUserRole || 'employee';
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
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
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isMobile && (
            <button
              onClick={toggleMenu}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isMenuOpen ? <CloseIcon size={24} color="#ffffff" /> : <MenuIcon size={24} color="#ffffff" />}
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.125rem' : '1.5rem' }}>
              A・1勤怠管理システム
            </h1>
              <span
                style={{
                  fontSize: '1rem',
                  opacity: 0.9
                }}
              >
                （{userRole === 'admin' ? '管理者' : '従業員'}）
              </span>
          </div>
        </div>
        {!isMobile && (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              color: '#ffffff'
            }}
          >
            <span style={{ fontSize: '1rem' }}>
              従業員名：{userName || userId || 'ゲスト'}
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
                fontSize: fontSizes.navLink.desktop,
                whiteSpace: 'nowrap',
                boxShadow: 'none',
                borderRadius: 0,
                minHeight: 'auto',
                minWidth: 'auto'
              }}
            >
              <svg
                width={26}
                height={26}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
              >
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
        )}
      </header>
      {/* モバイル用バーガーメニュー */}
      {isMobile && isMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            animation: 'fadeIn 0.2s ease-in'
          }}
          onClick={closeMenu}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '80%',
              maxWidth: '300px',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '2px 0 8px rgba(0, 0, 0, 0.2)',
              overflowY: 'auto',
              animation: 'slideIn 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem' }}>
              {/* 従業員名 */}
              <div>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.5rem' }}>
                  従業員名
                </div>
                <div style={{ fontSize: fontSizes.h3.desktop, fontWeight: 'bold', color: '#1f2937' }}>
                  {userName || userId || 'ゲスト'}
                </div>
              </div>

              {/* ナビゲーション */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem' }}>
                {userRole === 'admin' ? (
                  <>
                    <Link
                      to="/admin/employees"
                      onClick={closeMenu}
                      style={{
                        display: 'block',
                        padding: '0.75rem 1rem',
                        textDecoration: 'none',
                        color: location.pathname.startsWith('/admin/employees') ? '#8b5a2b' : '#1f2937',
                        fontSize: fontSizes.navLink.desktop,
                        fontWeight: location.pathname.startsWith('/admin/employees') ? 'bold' : 'normal',
                        backgroundColor: location.pathname.startsWith('/admin/employees') ? '#f9f3eb' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      従業員一覧
                    </Link>
                    <Link
                      to="/admin/attendance"
                      onClick={closeMenu}
                      style={{
                        display: 'block',
                        padding: '0.75rem 1rem',
                        textDecoration: 'none',
                        color: location.pathname.startsWith('/admin/attendance') ? '#8b5a2b' : '#1f2937',
                        fontSize: fontSizes.navLink.desktop,
                        fontWeight: location.pathname.startsWith('/admin/attendance') ? 'bold' : 'normal',
                        backgroundColor: location.pathname.startsWith('/admin/attendance') ? '#f9f3eb' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      勤怠情報一覧
                    </Link>
                    <Link
                      to="/admin/requests"
                      onClick={closeMenu}
                      style={{
                        display: 'block',
                        padding: '0.75rem 1rem',
                        textDecoration: 'none',
                        color: location.pathname.startsWith('/admin/requests') ? '#8b5a2b' : '#1f2937',
                        fontSize: fontSizes.navLink.desktop,
                        fontWeight: location.pathname.startsWith('/admin/requests') ? 'bold' : 'normal',
                        backgroundColor: location.pathname.startsWith('/admin/requests') ? '#f9f3eb' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '0.5rem',
                        position: 'relative'
                      }}
                    >
                      申請一覧
                      {pendingRequestCount > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '1rem',
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: '1.25rem',
                            height: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: fontSizes.badge,
                            fontWeight: 'bold',
                            lineHeight: '1'
                          }}
                        >
                          {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/admin/allowances"
                      onClick={closeMenu}
                      style={{
                        display: 'block',
                        padding: '0.75rem 1rem',
                        textDecoration: 'none',
                        color: location.pathname.startsWith('/admin/allowances') ? '#8b5a2b' : '#1f2937',
                        fontSize: fontSizes.navLink.desktop,
                        fontWeight: location.pathname.startsWith('/admin/allowances') ? 'bold' : 'normal',
                        backgroundColor: location.pathname.startsWith('/admin/allowances') ? '#f9f3eb' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      手当マスタ
                    </Link>
                    <Link
                      to="/admin/deductions"
                      onClick={closeMenu}
                      style={{
                        display: 'block',
                        padding: '0.75rem 1rem',
                        textDecoration: 'none',
                        color: location.pathname.startsWith('/admin/deductions') ? '#8b5a2b' : '#1f2937',
                        fontSize: fontSizes.navLink.desktop,
                        fontWeight: location.pathname.startsWith('/admin/deductions') ? 'bold' : 'normal',
                        backgroundColor: location.pathname.startsWith('/admin/deductions') ? '#f9f3eb' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      控除マスタ
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/employee/attendance"
                      onClick={closeMenu}
                      style={{
                        display: 'block',
                        padding: '0.75rem 1rem',
                        textDecoration: 'none',
                        color: location.pathname.startsWith('/employee/attendance') ? '#8b5a2b' : '#1f2937',
                        fontSize: fontSizes.navLink.desktop,
                        fontWeight: location.pathname.startsWith('/employee/attendance') ? 'bold' : 'normal',
                        backgroundColor: location.pathname.startsWith('/employee/attendance') ? '#f9f3eb' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      勤怠
                    </Link>
                    <Link
                      to="/employee/leave"
                      onClick={closeMenu}
                      style={{
                        display: 'block',
                        padding: '0.75rem 1rem',
                        textDecoration: 'none',
                        color: location.pathname.startsWith('/employee/leave') ? '#8b5a2b' : '#1f2937',
                        fontSize: fontSizes.navLink.desktop,
                        fontWeight: location.pathname.startsWith('/employee/leave') ? 'bold' : 'normal',
                        backgroundColor: location.pathname.startsWith('/employee/leave') ? '#f9f3eb' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      休暇申請
                    </Link>
                  </>
                )}
              </div>

              {/* ログアウトボタン */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: fontSizes.button,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    boxShadow: 'none',
                    minHeight: 'auto',
                    minWidth: 'auto'
                  }}
                >
                  <svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ display: 'block' }}
                  >
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
                  ログアウト
                </button>
              </div>

              {/* ハンバーガーメニューアイコン（一番下） */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={toggleMenu}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    color: '#1f2937',
                    fontSize: fontSizes.navLink.desktop,
                    fontWeight: 'normal'
                  }}
                >
                  {isMenuOpen ? (
                    <>
                      <CloseIcon size={20} color="#1f2937" />
                      <span>メニューを閉じる</span>
                    </>
                  ) : (
                    <>
                      <MenuIcon size={20} color="#1f2937" />
                      <span>メニューを開く</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

