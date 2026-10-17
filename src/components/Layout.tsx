// a1-design-ok: 画面の枠は @a1int/ui の AppShell。ここは勤怠の画面一覧とルーター・認証をつなぐだけ
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell, type NavItem } from '@a1int/ui';
import { useAuth } from '../contexts/AuthContext';
import { isPortalMode } from './RedirectToLogin';

/**
 * レイアウトコンポーネントのプロパティを表すインターフェース。
 */
interface LayoutProps {
  /** レイアウト内で表示する子要素。 */
  children: React.ReactNode;
}

/**
 * 管理者の画面一覧（UI ルール §9）。key は遷移先のパス。
 *
 * @param {number} pendingRequestCount - 未対応申請数（申請一覧のバッジ）。
 * @returns {NavItem[]} 管理者の画面一覧。
 */
const adminNavItems = (pendingRequestCount: number): NavItem[] => [
  { key: '/admin/employees', label: '従業員一覧' },
  { key: '/admin/attendance', label: '勤怠情報一覧' },
  { key: '/admin/requests', label: '申請一覧', badge: pendingRequestCount },
  {
    key: 'master',
    label: 'マスタ',
    children: [
      { key: '/admin/allowances', label: '手当マスタ' },
      { key: '/admin/deductions', label: '控除マスタ' },
      { key: '/admin/work-locations', label: '勤務拠点マスタ' },
    ],
  },
];

/** 従業員の画面一覧（UI ルール §9）。key は遷移先のパス。 */
const EMPLOYEE_NAV_ITEMS: NavItem[] = [
  { key: '/employee/attendance', label: '勤怠' },
  { key: '/employee/leave', label: '休暇申請' },
];

/**
 * 現在のパスに該当する画面の key を返す（配下のパスも含めて前方一致）。
 *
 * @param {NavItem[]} items - 画面一覧。
 * @param {string} pathname - 現在のパス。
 * @returns {string} 該当する画面の key。無ければ pathname。
 */
const currentKeyOf = (items: NavItem[], pathname: string): string => {
  const leaves = items.flatMap((item) => (item.children?.length ? item.children : [item]));
  return leaves.find((item) => pathname.startsWith(item.key))?.key ?? pathname;
};

/**
 * アプリケーションのレイアウトコンポーネント。
 * 画面の枠（ヘッダー・ナビ・本文）は全システム共通の AppShell で描き、
 * 勤怠の画面一覧・現在地・遷移・ログアウトを渡します。
 *
 * @param {LayoutProps} props - レイアウトのプロパティ。
 * @returns {JSX.Element} レイアウトコンポーネント。
 */
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userRole, userId, userName, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 従業員画面（/employee/*）にアクセスしている場合は、常に従業員として扱う
  // 管理者であっても、従業員画面内では従業員権限で動作する
  const isEmployeeScreen = location.pathname.startsWith('/employee/');
  const displayRole = isEmployeeScreen ? 'employee' : (userRole || 'employee');

  // 未対応申請数（管理者画面のみ）。
  // 実際の実装では API から取得するか、グローバルな状態管理を使用する。ここでは申請確認画面と同じダミーデータの件数
  // （休暇申請 4 件＋勤怠修正申請 3 件が「申請中」）。
  const pendingRequestCount = displayRole === 'admin' ? 7 : 0;

  const navItems = useMemo(
    () => (displayRole === 'admin' ? adminNavItems(pendingRequestCount) : EMPLOYEE_NAV_ITEMS),
    [displayRole, pendingRequestCount]
  );
  const current = currentKeyOf(navItems, location.pathname);

  const handleLogout = async () => {
    await logout();
    if (isPortalMode()) {
      // 共通ポータルへ戻す（ログアウト後はポータルのログイン画面）。
      window.location.href = '/';
    } else {
      navigate('/login');
    }
  };

  return (
    <AppShell
      navItems={navItems}
      current={current}
      onNavigate={(key) => {
        if (!navItems.some((item) => item.key === key && item.children?.length)) navigate(key);
      }}
      userName={userName || userId || undefined}
      roleLabel={displayRole === 'admin' ? '管理者' : '従業員'}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
};
