/**
 * ファイル名: LeaveRequest.tsx
 * 画面名: 有給申請画面
 * 説明: 従業員の有給申請、有給残日数確認、過去の取得履歴確認を行う画面
 * 機能:
 *   - 有給申請（全休暇/半休の選択可能）
 *   - 有給残日数の確認（有給期限表示）
 *   - 過去の有給取得履歴の確認
 *   - 申請履歴の表示
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Snackbar } from '../../components/Snackbar';
import { ProgressBar } from '../../components/ProgressBar';
import { Button, ApplyButton, CancelApprovalButton, EditButton } from '../../components/Button';
import { getCurrentFiscalYear, isInFiscalYear } from '../../utils/fiscalYear';
import { fontSizes } from '../../config/fontSizes';
import { getLeaveTypes, getRequestStatusStyle } from '../../config/masterData';
import { formatDate } from '../../utils/formatters';
import { ConfirmModal } from '../../components/ConfirmModal';
import { 
  getLeaveRequestList, 
  createLeaveRequest, 
  updateLeaveRequest, 
  deleteLeaveRequest,
  LeaveRequest as ApiLeaveRequest
} from '../../utils/leaveRequestApi';
import { error as logError } from '../../utils/logger';
import { translateApiError } from '../../utils/apiErrorTranslator';
import { getLeaveTypeLabel, getLeaveRequestStatusLabel, getLeaveRequestStatusStyle, getLeaveTypeCodeFromLabel } from '../../utils/codeTranslator';
import { getUserInfo } from '../../config/apiConfig';

/**
 * 休暇申請を表すインターフェース。
 */
interface LeaveRequest {
  /** 申請ID。 */
  id: string;
  /** 従業員ID。 */
  employeeId: string;
  /** 開始日。 */
  startDate: string;
  /** 終了日。 */
  endDate: string;
  /** 日数。 */
  days: number;
  /** 休暇種別。 */
  type: '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他';
  /** 理由。 */
  reason: string;
  /** 申請ステータス。 */
  status: '申請中' | '承認' | '削除済み';
  /** 半休かどうか。 */
  isHalfDay?: boolean;
}

/**
 * 表示モードを表す型。
 */
type ViewMode = 'apply' | 'history' | 'edit';

/**
 * 有給申請画面コンポーネント。
 * 従業員の有給申請、有給残日数確認、過去の取得履歴確認を行います。
 *
 * @returns {JSX.Element} 有給申請画面コンポーネント。
 */
export const LeaveRequest: React.FC = () => {
  const { userId } = useAuth();
  // 認可APIから取得したemployeeIdを使用（userIdはCognitoのユーザーIDで、APIが期待するemployeeIdとは異なる）
  const getEmployeeId = (): string | null => {
    const userInfo = getUserInfo();
    return userInfo.employeeId;
  };
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFiscalYear, setSearchFiscalYear] = useState<number>(getCurrentFiscalYear());

  // APIから休暇申請一覧を取得
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      setIsLoading(true);
      try {
        const employeeId = getEmployeeId();
        if (!employeeId) {
          logError('Employee ID is not available. Please ensure you are logged in and authorized.');
          setSnackbar({ message: '従業員IDが取得できませんでした。ログインし直してください。', type: 'error' });
          setTimeout(() => setSnackbar(null), 5000);
          setIsLoading(false);
          return;
        }
        const response = await getLeaveRequestList(employeeId);
        // APIから返される英語コード（paid, special, sick, absence, other）を日本語に変換
        // APIから返されるステータスコード（pending, approved, rejected, deleted）を日本語に変換
        const convertedRequests: LeaveRequest[] = response.requests.map(req => ({
          id: req.id || (req as any).leaveRequestId || '', // idがundefinedの場合、leaveRequestIdをフォールバックとして使用
            employeeId: req.employeeId,
            startDate: req.startDate,
            endDate: req.endDate,
            days: req.days,
            type: getLeaveTypeLabel(req.leaveType) as LeaveRequest['type'], // 英語コード→日本語
            reason: req.reason,
            status: (req.status === 'rejected' ? '削除済み' : getLeaveRequestStatusLabel(req.status)) as LeaveRequest['status'], // 英語コード→日本語（rejectedは「取消」として扱うが、UIでは「削除済み」として表示）
            isHalfDay: req.isHalfDay
        }));
        setRequests(convertedRequests);
      } catch (error) {
        logError('Failed to fetch leave requests:', error);
        const errorMessage = translateApiError(error);
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaveRequests();
  }, [searchFiscalYear]);
  const leaveTypes = getLeaveTypes();
  const [formData, setFormData] = useState<Omit<LeaveRequest, 'id' | 'status'>>({
    employeeId: getEmployeeId() || '',
    startDate: '',
    endDate: '',
    days: 0,
    type: (leaveTypes[0]?.code || '有給') as LeaveRequest['type'],
    reason: '',
    isHalfDay: false
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState<ViewMode>('apply');
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 全休暇の場合、開始日と終了日から日数を自動計算
  useEffect(() => {
    if (!formData.isHalfDay && formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      setFormData(prev => {
        if (prev.days !== diffDays) {
          return { ...prev, days: diffDays };
        }
        return prev;
      });
    } else if (formData.isHalfDay && formData.startDate) {
      // 半休の場合は0.5日で固定
      setFormData(prev => {
        if (prev.days !== 0.5 || prev.endDate !== formData.startDate) {
          return { ...prev, days: 0.5, endDate: formData.startDate };
        }
        return prev;
      });
    }
  }, [formData.startDate, formData.endDate, formData.isHalfDay]);

  // 有給残日数の計算（申請時のバリデーション用）
  const totalPaidLeaveDays = 20; // 年間有給日数
  const usedPaidLeaveDays = requests
    .filter(req => req.type === '有給' && req.status === '承認')
    .reduce((sum, req) => sum + req.days, 0);
  const remainingPaidLeaveDays = totalPaidLeaveDays - usedPaidLeaveDays;

  // 申請履歴を年度でフィルタリング
  const filteredRequests = requests.filter(req => {
    return isInFiscalYear(req.startDate, searchFiscalYear);
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 半休の場合は終了日を開始日と同じにする
    const finalEndDate = formData.isHalfDay ? formData.startDate : formData.endDate;
    
    if (!formData.startDate || !formData.reason) {
      setSnackbar({ message: '必須項目を入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }

    if (!formData.isHalfDay && !formData.endDate) {
      setSnackbar({ message: '終了日を入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }

    try {
      // 認可APIから取得したemployeeIdを使用
      const employeeId = getEmployeeId();
      if (!employeeId) {
        setSnackbar({ message: '従業員IDが取得できませんでした。ログインし直してください。', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
        return;
      }

      // フォームの日本語コードを英語コードに変換してAPIに送信
      const leaveTypeCode = getLeaveTypeCodeFromLabel(formData.type);
      
      // 編集モードの判定: editingRequestIdが設定されている場合、またはviewModeが'edit'の場合は更新APIを呼び出す
      if (editingRequestId || viewMode === 'edit') {
        // editingRequestIdがnullの場合、viewModeが'edit'ならrequestsから該当する申請を探す
        let requestIdToUpdate = editingRequestId;
        if (!requestIdToUpdate && viewMode === 'edit') {
          // 編集画面では、formDataの内容から該当する申請を特定する
          const matchingRequest = requests.find(r => 
            r.startDate === formData.startDate && 
            r.endDate === (formData.isHalfDay ? formData.startDate : formData.endDate) &&
            r.reason === formData.reason &&
            r.status === '申請中'
          );
          if (matchingRequest) {
            requestIdToUpdate = matchingRequest.id;
            // editingRequestIdを復元
            setEditingRequestId(matchingRequest.id);
          } else {
            logError('⚠️ Cannot find matching request for update. editingRequestId is null and no matching request found.');
            setSnackbar({ message: '更新する申請が見つかりませんでした。', type: 'error' });
            setTimeout(() => setSnackbar(null), 3000);
            return;
          }
        }
        
        if (!requestIdToUpdate) {
          logError('⚠️ requestIdToUpdate is still null. Cannot update leave request.');
          setSnackbar({ message: '更新する申請IDが設定されていません。', type: 'error' });
          setTimeout(() => setSnackbar(null), 3000);
          return;
        }
        // 編集モード: PUT /api/v1/leave-requests/:requestId
        // API仕様書に基づき、更新APIはレスポンスにdataフィールドを含まないため、更新後に一覧を再取得
        await updateLeaveRequest(requestIdToUpdate, {
          employeeId: employeeId,
          startDate: formData.startDate,
          endDate: finalEndDate,
          leaveType: leaveTypeCode as 'paid' | 'special' | 'sick' | 'absence' | 'other',
          reason: formData.reason,
          days: formData.days,
          isHalfDay: formData.isHalfDay
        });

        // 更新成功後、一覧を再取得して最新の状態を反映
        const employeeIdForFetch = getEmployeeId();
        if (employeeIdForFetch) {
          const listResponse = await getLeaveRequestList(employeeIdForFetch);
          const convertedRequests: LeaveRequest[] = listResponse.requests.map(req => ({
            id: req.leaveRequestId || req.id,
            employeeId: req.employeeId,
            startDate: req.startDate,
            endDate: req.endDate,
            days: req.days,
            type: getLeaveTypeLabel(req.leaveType) as LeaveRequest['type'],
            reason: req.reason,
            status: (req.status === 'rejected' ? '削除済み' : getLeaveRequestStatusLabel(req.status)) as LeaveRequest['status'],
            isHalfDay: req.isHalfDay
          }));
          setRequests(convertedRequests);
        }

        setSnackbar({ message: '休暇申請を更新しました', type: 'success' });
      } else {
        // 新規登録モード
        const apiRequest = await createLeaveRequest({
          employeeId: employeeId,
          startDate: formData.startDate,
          endDate: finalEndDate,
          leaveType: leaveTypeCode as 'paid' | 'special' | 'sick' | 'absence' | 'other',
          reason: formData.reason,
          days: formData.days,
          isHalfDay: formData.isHalfDay
        });

        // APIレスポンスの英語コードを日本語に変換
        const newRequest: LeaveRequest = {
          id: apiRequest.id,
          employeeId: apiRequest.employeeId,
          startDate: apiRequest.startDate,
          endDate: apiRequest.endDate,
          days: apiRequest.days,
          type: getLeaveTypeLabel(apiRequest.leaveType) as LeaveRequest['type'],
          reason: apiRequest.reason,
          status: (apiRequest.status === 'rejected' ? '削除済み' : getLeaveRequestStatusLabel(apiRequest.status)) as LeaveRequest['status'],
          isHalfDay: apiRequest.isHalfDay
        };

        setRequests([newRequest, ...requests]);
        setSnackbar({ message: '有給申請を提出しました', type: 'success' });
      }
      
      // フォームをリセット
      setFormData({
        employeeId: userId || '',
        startDate: '',
        endDate: '',
        days: 0,
        type: (leaveTypes[0]?.code || '有給') as LeaveRequest['type'],
        reason: '',
        isHalfDay: false
      });
      setEditingRequestId(null);
      setViewMode('history');
      setTimeout(() => setSnackbar(null), 3000);
    } catch (error) {
      logError('Failed to submit leave request:', error);
      const errorMessage = error instanceof Error ? error.message : '休暇申請の送信に失敗しました';
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const handleEdit = (requestId: string | undefined) => {
    if (!requestId) {
      logError('⚠️ handleEdit called with undefined requestId');
      setSnackbar({ message: '編集する申請IDが設定されていません。', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }
    const request = requests.find(r => r.id === requestId);
    if (request && request.status === '申請中') {
      if (!request.id) {
        logError('⚠️ Request found but id is undefined', { request, requestId });
        setSnackbar({ message: '申請IDが正しく設定されていません。', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
        return;
      }
      setFormData({
        employeeId: request.employeeId,
        startDate: request.startDate,
        endDate: request.endDate,
        days: request.days,
        type: request.type,
        reason: request.reason,
        isHalfDay: request.isHalfDay || false
      });
      setEditingRequestId(request.id);
      setViewMode('edit');
    } else {
      logError(`⚠️ Cannot edit request: request not found or status is not '申請中'`, { requestId, request, status: request?.status });
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      employeeId: userId || '',
      startDate: '',
      endDate: '',
      days: 0,
      type: (leaveTypes[0]?.code || '有給') as LeaveRequest['type'],
      reason: '',
      isHalfDay: false
    });
    setEditingRequestId(null);
    setViewMode('history');
  };

  const handleCancelRequest = (requestId: string) => {
    setCancelRequestId(requestId);
  };

  const confirmCancelRequest = async () => {
    if (cancelRequestId) {
      try {
        await deleteLeaveRequest(cancelRequestId);
        setRequests(requests.filter(req => req.id !== cancelRequestId));
        setSnackbar({ message: '申請を取消しました', type: 'success' });
        setTimeout(() => setSnackbar(null), 3000);
        setCancelRequestId(null);
      } catch (error) {
        logError('Failed to delete leave request:', error);
        const errorMessage = error instanceof Error ? error.message : '申請の取消に失敗しました';
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
      }
    }
  };

  const cancelCancelRequest = () => {
    setCancelRequestId(null);
  };

  return (
    <div>
      {isLoading && <ProgressBar isLoading={true} />}
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
      <h2 style={{ marginBottom: isMobile ? '1rem' : '1.4rem', fontSize: isMobile ? '1.25rem' : '1.05rem' }}>
        休暇申請
      </h2>

      {/* タブナビゲーション */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: isMobile ? '1rem' : '1.5rem',
        borderBottom: '2px solid rgba(255, 255, 255, 0.25)',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => {
            if (viewMode === 'edit') {
              // 編集モードの場合は、キャンセルではなく編集を続ける
              // タブをクリックしても編集モードを維持する
            } else {
              setViewMode('apply');
            }
          }}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: (viewMode === 'apply' || viewMode === 'edit') ? '#92400e' : 'rgba(146, 64, 14, 0.4)',
            color: '#ffffff',
            border: 'none',
            borderBottom: (viewMode === 'apply' || viewMode === 'edit') ? '3px solid #ffffff' : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: (viewMode === 'apply' || viewMode === 'edit') ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            opacity: (viewMode === 'apply' || viewMode === 'edit') ? 1 : 0.8,
            textShadow: (viewMode === 'apply' || viewMode === 'edit')
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : '0 1px 2px rgba(0,0,0,0.25)'
          }}
        >
          申請
        </button>
        <button
          onClick={() => setViewMode('history')}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: viewMode === 'history' ? '#92400e' : 'rgba(146, 64, 14, 0.4)',
            color: '#ffffff',
            border: 'none',
            borderBottom: viewMode === 'history' ? '3px solid #ffffff' : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: viewMode === 'history' ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            opacity: viewMode === 'history' ? 1 : 0.8,
            textShadow: viewMode === 'history'
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : '0 1px 2px rgba(0,0,0,0.25)'
          }}
        >
          申請履歴
        </button>
      </div>

      {/* 申請画面・編集画面 */}
      {(viewMode === 'apply' || viewMode === 'edit') && (
        <div>
          <h3 style={{ marginBottom: '0.7rem', fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop }}>
            {viewMode === 'edit' ? '申請編集' : '新規申請'}
          </h3>
          <form onSubmit={handleSubmit} style={{
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '8px',
            maxWidth: isMobile ? '100%' : '600px'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                休暇種別 *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveRequest['type'] })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: fontSizes.select
                }}
              >
                {leaveTypes.map((type) => (
                  <option key={type.code} value={type.code}>{type.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                休暇区分 *
              </label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  backgroundColor: !formData.isHalfDay ? '#dbeafe' : 'transparent',
                  border: `2px solid ${!formData.isHalfDay ? '#2563eb' : '#d1d5db'}`,
                  fontSize: fontSizes.label
                }}>
                  <input
                    type="radio"
                    checked={!formData.isHalfDay}
                    onChange={() => {
                      setFormData({ ...formData, isHalfDay: false });
                    }}
                    style={{ marginRight: '0.5rem' }}
                  />
                  全休暇
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  backgroundColor: formData.isHalfDay ? '#dbeafe' : 'transparent',
                  border: `2px solid ${formData.isHalfDay ? '#2563eb' : '#d1d5db'}`,
                  fontSize: fontSizes.label
                }}>
                  <input
                    type="radio"
                    checked={formData.isHalfDay}
                    onChange={() => {
                      setFormData({ ...formData, isHalfDay: true, days: 0.5, endDate: formData.startDate });
                    }}
                    style={{ marginRight: '0.5rem' }}
                  />
                  半休（0.5日）
                </label>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                開始日 *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  setFormData({ ...formData, startDate: e.target.value });
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: fontSizes.button,
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            {!formData.isHalfDay && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                  終了日 *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value });
                  }}
                  min={formData.startDate}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: fontSizes.input,
                    boxSizing: 'border-box'
                  }}
                  required={!formData.isHalfDay}
                />
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                日数
              </label>
              <input
                type="text"
                value={formData.days > 0 ? `${formData.days}日${formData.days === 0.5 ? '（半休）' : ''}` : ''}
                readOnly
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: '#f3f4f6',
                  fontSize: fontSizes.input,
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                理由 *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  fontSize: fontSizes.textarea,
                  resize: 'vertical'
                }}
                placeholder="申請理由を入力してください"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
              {viewMode === 'edit' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelEdit}
                  fullWidth={isMobile}
                  style={{
                    order: isMobile ? 2 : 1
                  }}
                >
                  キャンセル
                </Button>
              )}
              <ApplyButton
                type="submit"
                fullWidth={isMobile}
                style={{
                  order: isMobile ? 1 : 2
                }}
              >
                {viewMode === 'edit' ? '更新' : '申請'}
              </ApplyButton>
            </div>
          </form>
        </div>
      )}

      {/* 申請履歴画面 */}
      {viewMode === 'history' && (
        <div>
          <h3 style={{ marginBottom: '0.7rem', fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop }}>申請履歴</h3>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              年度:
              <input
                type="number"
                value={searchFiscalYear}
                onChange={(e) => setSearchFiscalYear(parseInt(e.target.value) || getCurrentFiscalYear())}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: fontSizes.input,
                  width: '100px',
                  boxSizing: 'border-box'
                }}
              />
            </label>
            <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>
              ({searchFiscalYear}年4月 〜 {searchFiscalYear + 1}年3月)
            </span>
            {/* PC時のみ「今年度に戻す」ボタンを表示 */}
            {!isMobile && (
              <Button
                type="button"
                onClick={() => setSearchFiscalYear(getCurrentFiscalYear())}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  fontSize: fontSizes.button
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7280';
                  e.currentTarget.style.color = 'white';
                }}
              >
                今年度に戻す
              </Button>
            )}
          </div>
          <div style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            maxHeight: isMobile ? '400px' : '600px',
            overflowY: 'auto'
          }}>
            {filteredRequests.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>申請履歴がありません</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredRequests.map((request, index) => (
                  <div
                    key={request.id || `request-${index}`}
                    style={{
                      backgroundColor: request.status === '削除済み' ? '#f3f4f6' : 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      opacity: request.status === '削除済み' ? 0.7 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: request.status === '削除済み' ? '#9ca3af' : '#1f2937'
                      }}>
                        {request.type}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: fontSizes.badge,
                          ...getRequestStatusStyle(request.status),
                          fontWeight: 'bold'
                        }}>
                          {request.status}
                        </span>
                        {request.status === '申請中' && (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {isMobile ? (
                              <EditButton
                                onClick={() => handleEdit(request.id)}
                                size="small"
                              />
                            ) : (
                              <Button
                                variant="icon-edit"
                                onClick={() => handleEdit(request.id)}
                                title="編集"
                              />
                            )}
                            <CancelApprovalButton
                              onClick={() => handleCancelRequest(request.id)}
                              isTableButton
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: fontSizes.medium, 
                      color: request.status === '削除済み' ? '#9ca3af' : '#6b7280', 
                      marginBottom: '0.5rem' 
                    }}>
                      {formatDate(request.startDate)} {request.startDate !== request.endDate ? `～ ${formatDate(request.endDate)}` : ''} 
                      ({request.days}日{request.isHalfDay ? '（半休）' : ''})
                    </div>
                    <div style={{ 
                      fontSize: fontSizes.medium,
                      color: request.status === '削除済み' ? '#9ca3af' : '#1f2937'
                    }}>
                      {request.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 取消確認モーダル */}
      <ConfirmModal
        isOpen={cancelRequestId !== null}
        title="休暇申請取消確認"
        message="申請を取消しますか？"
        confirmText="取消"
        onConfirm={confirmCancelRequest}
        onCancel={cancelCancelRequest}
        isMobile={isMobile}
      />
    </div>
  );
};

