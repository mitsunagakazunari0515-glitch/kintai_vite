import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { fontSizes } from '../config/fontSizes';

/**
 * ナビゲーションコンポーネントのプロパティを表すインターフェース。
 */
interface NavigationProps {
  /** モバイル表示かどうか。デフォルトはfalse。 */
  isMobile?: boolean;
  /** ユーザーのロール（管理者または従業員）。 */
  userRole: 'admin' | 'employee';
  /** 未対応申請数。デフォルトは0。 */
  pendingRequestCount?: number;
}

/**
 * 管理者用ナビゲーションコンポーネント。
 * 管理者向けのメニュー項目（従業員一覧、勤怠情報一覧、申請一覧、マスタ）を表示します。
 *
 * @param {Object} props - コンポーネントのプロパティ。
 * @param {boolean} props.isMobile - モバイル表示かどうか。
 * @param {ReturnType<typeof useLocation>} props.location - 現在のルート情報。
 * @param {number} props.pendingRequestCount - 未対応申請数。
 * @returns {JSX.Element} 管理者用ナビゲーションコンポーネント。
 */
const AdminNavigation: React.FC<{ isMobile: boolean; location: ReturnType<typeof useLocation>; pendingRequestCount?: number }> = ({
  isMobile,
  location,
  pendingRequestCount = 0
}) => {
  const [showMasterMenu, setShowMasterMenu] = useState(false);
  const masterButtonRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (showMasterMenu && masterButtonRef.current) {
      const rect = masterButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  }, [showMasterMenu]);

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: isMobile ? '0.5rem' : '1rem',
          flexWrap: isMobile ? 'nowrap' : 'wrap'
        }}
      >
        <Link
          to="/admin/employees"
          style={{
            textDecoration: 'none',
            color: location.pathname.startsWith('/admin/employees') ? '#4b3b2b' : '#6b5b4b',
            padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0.5rem',
            fontSize: isMobile ? fontSizes.navLink.mobile : fontSizes.navLink.desktop,
            whiteSpace: 'nowrap',
            display: 'inline-block',
            borderBottom: location.pathname.startsWith('/admin/employees')
              ? '2px solid #8b5a2b'
              : '2px solid transparent',
            fontWeight: location.pathname.startsWith('/admin/employees') ? 'bold' : 'normal',
            opacity: location.pathname.startsWith('/admin/employees') ? 1 : 0.85
          }}
          onMouseEnter={(e) => {
            if (!location.pathname.startsWith('/admin/employees')) {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          従業員一覧
        </Link>
        <Link
          to="/admin/attendance"
          style={{
            textDecoration: 'none',
            color: location.pathname.startsWith('/admin/attendance') ? '#4b3b2b' : '#6b5b4b',
            padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0.5rem',
            fontSize: isMobile ? fontSizes.navLink.mobile : fontSizes.navLink.desktop,
            whiteSpace: 'nowrap',
            display: 'inline-block',
            borderBottom: location.pathname.startsWith('/admin/attendance')
              ? '2px solid #8b5a2b'
              : '2px solid transparent',
            fontWeight: location.pathname.startsWith('/admin/attendance') ? 'bold' : 'normal',
            opacity: location.pathname.startsWith('/admin/attendance') ? 1 : 0.85
          }}
          onMouseEnter={(e) => {
            if (!location.pathname.startsWith('/admin/attendance')) {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          勤怠情報一覧
        </Link>
        <Link
          to="/admin/requests"
          style={{
            textDecoration: 'none',
            color: location.pathname.startsWith('/admin/requests') ? '#4b3b2b' : '#6b5b4b',
            padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0.5rem',
            fontSize: isMobile ? fontSizes.navLink.mobile : fontSizes.navLink.desktop,
            whiteSpace: 'nowrap',
            display: 'inline-block',
            borderBottom: location.pathname.startsWith('/admin/requests')
              ? '2px solid #8b5a2b'
              : '2px solid transparent',
            fontWeight: location.pathname.startsWith('/admin/requests') ? 'bold' : 'normal',
            opacity: location.pathname.startsWith('/admin/requests') ? 1 : 0.85,
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!location.pathname.startsWith('/admin/requests')) {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          申請一覧
        </Link>
        <div
          ref={masterButtonRef}
          style={{
            position: 'relative',
            display: 'inline-block'
          }}
          onMouseEnter={() => setShowMasterMenu(true)}
          onMouseLeave={() => {
            // 少し遅延を入れて、メニューに移動する時間を与える
            setTimeout(() => {
              const menuElement = document.querySelector('[data-master-menu]');
              if (!menuElement || !menuElement.matches(':hover')) {
                setShowMasterMenu(false);
              }
            }, 100);
          }}
        >
          <div
            style={{
              padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0.5rem',
              fontSize: isMobile ? fontSizes.navLink.mobile : fontSizes.navLink.desktop,
              color:
                location.pathname.startsWith('/admin/allowances') ||
                location.pathname.startsWith('/admin/deductions')
                  ? '#4b3b2b'
                  : '#6b5b4b',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              fontWeight:
                location.pathname.startsWith('/admin/allowances') ||
                location.pathname.startsWith('/admin/deductions')
                  ? 'bold'
                  : 'normal',
              textDecoration: 'none',
              borderBottom:
                location.pathname.startsWith('/admin/allowances') ||
                location.pathname.startsWith('/admin/deductions')
                  ? '2px solid #8b5a2b'
                  : '2px solid transparent',
              opacity:
                location.pathname.startsWith('/admin/allowances') ||
                location.pathname.startsWith('/admin/deductions')
                  ? 1
                  : 0.85
            }}
          >
            マスタ
          </div>
        </div>
      </div>
      {showMasterMenu &&
        createPortal(
          <div
            data-master-menu
            style={{
              position: 'absolute',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 99999,
              minWidth: '150px',
              marginTop: '0',
              paddingTop: '0.25rem',
              pointerEvents: 'auto'
            }}
            onMouseEnter={() => setShowMasterMenu(true)}
            onMouseLeave={() => {
              // 少し遅延を入れて、ボタンに戻る時間を与える
              setTimeout(() => {
                if (masterButtonRef.current && !masterButtonRef.current.matches(':hover')) {
                  setShowMasterMenu(false);
                }
              }, 100);
            }}
          >
            <Link
              to="/admin/allowances"
              style={{
                textDecoration: 'none',
                color: '#8b5a2b',
                padding: '0.75rem 1rem',
                fontSize: isMobile ? fontSizes.navLink.mobile : fontSizes.navLink.desktop,
                display: 'block',
                borderBottom: '1px solid #e5e7eb'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              手当マスタ
            </Link>
            <Link
              to="/admin/deductions"
              style={{
                textDecoration: 'none',
                color: '#8b5a2b',
                padding: '0.75rem 1rem',
                fontSize: isMobile ? fontSizes.navLink.mobile : fontSizes.navLink.desktop,
                display: 'block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              控除マスタ
            </Link>
          </div>,
          document.body
        )}
    </>
  );
};

/**
 * 従業員用ナビゲーションコンポーネント。
 * 従業員向けのメニュー項目（勤怠、休暇申請）を表示します。
 *
 * @param {Object} props - コンポーネントのプロパティ。
 * @param {boolean} props.isMobile - モバイル表示かどうか。
 * @param {ReturnType<typeof useLocation>} props.location - 現在のルート情報。
 * @returns {JSX.Element} 従業員用ナビゲーションコンポーネント。
 */
const EmployeeNavigation: React.FC<{ isMobile: boolean; location: ReturnType<typeof useLocation> }> = ({
  isMobile,
  location
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: isMobile ? '0.5rem' : '1rem',
        flexWrap: isMobile ? 'nowrap' : 'wrap'
      }}
    >
      <Link
        to="/employee/attendance"
        style={{
          textDecoration: 'none',
          color: location.pathname.startsWith('/employee/attendance') ? '#4b3b2b' : '#6b5b4b',
          padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0.5rem',
          fontSize: isMobile ? fontSizes.navLink.mobile : fontSizes.navLink.desktop,
          whiteSpace: 'nowrap',
          display: 'inline-block',
          borderBottom: location.pathname.startsWith('/employee/attendance')
            ? '2px solid #8b5a2b'
            : '2px solid transparent',
          fontWeight: location.pathname.startsWith('/employee/attendance') ? 'bold' : 'normal',
          opacity: location.pathname.startsWith('/employee/attendance') ? 1 : 0.85
        }}
        onMouseEnter={(e) => {
          if (!location.pathname.startsWith('/employee/attendance')) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        勤怠
      </Link>
      <Link
        to="/employee/leave"
        style={{
          textDecoration: 'none',
          color: location.pathname.startsWith('/employee/leave') ? '#4b3b2b' : '#6b5b4b',
          padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0.5rem',
          fontSize: isMobile ? fontSizes.navLink.mobile : fontSizes.navLink.desktop,
          whiteSpace: 'nowrap',
          display: 'inline-block',
          borderBottom: location.pathname.startsWith('/employee/leave')
            ? '2px solid #8b5a2b'
            : '2px solid transparent',
          fontWeight: location.pathname.startsWith('/employee/leave') ? 'bold' : 'normal',
          opacity: location.pathname.startsWith('/employee/leave') ? 1 : 0.85
        }}
        onMouseEnter={(e) => {
          if (!location.pathname.startsWith('/employee/leave')) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        休暇申請
      </Link>
    </div>
  );
};

/**
 * ナビゲーションコンポーネント。
 * ユーザーのロールに応じて管理者用または従業員用のナビゲーションを表示します。
 *
 * @param {NavigationProps} props - ナビゲーションのプロパティ。
 * @returns {JSX.Element} ナビゲーションコンポーネント。
 */
export const Navigation: React.FC<NavigationProps> = ({
  isMobile = false,
  userRole,
  pendingRequestCount = 0
}) => {
  const location = useLocation();

  return (
    <nav
      style={{
        position: 'fixed',
        top: isMobile ? '80px' : '60px',
        left: 0,
        right: 0,
        backgroundColor: '#f9f3eb',
        padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
        borderBottom: '1px solid #e0d2c2',
        overflowX: 'auto',
        overflowY: 'visible',
        boxShadow: '0 2px 4px rgba(91, 59, 31, 0.08)',
        zIndex: 999
      }}
    >
      {userRole === 'admin' ? (
        <AdminNavigation isMobile={isMobile} location={location} pendingRequestCount={pendingRequestCount} />
      ) : (
        <EmployeeNavigation isMobile={isMobile} location={location} />
      )}
    </nav>
  );
};

