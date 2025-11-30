/**
 * ファイル名: RequestApproval.tsx
 * 画面名: 申請一覧画面
 * 説明: 打刻の修正申請や有給申請を承認する画面（管理者用）
 * 機能:
 *   - すべての申請を一覧表示
 *   - 申請の承認・却下
 *   - 未対応申請のバッチ表示
 */

import { useState, useEffect } from 'react';
import { Snackbar } from '../../components/Snackbar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { formatDate } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { getRequestStatuses, getRequestTypes, getRequestStatusStyle } from '../../config/masterData';
import { dummyLeaveRequests, dummyAttendanceCorrectionRequests, type LeaveRequest, type AttendanceCorrectionRequest } from '../../data/dummyData';
import { ChevronDownIcon, ChevronUpIcon } from '../../components/Icons';
import { ApproveButton, BulkApproveButton, CancelApprovalButton, SelectAllButton, SearchButton, ClearButton } from '../../components/Button';

/**
 * 統合された申請情報を表すインターフェース。
 * 休暇申請と打刻修正申請の両方に対応します。
 */
interface UnifiedRequest {
  /** 申請ID。 */
  id: string;
  /** 申請種別。 */
  type: '休暇申請' | '打刻修正申請';
  /** 従業員ID。 */
  employeeId: string;
  /** 従業員名。 */
  employeeName: string;
  /** 申請ステータス。 */
  status: '申請中' | '承認' | '取消' | '削除済み';
  /** 申請日時。 */
  requestedAt: string;
  /** 休暇申請のフィールド（休暇申請の場合に存在）。 */
  leaveData?: {
    /** 開始日。 */
    startDate: string;
    /** 終了日。 */
    endDate: string;
    /** 日数。 */
    days: number;
    /** 休暇種別。 */
    leaveType: '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他';
    /** 理由。 */
    reason: string;
    /** 半休かどうか。 */
    isHalfDay?: boolean;
  };
  /** 打刻修正申請のフィールド（打刻修正申請の場合に存在）。 */
  attendanceData?: {
    /** 日付。 */
    date: string;
    /** 元の出勤時刻。 */
    originalClockIn: string | null;
    /** 元の退勤時刻。 */
    originalClockOut: string | null;
    /** 申請された出勤時刻。 */
    requestedClockIn: string;
    /** 申請された退勤時刻。 */
    requestedClockOut: string | null;
    /** 申請された休憩時間の配列。 */
    requestedBreaks: Array<{ start: string; end: string | null }>;
    /** 理由。 */
    reason: string;
  };
}

/**
 * 申請一覧画面コンポーネント。
 * 打刻の修正申請や有給申請を承認する画面（管理者用）です。
 * すべての申請を一覧表示し、承認・却下機能を提供します。
 *
 * @returns {JSX.Element} 申請一覧画面コンポーネント。
 */
export const RequestApproval: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const requestStatuses = getRequestStatuses();
  const requestTypes = getRequestTypes();
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);
  // 今月の年月を取得（YYYY-MM形式）
  const getCurrentYearMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };
  const [searchYearMonthFrom, setSearchYearMonthFrom] = useState(getCurrentYearMonth());
  const [searchYearMonthTo, setSearchYearMonthTo] = useState(getCurrentYearMonth());
  const [filterType, setFilterType] = useState<string>('all'); // 'all' | '休暇申請' | '打刻修正申請'
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all' | '申請中' | '承認' | '取消' | '削除済み'
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false); // モバイル時の検索条件の展開状態

  // ダミーデータ：有給申請
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(
    dummyLeaveRequests.map(req => ({
      ...req,
      employeeName: req.employeeName || '',
      type: req.type as '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他',
      status: req.status as '申請中' | '承認' | '削除済み',
      isHalfDay: req.isHalfDay || false,
      requestedAt: req.requestedAt || req.createdAt
    }))
  );

  // ダミーデータ：打刻修正申請
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceCorrectionRequest[]>(
    dummyAttendanceCorrectionRequests.map(req => ({
      ...req,
      status: req.status as '申請中' | '承認' | '取消',
      requestedAt: req.requestedAt || req.createdAt
    }))
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // すべての申請を統合
  const allRequests: UnifiedRequest[] = [
    ...leaveRequests.map(req => ({
      id: req.id,
      type: '休暇申請' as const,
      employeeId: req.employeeId,
      employeeName: req.employeeName || '',
      status: req.status as '申請中' | '承認' | '取消' | '削除済み',
      requestedAt: req.requestedAt || req.createdAt,
      leaveData: {
        startDate: req.startDate,
        endDate: req.endDate,
        days: req.days,
        leaveType: req.type as '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他',
        reason: req.reason,
        isHalfDay: req.isHalfDay || false
      }
    })),
    ...attendanceRequests.map(req => ({
      id: req.id,
      type: '打刻修正申請' as const,
      employeeId: req.employeeId,
      employeeName: req.employeeName,
      status: req.status as '申請中' | '承認' | '取消' | '削除済み',
      requestedAt: req.requestedAt || req.createdAt,
      attendanceData: {
        date: req.date,
        originalClockIn: req.originalClockIn,
        originalClockOut: req.originalClockOut,
        requestedClockIn: req.requestedClockIn,
        requestedClockOut: req.requestedClockOut,
        requestedBreaks: req.requestedBreaks,
        reason: req.reason
      }
    }))
  ].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  // フィルタリング処理
  const filteredRequests = allRequests.filter(request => {
    // 年月でフィルタ
    const requestDate = new Date(request.requestedAt);
    const requestYearMonth = `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, '0')}`;
    
    const matchYearMonth = (!searchYearMonthFrom || requestYearMonth >= searchYearMonthFrom) &&
                           (!searchYearMonthTo || requestYearMonth <= searchYearMonthTo);
    
    // 種別でフィルタ
    const matchType = filterType === 'all' || request.type === filterType;
    
    // ステータスでフィルタ
    const matchStatus = filterStatus === 'all' || request.status === filterStatus;
    
    return matchYearMonth && matchType && matchStatus;
  });

  // 日付フォーマット関数（yyyy/mm/dd形式）

  // 申請の承認
  const handleApprove = (request: UnifiedRequest) => {
    if (request.type === '休暇申請') {
      setLeaveRequests(prev => 
        prev.map(req => req.id === request.id ? { ...req, status: '承認' as const } : req)
      );
      setSnackbar({ message: '休暇申請を承認しました', type: 'success' });
    } else {
      setAttendanceRequests(prev => 
        prev.map(req => req.id === request.id ? { ...req, status: '承認' as const } : req)
      );
      setSnackbar({ message: '打刻修正申請を承認しました', type: 'success' });
    }
  };

  // 申請の取消（申請中・承認どちらの場合も取消可能）
  const handleCancelApproval = (request: UnifiedRequest) => {
    setConfirmModal({
      isOpen: true,
      title: request.status === '申請中' ? '申請の取消' : '承認の取消',
      message: request.status === '申請中' ? '申請を取り消しますか？' : '承認を取り消しますか？',
      confirmText: '取消',
      onConfirm: () => {
        if (request.type === '休暇申請') {
          setLeaveRequests(prev => 
            prev.map(req => req.id === request.id ? { ...req, status: '取消' as const } : req)
          );
          setSnackbar({ message: request.status === '申請中' ? '休暇申請を取り消しました' : '休暇申請の承認を取り消しました', type: 'success' });
        } else {
          setAttendanceRequests(prev => 
            prev.map(req => req.id === request.id ? { ...req, status: '取消' as const } : req)
          );
          setSnackbar({ message: request.status === '申請中' ? '打刻修正申請を取り消しました' : '打刻修正申請の承認を取り消しました', type: 'success' });
        }
        setConfirmModal(null);
      }
    });
  };

  // チェックボックスの選択/解除
  const handleToggleSelect = (requestId: string) => {
    setSelectedRequestIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  // 全選択/全解除
  const handleSelectAll = () => {
    const pendingRequests = filteredRequests.filter(req => req.status === '申請中');
    const pendingRequestIds = new Set(pendingRequests.map(req => req.id));
    const allSelected = pendingRequests.length > 0 && 
                        pendingRequests.every(req => selectedRequestIds.has(req.id));
    
    if (allSelected) {
      // 全解除：フィルタリングされた申請中の申請の選択を解除
      setSelectedRequestIds(prev => {
        const newSet = new Set(prev);
        pendingRequestIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // 全選択：フィルタリングされた申請中の申請をすべて選択
      setSelectedRequestIds(prev => {
        const newSet = new Set(prev);
        pendingRequestIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  // 一括承認
  const handleBulkApprove = () => {
    const selectedPendingRequests = filteredRequests.filter(
      req => req.status === '申請中' && selectedRequestIds.has(req.id)
    );
    
    if (selectedPendingRequests.length === 0) {
      setSnackbar({ message: '承認する申請を選択してください', type: 'error' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '一括承認',
      message: `${selectedPendingRequests.length}件の申請を一括承認しますか？`,
      confirmText: '承認',
      onConfirm: () => {
        selectedPendingRequests.forEach(request => {
          if (request.type === '休暇申請') {
            setLeaveRequests(prev => 
              prev.map(req => req.id === request.id ? { ...req, status: '承認' as const } : req)
            );
          } else {
            setAttendanceRequests(prev => 
              prev.map(req => req.id === request.id ? { ...req, status: '承認' as const } : req)
            );
          }
        });
        setSelectedRequestIds(new Set());
        setSnackbar({ message: `${selectedPendingRequests.length}件の申請を一括承認しました`, type: 'success' });
        setConfirmModal(null);
      }
    });
  };

  // 検索条件をクリア
  const handleClearSearch = () => {
    setSearchYearMonthFrom('');
    setSearchYearMonthTo('');
    setFilterType('all');
    setFilterStatus('all');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%' }}>
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          isMobile={isMobile}
        />
      )}
      <h2 style={{ marginBottom: isMobile ? '1rem' : '1.4rem', fontSize: isMobile ? '1.25rem' : '1.05rem' }}>
        申請一覧
      </h2>

      {/* 検索・フィルター */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: isMobile ? '0' : '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        {isMobile ? (
          <>
            {/* モバイル時：折りたたみ可能な検索ヘッダー */}
            <button
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderTop: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: 'none',
                minHeight: 'auto',
                minWidth: 'auto'
              }}
            >
              <span style={{ 
                fontSize: fontSizes.label, 
                fontWeight: 'bold', 
                color: '#1f2937' 
              }}>
                絞り込み検索
              </span>
              {isSearchExpanded ? (
                <ChevronUpIcon size={20} color="#6b7280" />
              ) : (
                <ChevronDownIcon size={20} color="#6b7280" />
              )}
            </button>
            {/* モバイル時：展開された検索条件 */}
            {isSearchExpanded && (
              <div style={{
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ flex: '1', minWidth: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                    申請年月（開始日）
                  </label>
                  <input
                    type="month"
                    value={searchYearMonthFrom}
                    onChange={(e) => setSearchYearMonthFrom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: fontSizes.input,
                      boxSizing: 'border-box',
                      height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
                    }}
                  />
                </div>
                <div style={{ flex: '1', minWidth: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                    申請年月（終了日）
                  </label>
                  <input
                    type="month"
                    value={searchYearMonthTo}
                    onChange={(e) => setSearchYearMonthTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: fontSizes.input,
                      boxSizing: 'border-box',
                      height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
                    }}
                  />
                </div>
                <div style={{ flex: '1', minWidth: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                    種別
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: fontSizes.select,
                      boxSizing: 'border-box',
                      height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
                    }}
                  >
                    <option value="all">すべて</option>
                    {requestTypes.map((type) => (
                      <option key={type.code} value={type.code}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '1', minWidth: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                    ステータス
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: fontSizes.select,
                      boxSizing: 'border-box',
                      height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
                    }}
                  >
                    <option value="all">すべて</option>
                    {requestStatuses.map((status) => (
                      <option key={status.code} value={status.code}>{status.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ 
                  fontSize: fontSizes.medium, 
                  color: '#6b7280',
                  minWidth: '100%'
                }}>
                  検索結果: {filteredRequests.length}件
                </div>
                <div style={{ minWidth: '100%', display: 'flex', gap: '0.5rem' }}>
                  <ClearButton
                    onClick={handleClearSearch}
                    fullWidth
                  />
                  <SearchButton
                    onClick={() => {}}
                    fullWidth
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '1rem',
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}>
          <div style={{ flex: isMobile ? '1' : '1', minWidth: isMobile ? '100%' : '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              申請年月（開始日）
            </label>
            <input
              type="month"
              value={searchYearMonthFrom}
              onChange={(e) => setSearchYearMonthFrom(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: fontSizes.input,
                boxSizing: 'border-box',
                height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
              }}
            />
          </div>
          <div style={{ flex: isMobile ? '1' : '1', minWidth: isMobile ? '100%' : '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              申請年月（終了日）
            </label>
            <input
              type="month"
              value={searchYearMonthTo}
              onChange={(e) => setSearchYearMonthTo(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: fontSizes.input,
                boxSizing: 'border-box',
                height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
              }}
            />
          </div>
          <div style={{ flex: isMobile ? '1' : '1', minWidth: isMobile ? '100%' : '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              種別
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: fontSizes.select,
                boxSizing: 'border-box',
                height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
              }}
            >
              <option value="all">すべて</option>
              {requestTypes.map((type) => (
                <option key={type.code} value={type.code}>{type.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: isMobile ? '1' : '1', minWidth: isMobile ? '100%' : '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              ステータス
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: fontSizes.select,
                boxSizing: 'border-box',
                height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
              }}
            >
              <option value="all">すべて</option>
              {requestStatuses.map((status) => (
                <option key={status.code} value={status.code}>{status.label}</option>
              ))}
            </select>
          </div>
          <div style={{ 
            fontSize: fontSizes.medium, 
            color: '#6b7280',
            flex: isMobile ? '1' : '0 0 auto',
            alignSelf: isMobile ? 'flex-start' : 'flex-end',
            paddingBottom: isMobile ? '0' : '0.25rem',
            minWidth: isMobile ? '100%' : 'auto'
          }}>
            検索結果: {filteredRequests.length}件
          </div>
          <div style={{ 
            flex: isMobile ? '1' : '0 0 auto',
            alignSelf: isMobile ? 'flex-start' : 'flex-end',
            minWidth: isMobile ? '100%' : 'auto',
            display: 'flex',
            gap: '0.5rem'
          }}>
            <SearchButton
              onClick={() => {}}
            />
            <ClearButton
              onClick={handleClearSearch}
            />
          </div>
          </div>
        )}
      </div>
        {filteredRequests.filter(req => req.status === '申請中').length > 0 && (
          <div style={{
            marginBottom: '1rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {(() => {
              const pendingRequests = filteredRequests.filter(req => req.status === '申請中');
              const allSelected = pendingRequests.length > 0 && 
                                pendingRequests.every(req => selectedRequestIds.has(req.id));
              return (
                <SelectAllButton
                  onClick={handleSelectAll}
                  isAllSelected={allSelected}
                />
              );
            })()}
            <BulkApproveButton
              onClick={handleBulkApprove}
              disabled={selectedRequestIds.size === 0}
              count={selectedRequestIds.size}
            />
          </div>
        )}

      {/* 申請一覧テーブル */}
      {filteredRequests.length === 0 ? (
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '2rem',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          申請はありません
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              style={{
                backgroundColor: request.status === '削除済み' || request.status === '取消' ? '#f3f4f6' : '#ffffff',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                opacity: request.status === '削除済み' || request.status === '取消' ? 0.7 : 1
              }}
            >
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: fontSizes.medium, color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : '#6b7280', marginBottom: '0.25rem' }}>種別</div>
                <div style={{ fontWeight: 'bold', color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : 'inherit' }}>{request.type}</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: fontSizes.medium, color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : '#6b7280', marginBottom: '0.25rem' }}>従業員</div>
                <div style={{ fontWeight: 'bold', color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : 'inherit' }}>{request.employeeName} ({request.employeeId})</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: fontSizes.medium, color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : '#6b7280', marginBottom: '0.25rem' }}>申請日時</div>
                <div style={{ color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : 'inherit' }}>{formatDate(request.requestedAt)} {new Date(request.requestedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>ステータス</div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: fontSizes.badge,
                  ...getRequestStatusStyle(request.status),
                  fontWeight: 'bold'
                }}>
                  {request.status}
                </span>
              </div>
              {request.type === '休暇申請' && request.leaveData && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>詳細</div>
                  <div style={{ fontSize: fontSizes.medium }}>
                    {request.leaveData.leaveType} / {formatDate(request.leaveData.startDate)}
                    {request.leaveData.startDate !== request.leaveData.endDate ? ` ～ ${formatDate(request.leaveData.endDate)}` : ''} / {request.leaveData.days}日{request.leaveData.isHalfDay ? '（半休）' : ''}
                  </div>
                </div>
              )}
              {request.type === '打刻修正申請' && request.attendanceData && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>詳細</div>
                  <div style={{ fontSize: fontSizes.medium }}>
                    修正対象日: {formatDate(request.attendanceData.date)}
                  </div>
                </div>
              )}
              {request.status === '申請中' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedRequestIds.has(request.id)}
                    onChange={() => handleToggleSelect(request.id)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <label style={{ fontSize: fontSizes.label, cursor: 'pointer' }}>一括承認対象</label>
                </div>
              )}
              {request.status === '申請中' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexDirection: 'column' }}>
                  <ApproveButton
                    onClick={() => handleApprove(request)}
                    fullWidth
                  />
                  <CancelApprovalButton
                    onClick={() => handleCancelApproval(request)}
                    fullWidth
                  />
                </div>
              )}
              {request.status === '承認' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <CancelApprovalButton
                    onClick={() => handleCancelApproval(request)}
                    fullWidth
                  />
                </div>
              )}
              {(request.status === '取消' || request.status === '削除済み') && (
                <div style={{ marginTop: '0.75rem', color: '#9ca3af', fontSize: fontSizes.small }}>
                  -
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ 
          overflowX: 'auto',
          maxHeight: isMobile ? '400px' : 'calc(100vh - 370px)',
          overflowY: 'auto',
          flex: 1
        }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1100px', border: '2px solid #e5e7eb' }}>
            <thead>
              <tr style={{ 
                borderBottom: '2px solid #e5e7eb', 
                backgroundColor: '#dbeafe',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                <th style={{ padding: '0.75rem', textAlign: 'center', width: '50px' }}>
                  {(() => {
                    const pendingRequests = filteredRequests.filter(req => req.status === '申請中');
                    const allSelected = pendingRequests.length > 0 && 
                                      pendingRequests.every(req => selectedRequestIds.has(req.id));
                    return pendingRequests.length > 0 ? (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer'
                        }}
                      />
                    ) : null;
                  })()}
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>種別</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>従業員</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>申請日時</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>詳細</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>ステータス</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>承認</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>取消</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr 
                  key={request.id} 
                  style={{ 
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: request.status === '削除済み' || request.status === '取消' ? '#f3f4f6' : '#ffffff',
                    opacity: request.status === '削除済み' || request.status === '取消' ? 0.7 : 1
                  }}
                >
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {request.status === '申請中' && (
                      <input
                        type="checkbox"
                        checked={selectedRequestIds.has(request.id)}
                        onChange={() => handleToggleSelect(request.id)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer'
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold', color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : 'inherit' }}>{request.type}</td>
                  <td style={{ padding: '0.75rem', color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : 'inherit' }}>{request.employeeName} ({request.employeeId})</td>
                  <td style={{ padding: '0.75rem', color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : 'inherit' }}>
                    {formatDate(request.requestedAt)} {new Date(request.requestedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: fontSizes.tableCell, color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : 'inherit' }}>
                    {request.type === '休暇申請' && request.leaveData && (
                      <div>
                        {request.leaveData.leaveType} / {formatDate(request.leaveData.startDate)}
                        {request.leaveData.startDate !== request.leaveData.endDate ? ` ～ ${formatDate(request.leaveData.endDate)}` : ''} / {request.leaveData.days}日{request.leaveData.isHalfDay ? '（半休）' : ''}
                      </div>
                    )}
                    {request.type === '打刻修正申請' && request.attendanceData && (
                      <div>
                        修正対象日: {formatDate(request.attendanceData.date)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: fontSizes.button,
                      ...getRequestStatusStyle(request.status),
                      fontWeight: 'bold'
                    }}>
                      {request.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {request.status === '申請中' ? (
                      <ApproveButton
                        onClick={() => handleApprove(request)}
                        isTableButton
                      />
                    ) : (
                      <span style={{ color: '#9ca3af' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {(request.status === '申請中' || request.status === '承認') ? (
                      <CancelApprovalButton
                        onClick={() => handleCancelApproval(request)}
                        isTableButton
                      />
                    ) : (
                      <span style={{ color: '#9ca3af' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
