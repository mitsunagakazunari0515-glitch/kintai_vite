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

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  days: number;
  type: '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他';
  reason: string;
  status: '申請中' | '承認' | '削除済み';
  isHalfDay?: boolean;
  requestedAt: string;
}

interface AttendanceCorrectionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  originalClockIn: string | null;
  originalClockOut: string | null;
  requestedClockIn: string;
  requestedClockOut: string | null;
  requestedBreaks: Array<{ start: string; end: string | null }>;
  reason: string;
  status: '申請中' | '承認' | '却下';
  requestedAt: string;
}

interface UnifiedRequest {
  id: string;
  type: '休暇申請' | '打刻修正申請';
  employeeId: string;
  employeeName: string;
  status: '申請中' | '承認' | '却下' | '削除済み';
  requestedAt: string;
  // 休暇申請のフィールド
  leaveData?: {
    startDate: string;
    endDate: string;
    days: number;
    leaveType: '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他';
    reason: string;
    isHalfDay?: boolean;
  };
  // 打刻修正申請のフィールド
  attendanceData?: {
    date: string;
    originalClockIn: string | null;
    originalClockOut: string | null;
    requestedClockIn: string;
    requestedClockOut: string | null;
    requestedBreaks: Array<{ start: string; end: string | null }>;
    reason: string;
  };
}

export const RequestApproval: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);
  const [searchYearMonthFrom, setSearchYearMonthFrom] = useState('');
  const [searchYearMonthTo, setSearchYearMonthTo] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // 'all' | '休暇申請' | '打刻修正申請'
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all' | '申請中' | '承認' | '却下' | '削除済み'
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());

  // ダミーデータ：有給申請
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: 'leave-1',
      employeeId: 'EMP001',
      employeeName: '山田太郎',
      startDate: '2025-12-20',
      endDate: '2025-12-20',
      days: 1,
      type: '有給',
      reason: '私用のため',
      status: '申請中',
      isHalfDay: false,
      requestedAt: '2025-12-15T10:00:00'
    },
    {
      id: 'leave-2',
      employeeId: 'EMP002',
      employeeName: '佐藤花子',
      startDate: '2025-12-25',
      endDate: '2025-12-25',
      days: 0.5,
      type: '有給',
      reason: '午前中のみ',
      status: '申請中',
      isHalfDay: true,
      requestedAt: '2025-12-16T14:30:00'
    },
    {
      id: 'leave-3',
      employeeId: 'EMP003',
      employeeName: '鈴木一郎',
      startDate: '2025-12-28',
      endDate: '2025-12-30',
      days: 3,
      type: '有給',
      reason: '旅行のため',
      status: '申請中',
      isHalfDay: false,
      requestedAt: '2025-12-17T09:15:00'
    },
    {
      id: 'leave-4',
      employeeId: 'EMP004',
      employeeName: '田中次郎',
      startDate: '2025-12-22',
      endDate: '2025-12-22',
      days: 1,
      type: '欠勤',
      reason: '体調不良のため',
      status: '申請中',
      isHalfDay: false,
      requestedAt: '2025-12-18T08:00:00'
    },
    // 過去の申請（承認済み）
    {
      id: 'leave-5',
      employeeId: 'EMP001',
      employeeName: '山田太郎',
      startDate: '2025-12-10',
      endDate: '2025-12-10',
      days: 1,
      type: '有給',
      reason: '私用のため',
      status: '承認',
      isHalfDay: false,
      requestedAt: '2025-12-05T10:00:00'
    },
    {
      id: 'leave-6',
      employeeId: 'EMP002',
      employeeName: '佐藤花子',
      startDate: '2025-12-08',
      endDate: '2025-12-08',
      days: 0.5,
      type: '有給',
      reason: '午前中のみ',
      status: '承認',
      isHalfDay: true,
      requestedAt: '2025-12-03T14:30:00'
    },
    // 過去の申請（削除済み）
    {
      id: 'leave-7',
      employeeId: 'EMP003',
      employeeName: '鈴木一郎',
      startDate: '2025-12-05',
      endDate: '2025-12-05',
      days: 1,
      type: '有給',
      reason: '私用のため',
      status: '削除済み',
      isHalfDay: false,
      requestedAt: '2025-11-30T09:00:00'
    }
  ]);

  // ダミーデータ：打刻修正申請
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceCorrectionRequest[]>([
    {
      id: 'attendance-1',
      employeeId: 'EMP001',
      employeeName: '山田太郎',
      date: '2025-12-10',
      originalClockIn: '09:00',
      originalClockOut: '18:00',
      requestedClockIn: '09:15',
      requestedClockOut: '18:15',
      requestedBreaks: [{ start: '12:00', end: '13:00' }],
      reason: '出勤時刻を間違えて打刻してしまいました',
      status: '申請中',
      requestedAt: '2025-12-11T10:00:00'
    },
    {
      id: 'attendance-2',
      employeeId: 'EMP002',
      employeeName: '佐藤花子',
      date: '2025-12-12',
      originalClockIn: '09:10',
      originalClockOut: null,
      requestedClockIn: '09:10',
      requestedClockOut: '18:10',
      requestedBreaks: [{ start: '12:10', end: '13:10' }],
      reason: '退勤時刻を打刻し忘れました',
      status: '申請中',
      requestedAt: '2025-12-13T09:00:00'
    },
    {
      id: 'attendance-3',
      employeeId: 'EMP003',
      employeeName: '鈴木一郎',
      date: '2025-12-14',
      originalClockIn: '09:05',
      originalClockOut: '18:05',
      requestedClockIn: '09:05',
      requestedClockOut: '18:20',
      requestedBreaks: [{ start: '12:00', end: '13:00' }, { start: '15:00', end: '15:15' }],
      reason: '休憩時間を追加したいです',
      status: '申請中',
      requestedAt: '2025-12-15T11:30:00'
    },
    // 過去の申請（承認済み）
    {
      id: 'attendance-4',
      employeeId: 'EMP001',
      employeeName: '山田太郎',
      date: '2025-12-05',
      originalClockIn: '09:00',
      originalClockOut: '18:00',
      requestedClockIn: '09:10',
      requestedClockOut: '18:10',
      requestedBreaks: [{ start: '12:00', end: '13:00' }],
      reason: '出勤時刻を修正したいです',
      status: '承認',
      requestedAt: '2025-12-06T10:00:00'
    },
    // 過去の申請（却下済み）
    {
      id: 'attendance-5',
      employeeId: 'EMP002',
      employeeName: '佐藤花子',
      date: '2025-12-03',
      originalClockIn: '09:10',
      originalClockOut: '18:10',
      requestedClockIn: '09:00',
      requestedClockOut: '18:00',
      requestedBreaks: [{ start: '12:10', end: '13:10' }],
      reason: '打刻時刻を修正したいです',
      status: '却下',
      requestedAt: '2025-12-04T09:00:00'
    }
  ]);

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
      employeeName: req.employeeName,
      status: req.status,
      requestedAt: req.requestedAt,
      leaveData: {
        startDate: req.startDate,
        endDate: req.endDate,
        days: req.days,
        leaveType: req.type,
        reason: req.reason,
        isHalfDay: req.isHalfDay
      }
    })),
    ...attendanceRequests.map(req => ({
      id: req.id,
      type: '打刻修正申請' as const,
      employeeId: req.employeeId,
      employeeName: req.employeeName,
      status: req.status,
      requestedAt: req.requestedAt,
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

  // 申請の却下
  const handleReject = (request: UnifiedRequest) => {
    setConfirmModal({
      isOpen: true,
      title: '申請の却下',
      message: '申請を却下しますか？',
      confirmText: '却下',
      onConfirm: () => {
        if (request.type === '休暇申請') {
          setLeaveRequests(prev => 
            prev.map(req => req.id === request.id ? { ...req, status: '削除済み' as const } : req)
          );
          setSnackbar({ message: '休暇申請を却下しました', type: 'success' });
        } else {
          setAttendanceRequests(prev => 
            prev.map(req => req.id === request.id ? { ...req, status: '却下' as const } : req)
          );
          setSnackbar({ message: '打刻修正申請を却下しました', type: 'success' });
        }
        setConfirmModal(null);
      }
    });
  };

  // 承認済み申請の取消
  const handleCancelApproval = (request: UnifiedRequest) => {
    setConfirmModal({
      isOpen: true,
      title: '承認の取消',
      message: '承認を取り消しますか？',
      confirmText: '取消',
      onConfirm: () => {
        if (request.type === '休暇申請') {
          setLeaveRequests(prev => 
            prev.map(req => req.id === request.id ? { ...req, status: '申請中' as const } : req)
          );
          setSnackbar({ message: '休暇申請の承認を取り消しました', type: 'success' });
        } else {
          setAttendanceRequests(prev => 
            prev.map(req => req.id === request.id ? { ...req, status: '申請中' as const } : req)
          );
          setSnackbar({ message: '打刻修正申請の承認を取り消しました', type: 'success' });
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
        padding: isMobile ? '0.75rem' : '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '0.75rem' : '1rem',
          alignItems: isMobile ? 'stretch' : 'flex-end',
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
              <option value="休暇申請">休暇申請</option>
              <option value="打刻修正申請">打刻修正申請</option>
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
              <option value="申請中">申請中</option>
              <option value="承認">承認</option>
              <option value="却下">却下</option>
              <option value="削除済み">削除済み</option>
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
            minWidth: isMobile ? '100%' : 'auto'
          }}>
            <button
              onClick={handleClearSearch}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: 'none',
                minHeight: 'auto',
                minWidth: 'auto',
                height: 'calc(0.5rem * 2 + 0.875rem + 2px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              クリア
            </button>
          </div>
        </div>
        {filteredRequests.filter(req => req.status === '申請中').length > 0 && (
          <div style={{
            marginTop: '1rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleSelectAll}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: 'none',
                minHeight: 'auto',
                minWidth: 'auto'
              }}
            >
              {(() => {
                const pendingRequests = filteredRequests.filter(req => req.status === '申請中');
                const allSelected = pendingRequests.length > 0 && 
                                  pendingRequests.every(req => selectedRequestIds.has(req.id));
                return allSelected ? '全解除' : '全選択';
              })()}
            </button>
            <button
              onClick={handleBulkApprove}
              disabled={selectedRequestIds.size === 0}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: selectedRequestIds.size === 0 ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: selectedRequestIds.size === 0 ? 'not-allowed' : 'pointer',
                boxShadow: 'none',
                minHeight: 'auto',
                minWidth: 'auto',
                opacity: selectedRequestIds.size === 0 ? 0.5 : 1
              }}
            >
              一括承認 ({selectedRequestIds.size}件)
            </button>
          </div>
        )}
      </div>

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
                backgroundColor: request.status === '削除済み' || request.status === '却下' ? '#f3f4f6' : '#ffffff',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                opacity: request.status === '削除済み' || request.status === '却下' ? 0.7 : 1
              }}
            >
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: fontSizes.medium, color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : '#6b7280', marginBottom: '0.25rem' }}>種別</div>
                <div style={{ fontWeight: 'bold', color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : 'inherit' }}>{request.type}</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: fontSizes.medium, color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : '#6b7280', marginBottom: '0.25rem' }}>従業員</div>
                <div style={{ fontWeight: 'bold', color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : 'inherit' }}>{request.employeeName} ({request.employeeId})</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: fontSizes.medium, color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : '#6b7280', marginBottom: '0.25rem' }}>申請日時</div>
                <div style={{ color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : 'inherit' }}>{formatDate(request.requestedAt)} {new Date(request.requestedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>ステータス</div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: fontSizes.badge,
                  backgroundColor: request.status === '申請中' ? '#fef3c7' : request.status === '承認' ? '#d1fae5' : request.status === '削除済み' ? '#e5e7eb' : '#fee2e2',
                  color: request.status === '申請中' ? '#92400e' : request.status === '承認' ? '#065f46' : request.status === '削除済み' ? '#6b7280' : '#991b1b',
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
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    onClick={() => handleReject(request)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      minHeight: 'auto',
                      minWidth: 'auto'
                    }}
                  >
                    却下
                  </button>
                  <button
                    onClick={() => handleApprove(request)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      minHeight: 'auto',
                      minWidth: 'auto'
                    }}
                  >
                    承認
                  </button>
                </div>
              )}
              {request.status === '承認' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    onClick={() => handleCancelApproval(request)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: fontSizes.button,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      minHeight: 'auto',
                      minWidth: 'auto'
                    }}
                  >
                    承認取消
                  </button>
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
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1000px', border: '2px solid #e5e7eb' }}>
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
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr 
                  key={request.id} 
                  style={{ 
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: request.status === '削除済み' || request.status === '却下' ? '#f3f4f6' : '#ffffff',
                    opacity: request.status === '削除済み' || request.status === '却下' ? 0.7 : 1
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
                  <td style={{ padding: '0.75rem', fontWeight: 'bold', color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : 'inherit' }}>{request.type}</td>
                  <td style={{ padding: '0.75rem', color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : 'inherit' }}>{request.employeeName} ({request.employeeId})</td>
                  <td style={{ padding: '0.75rem', color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : 'inherit' }}>
                    {formatDate(request.requestedAt)} {new Date(request.requestedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: fontSizes.tableCell, color: request.status === '削除済み' || request.status === '却下' ? '#9ca3af' : 'inherit' }}>
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
                      backgroundColor: request.status === '申請中' ? '#fef3c7' : request.status === '承認' ? '#d1fae5' : request.status === '削除済み' ? '#e5e7eb' : '#fee2e2',
                      color: request.status === '申請中' ? '#92400e' : request.status === '承認' ? '#065f46' : request.status === '削除済み' ? '#6b7280' : '#991b1b',
                      fontWeight: 'bold'
                    }}>
                      {request.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {request.status === '申請中' && (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleReject(request)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: 'none',
                            minHeight: 'auto',
                            minWidth: 'auto'
                          }}
                        >
                          却下
                        </button>
                        <button
                          onClick={() => handleApprove(request)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: 'none',
                            minHeight: 'auto',
                            minWidth: 'auto'
                          }}
                        >
                          承認
                        </button>
                      </div>
                    )}
                    {request.status === '承認' && (
                      <button
                        onClick={() => handleCancelApproval(request)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: 'none',
                          minHeight: 'auto',
                          minWidth: 'auto'
                        }}
                      >
                        承認取消
                      </button>
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
