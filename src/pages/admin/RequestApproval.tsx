/**
 * ファイル名: RequestApproval.tsx
 * 画面名: 申請一覧画面
 * 説明: 打刻の修正申請や有給申請を承認する画面（管理者用）
 * 機能:
 *   - すべての申請を一覧表示
 *   - 申請の承認・却下
 *   - 未対応申請のバッチ表示
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Snackbar } from '../../components/Snackbar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { formatDate } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { getRequestStatuses, getRequestTypes, getRequestStatusStyle, getLeaveTypes } from '../../config/masterData';
import { ChevronDownIcon, ChevronUpIcon } from '../../components/Icons';
import { ApproveButton, BulkApproveButton, CancelApprovalButton, SelectAllButton, SearchButton, ClearButton, Button, RegisterButton, CancelButton } from '../../components/Button';
import { 
  getApplicationList,
  updateApplicationStatus,
  UnifiedApplication as ApiUnifiedApplication
} from '../../utils/applicationApi';
import { getEmployees, EmployeeResponse } from '../../utils/employeeApi';
import { createLeaveRequest } from '../../utils/leaveRequestApi';
import { getLeaveTypeLabel, getLeaveTypeCodeFromLabel, getLeaveRequestStatusLabel } from '../../utils/codeTranslator';
import { log, error as logError } from '../../utils/logger';
import { translateApiError } from '../../utils/apiErrorTranslator';
import { ProgressBar } from '../../components/ProgressBar';

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
  
  // ローカルストレージから検索条件を読み込む
  const loadSearchConditions = () => {
    try {
      const saved = localStorage.getItem('requestApprovalSearchConditions');
      if (saved) {
        const conditions = JSON.parse(saved);
        return {
          searchYearMonthFrom: conditions.searchYearMonthFrom || getCurrentYearMonth(),
          searchYearMonthTo: conditions.searchYearMonthTo || getCurrentYearMonth(),
          filterType: conditions.filterType || 'all',
          filterStatus: conditions.filterStatus || 'all'
        };
      }
    } catch (error) {
      // パースエラー時はデフォルト値を返す
    }
    return {
      searchYearMonthFrom: getCurrentYearMonth(),
      searchYearMonthTo: getCurrentYearMonth(),
      filterType: 'all',
      filterStatus: 'all'
    };
  };
  
  // 検索条件をローカルストレージに保存
  const saveSearchConditions = (conditions: {
    searchYearMonthFrom: string;
    searchYearMonthTo: string;
    filterType: string;
    filterStatus: string;
  }) => {
    try {
      const data = JSON.stringify(conditions);
      localStorage.setItem('requestApprovalSearchConditions', data);
      log('検索条件をローカルストレージに保存:', conditions);
    } catch (error) {
      logError('検索条件の保存に失敗:', error);
    }
  };
  
  // 検索条件（入力用）- 初期値はローカルストレージから読み込む
  const [searchYearMonthFrom, setSearchYearMonthFrom] = useState(() => {
    const conditions = loadSearchConditions();
    return conditions.searchYearMonthFrom;
  });
  const [searchYearMonthTo, setSearchYearMonthTo] = useState(() => {
    const conditions = loadSearchConditions();
    return conditions.searchYearMonthTo;
  });
  const [filterType, setFilterType] = useState<string>(() => {
    const conditions = loadSearchConditions();
    return conditions.filterType;
  }); // 'all' | '休暇申請' | '打刻修正申請'
  const [filterStatus, setFilterStatus] = useState<string>(() => {
    const conditions = loadSearchConditions();
    return conditions.filterStatus;
  }); // 'all' | '申請中' | '承認' | '取消' | '削除済み'
  
  // 検索条件（API用）- 初期値はローカルストレージから読み込む
  const [apiSearchYearMonthFrom, setApiSearchYearMonthFrom] = useState(() => {
    const conditions = loadSearchConditions();
    return conditions.searchYearMonthFrom;
  });
  const [apiSearchYearMonthTo, setApiSearchYearMonthTo] = useState(() => {
    const conditions = loadSearchConditions();
    return conditions.searchYearMonthTo;
  });
  const [apiFilterType, setApiFilterType] = useState<string>(() => {
    const conditions = loadSearchConditions();
    return conditions.filterType;
  });
  const [apiFilterStatus, setApiFilterStatus] = useState<string>(() => {
    const conditions = loadSearchConditions();
    return conditions.filterStatus;
  });
  
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false); // モバイル時の検索条件の展開状態
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const leaveTypes = getLeaveTypes();
  const [registerFormData, setRegisterFormData] = useState<{
    employeeId: string;
    startDate: string;
    endDate: string;
    days: number;
    type: '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他';
    reason: string;
    isHalfDay: boolean;
  }>({
    employeeId: '',
    startDate: '',
    endDate: '',
    days: 0,
    type: getLeaveTypeLabel(leaveTypes[0]?.code || 'paid') as '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他',
    reason: '',
    isHalfDay: false
  });

  // 申請一覧（APIから取得）
  const [allRequests, setAllRequests] = useState<UnifiedRequest[]>([]);

  // 従業員一覧（従業員名マッピング用）
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // APIから申請一覧を取得
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      // 従業員一覧を取得してマップを作成
      const employeesList = await getEmployees();
      setEmployees(employeesList);
      const employeeMap = new Map<string, string>();
      employeesList.forEach(emp => employeeMap.set(emp.id, `${emp.firstName} ${emp.lastName}`));

      // 申請一覧を取得
      const response = await getApplicationList(
        apiSearchYearMonthFrom || undefined,
        apiSearchYearMonthTo || undefined,
        apiFilterType === 'all' ? undefined : (apiFilterType === '休暇申請' ? 'leave_request' : apiFilterType === '打刻修正申請' ? 'attendance_correction_request' : undefined),
        apiFilterStatus === 'all' ? undefined : (apiFilterStatus === '申請中' ? 'pending' : apiFilterStatus === '承認' ? 'approved' : apiFilterStatus === '取消' ? 'rejected' : apiFilterStatus === '削除済み' ? 'deleted' : undefined)
      );

      // APIレスポンスをUI用の形式に変換
      const convertedRequests: UnifiedRequest[] = response.requests.map(apiReq => {
        const baseRequest: UnifiedRequest = {
          id: apiReq.id,
          type: apiReq.type === 'leave_request' ? '休暇申請' : '打刻修正申請',
          employeeId: apiReq.employeeId,
          employeeName: employeeMap.get(apiReq.employeeId) || apiReq.employeeName || '不明な従業員',
          status: apiReq.status === 'pending' ? '申請中' : apiReq.status === 'approved' ? '承認' : apiReq.status === 'rejected' ? '取消' : '削除済み',
          requestedAt: apiReq.requestedAt
        };

        if (apiReq.type === 'leave_request' && apiReq.leaveData) {
          baseRequest.leaveData = {
            startDate: apiReq.leaveData.startDate,
            endDate: apiReq.leaveData.endDate,
            days: apiReq.leaveData.days,
            leaveType: getLeaveTypeLabel(apiReq.leaveData.leaveType) as '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他',
            reason: apiReq.leaveData.reason,
            isHalfDay: apiReq.leaveData.isHalfDay
          };
        } else if (apiReq.type === 'attendance_correction_request' && apiReq.attendanceData) {
          baseRequest.attendanceData = {
            date: apiReq.attendanceData.date,
            originalClockIn: apiReq.attendanceData.originalClockIn,
            originalClockOut: apiReq.attendanceData.originalClockOut,
            requestedClockIn: apiReq.attendanceData.requestedClockIn,
            requestedClockOut: apiReq.attendanceData.requestedClockOut,
            requestedBreaks: apiReq.attendanceData.requestedBreaks,
            reason: apiReq.attendanceData.reason
          };
        }

        return baseRequest;
      });

      setAllRequests(convertedRequests);
    } catch (error) {
      logError('Failed to fetch applications:', error);
      const errorMessage = translateApiError(error);
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [apiSearchYearMonthFrom, apiSearchYearMonthTo, apiFilterType, apiFilterStatus]);

  // 初期表示時にAPIを呼ぶ
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchApplications();
    }
  }, []); // 初期表示時のみ実行

  // 検索ボタン押下時の処理
  const handleSearch = () => {
    // 入力用の検索条件をAPI用の検索条件に反映
    setApiSearchYearMonthFrom(searchYearMonthFrom);
    setApiSearchYearMonthTo(searchYearMonthTo);
    setApiFilterType(filterType);
    setApiFilterStatus(filterStatus);
    
    // 検索条件をローカルストレージに保存
    saveSearchConditions({
      searchYearMonthFrom,
      searchYearMonthTo,
      filterType,
      filterStatus
    });
  };

  // API用の検索条件が変更されたらAPIを呼ぶ（検索ボタン押下時のみ）
  useEffect(() => {
    if (isInitialMount.current) {
      return; // 初期表示時はスキップ（既に別のuseEffectで呼ばれている）
    }
    fetchApplications();
  }, [fetchApplications]);

  // 検索条件が変更されたらローカルストレージに保存
  useEffect(() => {
    // 初期表示時はスキップ（初期値の設定による不要な保存を防ぐ）
    if (isInitialMount.current) {
      return;
    }
    // 検索条件をローカルストレージに保存
    saveSearchConditions({
      searchYearMonthFrom,
      searchYearMonthTo,
      filterType,
      filterStatus
    });
  }, [searchYearMonthFrom, searchYearMonthTo, filterType, filterStatus]);

  // フィルタリング処理（フロントエンド側のフィルタリングは不要、APIでフィルタリング済み）
  const filteredRequests = allRequests;

  // 日付フォーマット関数（yyyy/mm/dd形式）

  // 申請の承認
  const handleApprove = async (request: UnifiedRequest) => {
    setIsLoading(true);
    try {
      await updateApplicationStatus({
        requestId: request.id,
        type: request.type === '休暇申請' ? 'leave' : 'attendance',
        action: 'approve'
      });

      // ローカル状態を更新
      setAllRequests(prev =>
        prev.map(req => req.id === request.id ? { ...req, status: '承認' as const } : req)
      );

      setSnackbar({ 
        message: request.type === '休暇申請' ? '休暇申請を承認しました' : '打刻修正申請を承認しました', 
        type: 'success' 
      });
      setTimeout(() => setSnackbar(null), 3000);
    } catch (error) {
      logError('Failed to approve application:', error);
      const errorMessage = translateApiError(error);
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // 申請の取消（申請中・承認どちらの場合も取消可能）
  const handleCancelApproval = (request: UnifiedRequest) => {
    setConfirmModal({
      isOpen: true,
      title: request.status === '申請中' ? '申請の取消' : '承認の取消',
      message: request.status === '申請中' ? '申請を取り消しますか？' : '承認を取り消しますか？',
      confirmText: '取消',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await updateApplicationStatus({
            requestId: request.id,
            type: request.type === '休暇申請' ? 'leave' : 'attendance',
            action: 'reject'
          });

          // ローカル状態を更新
          setAllRequests(prev =>
            prev.map(req => req.id === request.id ? { ...req, status: '取消' as const } : req)
          );

          setSnackbar({ 
            message: request.status === '申請中' 
              ? (request.type === '休暇申請' ? '休暇申請を取り消しました' : '打刻修正申請を取り消しました')
              : (request.type === '休暇申請' ? '休暇申請の承認を取り消しました' : '打刻修正申請の承認を取り消しました'), 
            type: 'success' 
          });
          setTimeout(() => setSnackbar(null), 3000);
        } catch (error) {
          logError('Failed to reject application:', error);
          const errorMessage = translateApiError(error);
          setSnackbar({ message: errorMessage, type: 'error' });
          setTimeout(() => setSnackbar(null), 5000);
        } finally {
          setIsLoading(false);
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
      onConfirm: async () => {
        setIsLoading(true);
        try {
          // すべての申請を並列で承認
          await Promise.all(
            selectedPendingRequests.map(request =>
              updateApplicationStatus({
                requestId: request.id,
                type: request.type === '休暇申請' ? 'leave' : 'attendance',
                action: 'approve'
              })
            )
          );

          // ローカル状態を更新
          setAllRequests(prev =>
            prev.map(req => 
              selectedPendingRequests.some(selected => selected.id === req.id)
                ? { ...req, status: '承認' as const }
                : req
            )
          );

          setSelectedRequestIds(new Set());
          setSnackbar({ message: `${selectedPendingRequests.length}件の申請を一括承認しました`, type: 'success' });
          setTimeout(() => setSnackbar(null), 3000);
        } catch (error) {
          logError('Failed to bulk approve applications:', error);
          const errorMessage = translateApiError(error);
          setSnackbar({ message: errorMessage, type: 'error' });
          setTimeout(() => setSnackbar(null), 5000);
        } finally {
          setIsLoading(false);
        }
        setConfirmModal(null);
      }
    });
  };

  // 検索条件をクリア
  const handleClearSearch = () => {
    const currentYearMonth = getCurrentYearMonth();
    setSearchYearMonthFrom(currentYearMonth);
    setSearchYearMonthTo(currentYearMonth);
    setFilterType('all');
    setFilterStatus('all');
    
    // API用の検索条件もクリアしてAPIを呼ぶ
    setApiSearchYearMonthFrom(currentYearMonth);
    setApiSearchYearMonthTo(currentYearMonth);
    setApiFilterType('all');
    setApiFilterStatus('all');
    
    // ローカルストレージから検索条件を削除
    try {
      localStorage.removeItem('requestApprovalSearchConditions');
    } catch (error) {
      // 削除エラーは無視
    }
  };

  // 全休暇の場合、開始日と終了日から日数を自動計算
  useEffect(() => {
    if (!registerFormData.isHalfDay && registerFormData.startDate && registerFormData.endDate) {
      const start = new Date(registerFormData.startDate);
      const end = new Date(registerFormData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      setRegisterFormData(prev => {
        if (prev.days !== diffDays) {
          return { ...prev, days: diffDays };
        }
        return prev;
      });
    } else if (registerFormData.isHalfDay && registerFormData.startDate) {
      // 半休の場合は0.5日で固定
      setRegisterFormData(prev => {
        if (prev.days !== 0.5 || prev.endDate !== registerFormData.startDate) {
          return { ...prev, days: 0.5, endDate: registerFormData.startDate };
        }
        return prev;
      });
    }
  }, [registerFormData.startDate, registerFormData.endDate, registerFormData.isHalfDay]);

  // 代理登録の処理
  const handleRegisterLeaveRequest = async () => {
    // 半休の場合は終了日を開始日と同じにする
    const finalEndDate = registerFormData.isHalfDay ? registerFormData.startDate : registerFormData.endDate;
    
    if (!registerFormData.employeeId || !registerFormData.startDate || !registerFormData.reason) {
      setSnackbar({ message: '必須項目を入力してください', type: 'error' });
      return;
    }

    if (!registerFormData.isHalfDay && !registerFormData.endDate) {
      setSnackbar({ message: '終了日を入力してください', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      // UIの日本語ラベルをAPIの英語コードに変換
      const apiLeaveType = getLeaveTypeCodeFromLabel(registerFormData.type) as 'paid' | 'special' | 'sick' | 'absence' | 'other';

      const apiRequest = await createLeaveRequest({
        employeeId: registerFormData.employeeId,
        startDate: registerFormData.startDate,
        endDate: finalEndDate,
        leaveType: apiLeaveType,
        reason: registerFormData.reason,
        isHalfDay: registerFormData.isHalfDay
      });

      // 従業員名を取得
      const selectedEmployee = employees.find(emp => emp.id === registerFormData.employeeId);
      const employeeName = selectedEmployee 
        ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
        : '不明な従業員';

      // ローカル状態に追加（APIから取得したデータを変換）
      const newRequest: UnifiedRequest = {
        id: apiRequest.id,
        type: '休暇申請',
        employeeId: apiRequest.employeeId,
        employeeName: employeeName,
        status: getLeaveRequestStatusLabel(apiRequest.status) as '申請中' | '承認' | '取消' | '削除済み',
        requestedAt: apiRequest.requestedAt,
        leaveData: {
          startDate: apiRequest.startDate,
          endDate: apiRequest.endDate,
          days: apiRequest.days,
          leaveType: getLeaveTypeLabel(apiRequest.leaveType) as '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他',
          reason: apiRequest.reason,
          isHalfDay: apiRequest.isHalfDay
        }
      };

      setShowRegisterModal(false);
      setRegisterFormData({
        employeeId: '',
        startDate: '',
        endDate: '',
        days: 0,
        type: getLeaveTypeLabel(leaveTypes[0]?.code || 'paid') as '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他',
        reason: '',
        isHalfDay: false
      });
      setSnackbar({ message: '休暇申請を代理で登録しました', type: 'success' });
      setTimeout(() => setSnackbar(null), 3000);
      
      // 代理申請登録完了後、再度検索条件のもと申請一覧取得APIを叩く
      await fetchApplications();
    } catch (error) {
      logError('Failed to register leave request:', error);
      const errorMessage = translateApiError(error);
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // モーダルを閉じる
  const handleCancelRegister = () => {
    setShowRegisterModal(false);
    setRegisterFormData({
      employeeId: '',
      startDate: '',
      endDate: '',
      days: 0,
      type: getLeaveTypeLabel(leaveTypes[0]?.code || 'paid') as '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他',
      reason: '',
      isHalfDay: false
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%' }}>
      {isLoading && <ProgressBar />}
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: isMobile ? '1rem' : '1.4rem',
        marginTop: isMobile ? '0.5rem' : '0.75rem'
      }}>
        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.05rem', margin: 0 }}>
          申請一覧
        </h2>
        <Button
          variant="primary"
          onClick={() => setShowRegisterModal(true)}
          size={isMobile ? 'small' : 'medium'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.05rem',
            minWidth: '100px'
          }}
        >
          + 代理申請
        </Button>
      </div>

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
                    onClick={handleSearch}
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
              onClick={handleSearch}
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
                <div style={{ fontWeight: 'bold', color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : 'inherit' }}>{request.employeeName}</div>
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
                  <td style={{ padding: '0.75rem', color: request.status === '削除済み' || request.status === '取消' ? '#9ca3af' : 'inherit' }}>{request.employeeName}</td>
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

      {/* 代理登録モーダル */}
      {showRegisterModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: isMobile ? '1rem' : '1.4rem'
        }}
        onClick={handleCancelRegister}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: isMobile ? '1.5rem' : '1.4rem',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '1.05rem', fontSize: isMobile ? '1.125rem' : '0.875rem' }}>
              休暇申請代理登録
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handleRegisterLeaveRequest(); }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                  従業員 *
                </label>
                <select
                  value={registerFormData.employeeId}
                  onChange={(e) => setRegisterFormData({ ...registerFormData, employeeId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: fontSizes.input,
                    boxSizing: 'border-box'
                  }}
                  required
                >
                  <option value="">選択してください</option>
                  {employees.map((emp) => {
                    const empName = `${emp.firstName} ${emp.lastName}`;
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.id} - {empName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                  休暇種別 *
                </label>
                <select
                  value={registerFormData.type}
                  onChange={(e) => setRegisterFormData({ ...registerFormData, type: e.target.value as '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他' })}
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
                    backgroundColor: !registerFormData.isHalfDay ? '#dbeafe' : 'transparent',
                    border: `2px solid ${!registerFormData.isHalfDay ? '#2563eb' : '#d1d5db'}`,
                    fontSize: fontSizes.label
                  }}>
                    <input
                      type="radio"
                      checked={!registerFormData.isHalfDay}
                      onChange={() => {
                        setRegisterFormData({ ...registerFormData, isHalfDay: false });
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
                    backgroundColor: registerFormData.isHalfDay ? '#dbeafe' : 'transparent',
                    border: `2px solid ${registerFormData.isHalfDay ? '#2563eb' : '#d1d5db'}`,
                    fontSize: fontSizes.label
                  }}>
                    <input
                      type="radio"
                      checked={registerFormData.isHalfDay}
                      onChange={() => {
                        setRegisterFormData({ ...registerFormData, isHalfDay: true, days: 0.5, endDate: registerFormData.startDate });
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
                  value={registerFormData.startDate}
                  onChange={(e) => {
                    setRegisterFormData({ ...registerFormData, startDate: e.target.value });
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: fontSizes.input,
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
              {!registerFormData.isHalfDay && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                    終了日 *
                  </label>
                  <input
                    type="date"
                    value={registerFormData.endDate}
                    onChange={(e) => {
                      setRegisterFormData({ ...registerFormData, endDate: e.target.value });
                    }}
                    min={registerFormData.startDate}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: fontSizes.input,
                      boxSizing: 'border-box'
                    }}
                    required={!registerFormData.isHalfDay}
                  />
                </div>
              )}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                  日数
                </label>
                <input
                  type="text"
                  value={registerFormData.days > 0 ? `${registerFormData.days}日${registerFormData.days === 0.5 ? '（半休）' : ''}` : ''}
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
                  value={registerFormData.reason}
                  onChange={(e) => setRegisterFormData({ ...registerFormData, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: fontSizes.input,
                    boxSizing: 'border-box',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                <CancelButton
                  fullWidth
                  type="button"
                  onClick={handleCancelRegister}
                />
                <RegisterButton
                  fullWidth
                  type="submit"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
