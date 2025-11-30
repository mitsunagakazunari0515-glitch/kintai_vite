import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fontSizes } from '../config/fontSizes';

const AdminNavigation: React.FC<{ isMobile: boolean; location: ReturnType<typeof useLocation> }> = ({ isMobile, location }) => {
  const [showMasterMenu, setShowMasterMenu] = useState(false);
  const masterButtonRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  useEffect(() => {
    if (showMasterMenu && masterButtonRef.current) {
      const rect = masterButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  }, [showMasterMenu]);

  // 未対応申請数を計算（ダミーデータから）
  useEffect(() => {
    // 実際の実装では、APIから取得するか、グローバルな状態管理を使用
    // ここでは申請確認画面と同じダミーデータを使用
    const leaveRequests = [
      { id: 'leave-1', status: '申請中' },
      { id: 'leave-2', status: '申請中' },
      { id: 'leave-3', status: '申請中' },
      { id: 'leave-4', status: '申請中' }
    ];
    const attendanceRequests = [
      { id: 'attendance-1', status: '申請中' },
      { id: 'attendance-2', status: '申請中' },
      { id: 'attendance-3', status: '申請中' }
    ];
    const pendingLeaveCount = leaveRequests.filter(req => req.status === '申請中').length;
    const pendingAttendanceCount = attendanceRequests.filter(req => req.status === '申請中').length;
    setPendingRequestCount(pendingLeaveCount + pendingAttendanceCount);
  }, []);

  return (
    <>
      <div style={{ 
        display: 'flex', 
        gap: isMobile ? '0.5rem' : '1rem',
        flexWrap: isMobile ? 'nowrap' : 'wrap'
      }}>
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
        >
          申請一覧
          {pendingRequestCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '0',
              right: '0',
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
              lineHeight: '1',
              transform: 'translate(25%, -25%)'
            }}>
              {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
            </span>
          )}
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
              color: (location.pathname.startsWith('/admin/allowances') || location.pathname.startsWith('/admin/deductions')) ? '#4b3b2b' : '#6b5b4b',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              fontWeight: (location.pathname.startsWith('/admin/allowances') || location.pathname.startsWith('/admin/deductions')) ? 'bold' : 'normal',
              textDecoration: 'none',
              borderBottom: (location.pathname.startsWith('/admin/allowances') || location.pathname.startsWith('/admin/deductions'))
                ? '2px solid #8b5a2b'
                : '2px solid transparent',
              opacity: (location.pathname.startsWith('/admin/allowances') || location.pathname.startsWith('/admin/deductions')) ? 1 : 0.85
            }}
          >
            マスタ
          </div>
        </div>
      </div>
      {showMasterMenu && createPortal(
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

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout, userRole, userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ヘッダーとナビゲーションの高さを計算
  const headerHeight = isMobile ? 80 : 60; // モバイル: 約80px, PC: 約60px
  const navHeight = isMobile ? 50 : 60; // モバイル: 約50px, PC: 約60px
  const totalFixedHeight = headerHeight + navHeight;

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'radial-gradient(circle at top left, #fdf7ee 0%, #f5f0e8 40%, #e8ddcf 100%)'
    }}>
      <header style={{
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
      }}>
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
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem', 
          alignItems: 'center',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'flex-end' : 'flex-end',
          color: '#ffffff'
        }}>
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
      <nav style={{
        position: 'fixed',
        top: `${headerHeight}px`,
        left: 0,
        right: 0,
        backgroundColor: '#f9f3eb',
        padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
        borderBottom: '1px solid #e0d2c2',
        overflowX: 'auto',
        overflowY: 'visible',
        boxShadow: '0 2px 4px rgba(91, 59, 31, 0.08)',
        zIndex: 999
      }}>
        {userRole === 'admin' ? (
          <AdminNavigation isMobile={isMobile} location={location} />
        ) : (
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? '0.5rem' : '1rem',
            flexWrap: isMobile ? 'nowrap' : 'wrap'
          }}>
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
            >
              休暇申請
            </Link>
          </div>
        )}
      </nav>
      <main style={{ 
        flex: 1, 
        padding: isMobile ? '1rem' : '1rem',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'hidden',
        marginTop: `${totalFixedHeight}px`,
        height: isMobile ? 'auto' : `calc(100vh - ${totalFixedHeight}px)`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </main>
    </div>
  );
};

