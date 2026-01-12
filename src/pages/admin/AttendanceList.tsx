/**
 * ファイル名: AttendanceList.tsx
 * 画面名: 勤怠情報一覧画面
 * 説明: 管理者が全従業員の勤怠情報を一覧表示する画面
 * 機能:
 *   - 全従業員の勤怠情報一覧表示
 *   - 日付範囲でのフィルタリング
 *   - 従業員名・IDでの検索
 *   - 勤怠情報の詳細表示
 *   - ソート機能
 */

import { useState, useEffect } from 'react';
import { formatTime, formatDate, formatJSTDateTime, parseJSTDateTime, extractTimeFromJST } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { Button, RegisterButton, CancelButton, EditButton, SearchButton, ClearButton } from '../../components/Button';
import { Snackbar } from '../../components/Snackbar';
import { useSort } from '../../hooks/useSort';
import { ChevronDownIcon, ChevronUpIcon } from '../../components/Icons';
import { getAttendanceList, updateAttendance, updateAttendanceMemo, AttendanceLog as ApiAttendanceLog, Break as ApiBreak, BreakRequest } from '../../utils/attendanceApi';
import { getEmployees } from '../../utils/employeeApi';
import { log, error as logError } from '../../utils/logger';
import { translateApiError } from '../../utils/apiErrorTranslator';
import { getAttendanceStatusLabel } from '../../utils/codeTranslator';
import { ProgressBar } from '../../components/ProgressBar';

/**
 * 休憩時間を表すインターフェース。
 */
interface Break {
  /** 休憩開始時刻。 */
  start: string;
  /** 休憩終了時刻。nullの場合は休憩中。 */
  end: string | null;
}

/**
 * 勤怠ログを表すインターフェース。
 */
interface AttendanceLog {
  /** 勤怠ログID。 */
  id: string;
  /** 従業員ID。 */
  employeeId?: string;
  /** 従業員名。 */
  employeeName?: string;
  /** 出勤日。 */
  date: string;
  /** 出勤時刻。nullの場合は未出勤。 */
  clockIn: string | null;
  /** 退勤時刻。nullの場合は未退勤。 */
  clockOut: string | null;
  /** 出勤時刻（YYYY-MM-DD HH:MM:SS形式、日をまたぐ計算用）。 */
  clockInIso: string | null;
  /** 退勤時刻（YYYY-MM-DD HH:MM:SS形式、日をまたぐ計算用）。 */
  clockOutIso: string | null;
  /** 休憩時間の配列。 */
  breaks: Break[];
  /** 休憩時間の配列（YYYY-MM-DD HH:MM:SS形式、日をまたぐ計算用）。 */
  breaksIso?: Array<{ start: string; end: string | null }>;
  /** 勤怠ステータス。 */
  status: '未出勤' | '出勤中' | '休憩中' | '退勤済み';
  /** 労働時間（分、APIから取得）。 */
  totalWorkMinutes?: number;
  /** 残業時間（分、APIから取得）。 */
  overtimeMinutes?: number;
  /** 深夜時間（分、APIから取得）。 */
  lateNightMinutes?: number;
  /** メモ。 */
  memo?: string | null;
  /** 更新者。 */
  updatedBy?: string;
  /** 更新日時。 */
  updatedAt?: string;
}

/**
 * 勤怠情報一覧画面コンポーネント。
 * 管理者が全従業員の勤怠情報を一覧表示します。
 * 日付範囲でのフィルタリング、ソート、メモ編集機能を提供します。
 *
 * @returns {JSX.Element} 勤怠情報一覧画面コンポーネント。
 */
export const AttendanceList: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // 今週の開始日（月曜日）と終了日（日曜日）を計算
  const getThisWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = 日曜日, 1 = 月曜日, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 月曜日までのオフセット
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  // ローカルストレージから日付検索条件を読み込む
  const loadDateSearchConditions = () => {
    try {
      const saved = localStorage.getItem('attendanceListSearchConditions');
      if (saved) {
        const conditions = JSON.parse(saved);
        return {
          startDate: conditions.startDate || getThisWeekDates().start,
          endDate: conditions.endDate || getThisWeekDates().end
        };
      }
    } catch (error) {
      // パースエラー時はデフォルト値を返す
    }
    const thisWeek = getThisWeekDates();
    return {
      startDate: thisWeek.start,
      endDate: thisWeek.end
    };
  };
  
  // 日付検索条件をローカルストレージに保存
  const saveDateSearchConditions = (conditions: {
    startDate: string;
    endDate: string;
  }) => {
    try {
      localStorage.setItem('attendanceListSearchConditions', JSON.stringify(conditions));
      log('日付検索条件をローカルストレージに保存:', conditions);
    } catch (error) {
      logError('日付検索条件の保存に失敗:', error);
    }
  };
  
  const initialDateConditions = loadDateSearchConditions();
  const thisWeek = getThisWeekDates();
  const [startDate, setStartDate] = useState(initialDateConditions.startDate);
  const [endDate, setEndDate] = useState(initialDateConditions.endDate);
  // 検索条件を保存するためのstate
  const [searchStartDate, setSearchStartDate] = useState(initialDateConditions.startDate);
  const [searchEndDate, setSearchEndDate] = useState(initialDateConditions.endDate);
  const [showModal, setShowModal] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false); // モバイル時の検索条件の展開状態
  const [editingMemoLogId, setEditingMemoLogId] = useState<string | null>(null); // メモ編集中のログID
  const [editingMemo, setEditingMemo] = useState<string>(''); // 編集中のメモ
  const [editingAttendanceLogId, setEditingAttendanceLogId] = useState<string | null>(null); // 勤務情報編集中のログID
  const [editingAttendanceData, setEditingAttendanceData] = useState<{
    clockIn: string | null;
    clockOut: string | null;
    breaks: Break[];
  } | null>(null); // 編集中の勤務情報

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // APIのAttendanceLogをUI用のAttendanceLogに変換
  const convertApiLogToUiLog = (apiLog: ApiAttendanceLog): AttendanceLog => {
    // APIのclockIn/clockOutはYYYY-MM-DD HH:MM:SS形式（JST形式）なので、時刻部分のみ抽出
    const extractTime = (dateTimeStr: string | null): string | null => {
      if (!dateTimeStr) return null;
      // YYYY-MM-DD HH:MM:SS形式から時刻部分（HH:mm）を抽出
      return extractTimeFromJST(dateTimeStr);
    };

    // APIのbreaksをUI用のbreaksに変換
    const convertBreaks = (apiBreaks: ApiBreak[]): Break[] => {
      return apiBreaks.map(apiBreak => ({
        start: extractTime(apiBreak.start) || '',
        end: apiBreak.end ? extractTime(apiBreak.end) : null
      }));
    };

    // APIから返される英語コード（not_started, working, on_break, completed）を日本語に変換
    // UI側では日本語のステータス（'未出勤' | '出勤中' | '休憩中' | '退勤済み'）を使用
    const convertStatus = (apiStatus: string): '未出勤' | '出勤中' | '休憩中' | '退勤済み' => {
      return getAttendanceStatusLabel(apiStatus) as '未出勤' | '出勤中' | '休憩中' | '退勤済み';
    };

    return {
      id: apiLog.attendanceId, // APIレスポンスのattendanceIdをidにマッピング
      employeeId: apiLog.employeeId || '',
      employeeName: apiLog.employeeName || '', // APIレスポンスのemployeeNameを使用
      date: apiLog.workDate, // APIレスポンスのworkDateをdateにマッピング
      clockIn: extractTime(apiLog.clockIn),
      clockOut: extractTime(apiLog.clockOut),
      clockInIso: apiLog.clockIn || null, // YYYY-MM-DD HH:MM:SS形式を保持（日をまたぐ計算用）
      clockOutIso: apiLog.clockOut || null, // YYYY-MM-DD HH:MM:SS形式を保持（日をまたぐ計算用）
      breaks: convertBreaks(apiLog.breaks),
      breaksIso: apiLog.breaks?.map(b => ({ start: b.start, end: b.end || null })) || [], // YYYY-MM-DD HH:MM:SS形式を保持（日をまたぐ計算用）
      status: convertStatus(apiLog.status),
      totalWorkMinutes: apiLog.totalWorkMinutes, // APIから取得した労働時間（分）
      overtimeMinutes: apiLog.overtimeMinutes, // APIから取得した残業時間（分）
      lateNightMinutes: apiLog.lateNightMinutes, // APIから取得した深夜時間（分）
      memo: apiLog.memo || null,
      updatedBy: apiLog.updatedBy,
      updatedAt: apiLog.updatedAt
    };
  };

  // APIから勤怠データを取得
  const fetchAttendanceList = async (start: string, end: string) => {
    setIsLoading(true);
    try {
      // 管理者はemployeeIdを指定しないことで全従業員のデータを取得
      const response = await getAttendanceList(undefined, start, end);
      
      // 従業員一覧を取得して、従業員IDから従業員名をマッピング
      let employeeNameMap: Record<string, string> = {};
      try {
        const employees = await getEmployees();
        employees.forEach(emp => {
          employeeNameMap[emp.id] = `${emp.firstName} ${emp.lastName}`;
        });
      } catch (error) {
        logError('Failed to fetch employees for name mapping:', error);
        // 従業員名の取得に失敗しても、勤怠データは表示する
      }
      
      // APIレスポンスをUI用の形式に変換（従業員名をマッピング）
      const convertedLogs = response.logs.map(apiLog => {
        const uiLog = convertApiLogToUiLog(apiLog);
        // 従業員名を設定
        if (uiLog.employeeId && employeeNameMap[uiLog.employeeId]) {
          uiLog.employeeName = employeeNameMap[uiLog.employeeId];
        }
        return uiLog;
      });
      setAttendanceLogs(convertedLogs);
    } catch (error) {
      logError('Failed to fetch attendance list:', error);
      const errorMessage = translateApiError(error);
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // 初期表示時に今週のデータを取得
  useEffect(() => {
    fetchAttendanceList(searchStartDate, searchEndDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初期表示時のみ実行

  // APIでフィルタリング済みのため、フィルタリングは不要
  // 検索結果は既にattendanceLogsに含まれている
  const filteredLogs = attendanceLogs;

  // 検索条件をクリア
  const handleClearSearch = async () => {
    setStartDate(thisWeek.start);
    setEndDate(thisWeek.end);
    setSearchStartDate(thisWeek.start);
    setSearchEndDate(thisWeek.end);
    // 今週のデータを取得
    await fetchAttendanceList(thisWeek.start, thisWeek.end);
  };

  // 検索実行
  const handleSearch = async () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
    // 検索条件をローカルストレージに保存
    saveDateSearchConditions({
      startDate,
      endDate
    });
    // 検索条件でAPIを呼び出す
    await fetchAttendanceList(startDate, endDate);
  };
  
  // 日付検索条件が変更されたらローカルストレージに保存
  useEffect(() => {
    saveDateSearchConditions({
      startDate,
      endDate
    });
  }, [startDate, endDate]);

  // ソート機能を共通フックから取得
  const { handleSort, getSortIcon, sortedData: sortedLogs } = useSort<AttendanceLog>(
    filteredLogs
  );

  // 労働時間、残業時間、深夜時間、休憩時間を計算
  // APIから取得したtotalWorkMinutes、overtimeMinutes、lateNightMinutesを使用
  const calculateWorkTimes = (log: AttendanceLog) => {
    // 休憩時間を計算（表示用）
    let breakMinutes = 0;
    if (log.breaksIso && log.breaksIso.length > 0) {
      log.breaksIso.forEach(breakItem => {
        if (breakItem.start && breakItem.end) {
          try {
            // YYYY-MM-DD HH:MM:SS形式（JST）をDateオブジェクトに変換
            const breakStartDate = parseJSTDateTime(breakItem.start);
            const breakEndDate = parseJSTDateTime(breakItem.end);
            if (!breakStartDate || !breakEndDate) return;
            
            const bStartHour = breakStartDate.getHours();
            const bStartMinute = breakStartDate.getMinutes();
            const bEndHour = breakEndDate.getHours();
            const bEndMinute = breakEndDate.getMinutes();
            const bStartMinutes = bStartHour * 60 + bStartMinute;
            let bEndMinutes = bEndHour * 60 + bEndMinute;
            
            // 休憩が日付をまたぐ場合（終了時刻が開始時刻より前の場合）
            if (bEndMinutes < bStartMinutes) {
              bEndMinutes += 24 * 60;
            }
            
            breakMinutes += Math.max(0, bEndMinutes - bStartMinutes);
          } catch {
            // エラーが発生した場合はスキップ
          }
        }
      });
    }
    const breakHours = Math.floor(breakMinutes / 60);
    const breakMins = breakMinutes % 60;
    const breakTime = `${String(breakHours).padStart(2, '0')}:${String(breakMins).padStart(2, '0')}`;
    
    // APIから取得した労働時間（totalWorkMinutes）を使用
    if (log.totalWorkMinutes === undefined || log.totalWorkMinutes === null) {
      return {
        workTime: '-',
        overtime: '-',
        lateNight: '-',
        breakTime
      };
    }
    
    const workMinutes = log.totalWorkMinutes;
    const workHours = Math.floor(workMinutes / 60);
    const workMins = workMinutes % 60;
    const workTime = `${String(workHours).padStart(2, '0')}:${String(workMins).padStart(2, '0')}`;
    
    // APIから取得した残業時間（overtimeMinutes）を使用
    let overtime = '00:00';
    if (log.overtimeMinutes && log.overtimeMinutes > 0) {
      const overtimeHours = Math.floor(log.overtimeMinutes / 60);
      const overtimeMins = log.overtimeMinutes % 60;
      overtime = `${String(overtimeHours).padStart(2, '0')}:${String(overtimeMins).padStart(2, '0')}`;
    }
    
    // APIから取得した深夜時間（lateNightMinutes）を使用
    let lateNight = '00:00';
    if (log.lateNightMinutes && log.lateNightMinutes > 0) {
      const lateNightHours = Math.floor(log.lateNightMinutes / 60);
      const lateNightMins = log.lateNightMinutes % 60;
      lateNight = `${String(lateNightHours).padStart(2, '0')}:${String(lateNightMins).padStart(2, '0')}`;
    }
    
    return {
      workTime,
      overtime,
      lateNight,
      breakTime
    };
  };

  // モーダルを閉じる
  const handleCancel = () => {
    setShowModal(false);
    setEditingAttendanceLogId(null);
    setEditingAttendanceData(null);
  };

  // 時刻文字列をYYYY-MM-DD HH:MM:SS形式（JST）に変換（date文字列と時刻文字列から）
  // タイムゾーン管理ガイドに基づき、すべての時刻はJSTで統一
  const convertTimeToJST = (timeStr: string | null, dateStr: string): string | null => {
    if (!timeStr) return null;
    try {
      // JSTとして送信（YYYY-MM-DD HH:MM:SS形式）
      return formatJSTDateTime(dateStr, timeStr);
    } catch {
      return null;
    }
  };

  // UI用のBreakをAPI用のBreakRequestに変換（idは不要）
  const convertBreakToApiFormat = (breaks: Break[], dateStr: string): BreakRequest[] => {
    return breaks.map(breakItem => ({
      start: convertTimeToJST(breakItem.start, dateStr) || '',
      end: breakItem.end ? convertTimeToJST(breakItem.end, dateStr) : null
    }));
  };

  // 勤務情報を保存
  const handleSaveAttendance = async () => {
    if (!editingAttendanceLogId || !editingAttendanceData) return;
    
    try {
      const log = attendanceLogs.find(l => l.id === editingAttendanceLogId);
      if (!log) return;

      if (!log.employeeId) {
        throw new Error('従業員IDが取得できませんでした');
      }

      // UI用の時刻形式（HH:mm）をAPI用のYYYY-MM-DD HH:MM:SS形式に変換
      const apiClockIn = convertTimeToJST(editingAttendanceData.clockIn, log.date);
      const apiClockOut = convertTimeToJST(editingAttendanceData.clockOut, log.date);
      const apiBreaks = convertBreakToApiFormat(editingAttendanceData.breaks, log.date);

      // API呼び出し
      const updatedApiLog = await updateAttendance({
        employeeId: log.employeeId,
        workDate: log.date,
        clockIn: apiClockIn,
        clockOut: apiClockOut,
        breaks: apiBreaks
      });
      
      // APIレスポンスをUI用の形式に変換してローカル状態を更新
      const updatedLog = convertApiLogToUiLog(updatedApiLog);
      setAttendanceLogs(prevLogs =>
        prevLogs.map(log => 
          log.id === editingAttendanceLogId ? { ...updatedLog, employeeName: log.employeeName } : log
        )
      );
    
      setShowModal(false);
      setEditingAttendanceLogId(null);
      setEditingAttendanceData(null);
      setSnackbar({ message: '勤務情報を更新しました', type: 'success' });
      setTimeout(() => setSnackbar(null), 3000);
    } catch (error) {
      logError('勤務情報の更新に失敗しました', error);
      const errorMessage = translateApiError(error);
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <>
        <ProgressBar isLoading={true} />
        <div style={{ height: '100vh', backgroundColor: '#fff' }} />
      </>
    );
  }

  return (
    <div>
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
      <h2 style={{ 
        marginBottom: isMobile ? '1rem' : '1.4rem', 
        marginTop: isMobile ? '0.5rem' : '0.75rem',
        fontSize: isMobile ? '1.25rem' : '1.05rem' 
      }}>
        勤怠情報一覧
      </h2>

      {/* 検索条件 */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: isMobile ? '0' : '0.75rem',
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
                    開始日
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
                    }}
                  />
                </div>
                <div style={{ flex: '1', minWidth: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                    終了日
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
                    }}
                  />
                </div>
                <div style={{ 
                  fontSize: fontSizes.medium, 
                  color: '#6b7280',
                  minWidth: '100%'
                }}>
                  検索結果: {filteredLogs.length}件
                </div>
                <div style={{ minWidth: '100%', display: 'flex', gap: '0.5rem' }}>
                  <SearchButton
                    onClick={handleSearch}
                    fullWidth
                  />
                  <ClearButton
                    onClick={handleClearSearch}
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
          <div style={{ flex: isMobile ? '1' : '0 0 auto', minWidth: isMobile ? '100%' : '170px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: isMobile ? '100%' : '170px',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
              }}
            />
          </div>
          <div style={{ flex: isMobile ? '1' : '0 0 auto', minWidth: isMobile ? '100%' : '170px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              style={{
                width: isMobile ? '100%' : '170px',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
              }}
            />
          </div>
          <div style={{ 
            fontSize: fontSizes.medium, 
            color: '#6b7280',
            flex: isMobile ? '1' : '0 0 auto',
            alignSelf: isMobile ? 'flex-start' : 'flex-end',
            paddingBottom: isMobile ? '0' : '0.25rem',
            minWidth: isMobile ? '100%' : 'auto'
          }}>
            検索結果: {filteredLogs.length}件
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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

      {/* 勤怠情報一覧 */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: isMobile ? '1rem' : '0rem',
        borderRadius: '8px'
      }}>
        {sortedLogs.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            勤怠情報が見つかりません
          </p>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sortedLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  backgroundColor: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: fontSizes.large, marginBottom: '0.5rem' }}>
                  {log.employeeId} - {log.employeeName}
                </div>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  出勤日: {formatDate(log.date)}
                </div>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  出勤時刻: {log.clockIn ? formatTime(log.clockIn) : '-'}
                </div>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  退勤時刻: {log.clockOut ? formatTime(log.clockOut) : '-'}
                </div>
                {(() => {
                  const times = calculateWorkTimes(log);
                  return (
                    <>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                        労働時間: {times.workTime}
                      </div>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                        残業時間: {times.overtime}
                      </div>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                        深夜時間: {times.lateNight}
                      </div>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                        休憩時間: {times.breakTime}
                      </div>
                    </>
                  );
                })()}
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  更新者: {log.updatedBy || '-'}
                </div>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  更新日時: {log.updatedAt ? new Date(log.updatedAt).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
                </div>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  メモ: {editingMemoLogId === log.id ? (
                    <textarea
                      value={editingMemo}
                      onChange={(e) => setEditingMemo(e.target.value)}
                      onBlur={async () => {
                        try {
                          if (!log.employeeId) {
                            throw new Error('従業員IDが取得できませんでした');
                          }
                          if (!log.employeeId) {
                            throw new Error('従業員IDが取得できませんでした');
                          }
                          await updateAttendanceMemo({
                            employeeId: log.employeeId,
                            workDate: log.date,
                            memo: editingMemo || null
                          });
                          setAttendanceLogs(prevLogs => prevLogs.map(l => 
                            l.id === log.id ? { ...l, memo: editingMemo || null } : l
                          ));
                          setEditingMemoLogId(null);
                          setEditingMemo('');
                          setSnackbar({ message: 'メモを保存しました', type: 'success' });
                          setTimeout(() => setSnackbar(null), 3000);
                        } catch (error) {
                          logError('メモの保存に失敗しました', error);
                          const errorMessage = translateApiError(error);
                          setSnackbar({ message: errorMessage, type: 'error' });
                          setTimeout(() => setSnackbar(null), 3000);
                          setEditingMemoLogId(null);
                          setEditingMemo('');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingMemoLogId(null);
                          setEditingMemo('');
                        }
                      }}
                      autoFocus
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #2563eb',
                        borderRadius: '4px',
                        fontSize: fontSizes.input,
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => {
                        setEditingMemoLogId(log.id);
                        setEditingMemo(log.memo || '');
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid transparent',
                        transition: 'background-color 0.2s',
                        whiteSpace: 'pre-wrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      {log.memo || '（クリックして編集）'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <EditButton
                    onClick={() => {
                      setEditingAttendanceLogId(log.id);
                      setEditingAttendanceData({
                        clockIn: log.clockIn,
                        clockOut: log.clockOut,
                        breaks: log.breaks || []
                      });
                      setShowModal(true);
                    }}
                    size="small"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            overflowX: 'auto',
            maxHeight: isMobile ? '400px' : 'calc(100vh - 350px)',
            overflowY: 'auto',
            flex: 1
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate', 
              borderSpacing: 0, 
              minWidth: '1000px', 
              border: '2px solid #e5e7eb' 
            }}>
              <thead>
                <tr style={{ 
                  borderBottom: '2px solid #e5e7eb', 
                  backgroundColor: '#dbeafe',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('date')}
                  >
                    {getSortIcon('date')} 出勤日
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('employeeId')}
                  >
                    {getSortIcon('employeeId')} 従業員ID
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('employeeName')}
                  >
                    {getSortIcon('employeeName')} 従業員名
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>出勤時刻</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>退勤時刻</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>労働時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>残業時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>深夜時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>休憩時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>メモ</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>更新者</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>更新日時</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>編集</th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map((log) => {
                  const times = calculateWorkTimes(log);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem' }}>{formatDate(log.date)}</td>
                      <td style={{ padding: '0.75rem' }}>{log.employeeId}</td>
                      <td style={{ padding: '0.75rem' }}>{log.employeeName}</td>
                      <td style={{ padding: '0.75rem' }}>{log.clockIn ? formatTime(log.clockIn) : '-'}</td>
                      <td style={{ padding: '0.75rem' }}>{log.clockOut ? formatTime(log.clockOut) : '-'}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{times.workTime}</td>
                      <td style={{ padding: '0.75rem' }}>{times.overtime}</td>
                      <td style={{ padding: '0.75rem' }}>{times.lateNight}</td>
                      <td style={{ padding: '0.75rem' }}>{times.breakTime}</td>
                      <td style={{ padding: '0.75rem', minWidth: '150px' }}>
                        {editingMemoLogId === log.id ? (
                          <textarea
                            value={editingMemo}
                            onChange={(e) => setEditingMemo(e.target.value)}
                            onBlur={async () => {
                              try {
                                if (!log.employeeId) {
                                  throw new Error('従業員IDが取得できませんでした');
                                }
                                await updateAttendanceMemo({
                                  employeeId: log.employeeId,
                                  workDate: log.date,
                                  memo: editingMemo || null
                                });
                                setAttendanceLogs(prevLogs => prevLogs.map(l => 
                                  l.id === log.id ? { ...l, memo: editingMemo || null } : l
                                ));
                                setEditingMemoLogId(null);
                                setEditingMemo('');
                                setSnackbar({ message: 'メモを保存しました', type: 'success' });
                                setTimeout(() => setSnackbar(null), 3000);
                              } catch (error) {
                                logError('メモの保存に失敗しました', error);
                                const errorMessage = translateApiError(error);
                                setSnackbar({ message: errorMessage, type: 'error' });
                                setTimeout(() => setSnackbar(null), 3000);
                                setEditingMemoLogId(null);
                                setEditingMemo('');
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setEditingMemoLogId(null);
                                setEditingMemo('');
                              }
                            }}
                            autoFocus
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '0.25rem 0.5rem',
                              border: '1px solid #2563eb',
                              borderRadius: '4px',
                              fontSize: fontSizes.input,
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />
                        ) : (
                          <div
                            onClick={() => {
                              setEditingMemoLogId(log.id);
                              setEditingMemo(log.memo || '');
                            }}
                            style={{
                              cursor: 'pointer',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              minHeight: '1.5rem',
                              whiteSpace: 'pre-wrap',
                              border: '1px solid transparent',
                              transition: 'background-color 0.2s',
                          fontSize: fontSizes.medium, 
                              color: '#6b7280'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                              e.currentTarget.style.borderColor = '#d1d5db';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.borderColor = 'transparent';
                            }}
                            title={log.memo || '（クリックして編集）'}
                          >
                            {log.memo || '（クリックして編集）'}
                        </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {log.updatedBy || '-'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {log.updatedAt ? new Date(log.updatedAt).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {isMobile ? (
                          <EditButton
                            onClick={() => {
                              setEditingAttendanceLogId(log.id);
                              setEditingAttendanceData({
                                clockIn: log.clockIn,
                                clockOut: log.clockOut,
                                breaks: log.breaks || []
                              });
                              setShowModal(true);
                            }}
                            size="small"
                          />
                        ) : (
                          <Button
                            variant="icon-edit"
                            onClick={() => {
                              setEditingAttendanceLogId(log.id);
                              setEditingAttendanceData({
                                clockIn: log.clockIn,
                                clockOut: log.clockOut,
                                breaks: log.breaks || []
                              });
                              setShowModal(true);
                            }}
                            title="編集"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 勤務情報編集モーダル */}
      {showModal && editingAttendanceLogId && editingAttendanceData && (
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
        onClick={handleCancel}
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
            <h3 style={{ marginBottom: '1.05rem', fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop }}>
              勤務情報編集
            </h3>
            {(() => {
              const log = attendanceLogs.find(l => l.id === editingAttendanceLogId);
              if (!log) return null;
              
              return (
                <>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                      <strong>従業員:</strong> {log.employeeName} ({log.employeeId})
              </div>
              <div style={{ marginBottom: '0.5rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                      <strong>日付:</strong> {formatDate(log.date)}
              </div>
            </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                      出勤時刻
                    </label>
                    <input
                      type="time"
                      value={editingAttendanceData.clockIn || ''}
                      onChange={(e) => setEditingAttendanceData({
                        ...editingAttendanceData,
                        clockIn: e.target.value || null
                      })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: fontSizes.input,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                      退勤時刻
              </label>
                    <input
                      type="time"
                      value={editingAttendanceData.clockOut || ''}
                      onChange={(e) => setEditingAttendanceData({
                        ...editingAttendanceData,
                        clockOut: e.target.value || null
                      })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                        fontSize: fontSizes.input,
                        boxSizing: 'border-box'
                }}
              />
            </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                      休憩時間
                    </label>
                    {editingAttendanceData.breaks.map((breakItem, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="time"
                          value={breakItem.start || ''}
                          onChange={(e) => {
                            const newBreaks = [...editingAttendanceData.breaks];
                            newBreaks[index] = { ...newBreaks[index], start: e.target.value };
                            setEditingAttendanceData({ ...editingAttendanceData, breaks: newBreaks });
                          }}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: fontSizes.input,
                            boxSizing: 'border-box'
                          }}
                          placeholder="開始時刻"
                        />
                        <span style={{ fontSize: fontSizes.medium }}>〜</span>
                        <input
                          type="time"
                          value={breakItem.end || ''}
                          onChange={(e) => {
                            const newBreaks = [...editingAttendanceData.breaks];
                            newBreaks[index] = { ...newBreaks[index], end: e.target.value || null };
                            setEditingAttendanceData({ ...editingAttendanceData, breaks: newBreaks });
                          }}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: fontSizes.input,
                            boxSizing: 'border-box'
                          }}
                          placeholder="終了時刻"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newBreaks = editingAttendanceData.breaks.filter((_, i) => i !== index);
                            setEditingAttendanceData({ ...editingAttendanceData, breaks: newBreaks });
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: fontSizes.button
                          }}
                        >
                          削除
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAttendanceData({
                          ...editingAttendanceData,
                          breaks: [...editingAttendanceData.breaks, { start: '', end: null }]
                        });
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: fontSizes.button,
                        marginTop: '0.5rem'
                      }}
                    >
                      + 休憩時間を追加
                    </button>
                  </div>
                  
            <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
              <CancelButton
                fullWidth
                type="button"
                onClick={handleCancel}
              />
              <RegisterButton
                fullWidth
                type="button"
                      onClick={handleSaveAttendance}
              />
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
