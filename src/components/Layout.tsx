import { useState, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 未対応申請数を計算（ダミーデータから）
  useEffect(() => {
    // 実際の実装では、APIから取得するか、グローバルな状態管理を使用
    // ここでは申請確認画面と同じダミーデータを使用
    if (userRole === 'admin') {
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
    }
  }, [userRole]);

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
      <Header isMobile={isMobile} />
      <Navigation 
        isMobile={isMobile} 
        userRole={userRole || 'employee'} 
        pendingRequestCount={pendingRequestCount}
      />
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

