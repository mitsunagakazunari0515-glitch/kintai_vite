import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from './Header';
import { Navigation } from './Navigation';

/**
 * レイアウトコンポーネントのプロパティを表すインターフェース。
 */
interface LayoutProps {
  /** レイアウト内で表示する子要素。 */
  children: React.ReactNode;
}

/**
 * アプリケーションのレイアウトコンポーネント。
 * ヘッダー、ナビゲーション、メインコンテンツエリアを提供します。
 *
 * @param {LayoutProps} props - レイアウトのプロパティ。
 * @returns {JSX.Element} レイアウトコンポーネント。
 */
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userRole } = useAuth();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  // 従業員画面（/employee/*）にアクセスしている場合は、常に従業員として扱う
  // 管理者であっても、従業員画面内では従業員権限で動作する
  const isEmployeeScreen = location.pathname.startsWith('/employee/');
  const displayRole = isEmployeeScreen ? 'employee' : (userRole || 'employee');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 未対応申請数を計算（ダミーデータから）
  // 従業員画面では申請数は表示しない（管理者画面のみ）
  useEffect(() => {
    // 実際の実装では、APIから取得するか、グローバルな状態管理を使用
    // ここでは申請確認画面と同じダミーデータを使用
    // 従業員画面では申請数は0にする
    if (displayRole === 'admin' && !isEmployeeScreen) {
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
    } else {
      setPendingRequestCount(0);
    }
  }, [displayRole, isEmployeeScreen]);

  // ヘッダーとナビゲーションの高さを計算
  const headerHeight = isMobile ? 60 : 60; // モバイル: 約60px, PC: 約60px
  const navHeight = isMobile ? 0 : 60; // モバイル: 0px（非表示）, PC: 約60px
  const totalFixedHeight = headerHeight + navHeight;

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'radial-gradient(circle at top left, #fdf7ee 0%, #f5f0e8 40%, #e8ddcf 100%)'
    }}>
      <Header 
        isMobile={isMobile} 
        userRole={displayRole} 
        pendingRequestCount={pendingRequestCount}
      />
      {!isMobile && (
        <Navigation 
          isMobile={isMobile} 
          userRole={displayRole} 
          pendingRequestCount={pendingRequestCount}
        />
      )}
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

