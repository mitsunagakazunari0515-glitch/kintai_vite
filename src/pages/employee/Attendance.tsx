/**
 * ファイル名: Attendance.tsx
 * 画面名: 勤怠画面
 * 説明: 従業員の出勤・退勤打刻、打刻修正、打刻履歴確認を行う画面
 * 機能:
 *   - 出勤・退勤の打刻
 *   - 打刻修正機能
 *   - 過去の打刻状況一覧表示
 *   - 日付範囲でのフィルタリング
 *   - 労働時間の自動計算
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, CancelButton, RegisterButton, DeleteButton, EditButton } from '../../components/Button';
import { Snackbar } from '../../components/Snackbar';
import { ProgressBar } from '../../components/ProgressBar';
import { formatDate, formatJSTDateTime, parseJSTDateTime, extractTimeFromJST } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { PlusIcon, WarningIcon } from '../../components/Icons';
import { 
  clockIn, 
  clockOut, 
  startBreak,
  endBreak,
  updateAttendance,
  getAttendanceList,
  getAttendanceMyRecords,
  AttendanceLog as ApiAttendanceLog,
  Break as ApiBreak,
  BreakRequest,
  AttendanceSummary
} from '../../utils/attendanceApi';
import { error as logError } from '../../utils/logger';
import { translateApiError } from '../../utils/apiErrorTranslator';
import { getAttendanceStatusLabel, getAttendanceStatusStyle } from '../../utils/codeTranslator';
import { getUserInfo } from '../../config/apiConfig';

/**
 * 休憩時間を表すインターフェース。
 */
interface Break {
  /** 休憩開始時刻。 */
  start: string;
  /** 休憩終了時刻。nullの場合は休憩中。 */
  end: string | null;
  /** 休憩開始時刻（YYYY-MM-DD HH:MM:SS形式）。「翌朝」表示に使用。 */
  startIso: string;
  /** 休憩終了時刻（YYYY-MM-DD HH:MM:SS形式）。nullの場合は休憩中。「翌朝」表示に使用。 */
  endIso: string | null;
}

/**
 * 勤怠ログを表すインターフェース。
 */
interface AttendanceLog {
  /** 勤怠ログID。 */
  id: string;
  /** 出勤日。 */
  date: string;
  /** 出勤時刻。nullの場合は未出勤。 */
  clockIn: string | null;
  /** 退勤時刻。nullの場合は未退勤。 */
  clockOut: string | null;
  /** 出勤時刻（YYYY-MM-DD HH:MM:SS形式）。日付をまたぐ判定に使用。 */
  clockInIso: string | null;
  /** 退勤時刻（YYYY-MM-DD HH:MM:SS形式）。日付をまたぐ判定と「翌朝」表示に使用。 */
  clockOutIso: string | null;
  /** 休憩時間の配列（複数回の休憩に対応）。 */
  breaks: Break[];
  /** 勤怠ステータス。 */
  status: '未出勤' | '出勤中' | '休憩中' | '退勤済み';
  /** 労働時間（分、APIから取得）。 */
  totalWorkMinutes?: number;
  /** 残業時間（分、APIから取得）。 */
  overtimeMinutes?: number;
  /** 深夜時間（分、APIから取得）。 */
  lateNightMinutes?: number;
}

/**
 * APIのAttendanceLogをUI用のAttendanceLogに変換
 * タイムゾーン管理ガイドに基づき、すべての時刻はJSTで統一
 */
const convertApiLogToUiLog = (apiLog: ApiAttendanceLog): AttendanceLog => {
  // APIのclockIn/clockOutはYYYY-MM-DD HH:MM:SS形式（JST形式）
  // タイムゾーン管理ガイドに基づき、API側からJST形式でレスポンスされる
  const extractTime = (dateTimeStr: string | null): string | null => {
    if (!dateTimeStr) return null;
    // YYYY-MM-DD HH:MM:SS形式から時刻部分（HH:mm）を抽出
    return extractTimeFromJST(dateTimeStr);
  };

  // APIのbreaksをUI用のbreaksに変換
  const convertBreaks = (apiBreaks: ApiBreak[]): Break[] => {
    return apiBreaks.map(apiBreak => ({
      start: extractTime(apiBreak.start) || '',
      end: apiBreak.end ? extractTime(apiBreak.end) : null,
      startIso: apiBreak.start, // YYYY-MM-DD HH:MM:SS形式を保持（「翌朝」表示に使用）
      endIso: apiBreak.end || null // YYYY-MM-DD HH:MM:SS形式を保持（「翌朝」表示に使用）
      // 注意: UI用のBreakインターフェースにはidフィールドがないため、マッピングしない
    }));
  };

  // APIから返される英語コード（not_started, working, on_break, completed）を日本語に変換
  // UI側では日本語のステータス（'未出勤' | '出勤中' | '休憩中' | '退勤済み'）を使用
  const convertStatus = (apiStatus: string): '未出勤' | '出勤中' | '休憩中' | '退勤済み' => {
    const statusMap: Record<string, '未出勤' | '出勤中' | '休憩中' | '退勤済み'> = {
      'not_started': '未出勤',
      'working': '出勤中',
      'on_break': '休憩中',
      'completed': '退勤済み'
    };
    return statusMap[apiStatus] || '未出勤';
  };

  return {
    id: apiLog.attendanceId, // APIレスポンスのattendanceIdをidにマッピング
    date: apiLog.workDate, // APIレスポンスのworkDateをdateにマッピング
    clockIn: extractTime(apiLog.clockIn),
    clockOut: extractTime(apiLog.clockOut),
    clockInIso: apiLog.clockIn, // YYYY-MM-DD HH:MM:SS形式を保持（日付をまたぐ判定に使用）
    clockOutIso: apiLog.clockOut, // YYYY-MM-DD HH:MM:SS形式を保持（日付をまたぐ判定と「翌朝」表示に使用）
    breaks: convertBreaks(apiLog.breaks),
    status: convertStatus(apiLog.status),
    totalWorkMinutes: apiLog.totalWorkMinutes, // APIから取得した労働時間（分）
    overtimeMinutes: apiLog.overtimeMinutes, // APIから取得した残業時間（分）
    lateNightMinutes: apiLog.lateNightMinutes // APIから取得した深夜時間（分）
  };
};

/**
 * UI用の時刻文字列をYYYY-MM-DD HH:MM:SS形式（JST）に変換
 * タイムゾーン管理ガイドに基づき、すべての時刻はJSTで統一
 * @param date 日付文字列（YYYY-MM-DD形式）
 * @param time 時刻文字列（HH:mm形式）
 * @returns YYYY-MM-DD HH:MM:SS形式の時刻文字列（JST）
 */
const convertTimeToJST = (date: string, time: string): string => {
  // JSTとして送信（YYYY-MM-DD HH:MM:SS形式）
  return formatJSTDateTime(date, time);
};

/**
 * 分をHH:MM形式に変換
 */
const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * 時刻を表示用に変換します（5時未満の場合は「翌朝」を付与）
 * TIME_CALCULATION_GUIDE.mdに基づく実装
 * 出勤時刻、退勤時刻、休憩時間すべてに適用
 * タイムゾーン管理ガイドに基づき、すべての時刻はJSTで統一
 * API側からJST形式（YYYY-MM-DD HH:MM:SS形式）でレスポンスされる
 * @param timeJST 時刻（YYYY-MM-DD HH:MM:SS形式、JST形式）
 * @returns 表示用の文字列（例: "08:00" または "翌朝04:00"）
 */
const formatTimeWithNextDay = (timeJST: string | null): string => {
  if (!timeJST) {
    return '-';
  }
  
  try {
    // YYYY-MM-DD HH:MM:SS形式（JST）をDateオブジェクトに変換
    const date = parseJSTDateTime(timeJST);
    if (!date) return '-';
    
    // JST時刻を取得（getHours/getMinutesはローカルタイムゾーン（JST）で取得される）
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // 5時未満（0時〜4時59分59秒）の場合は「翌朝」を付与
    if (hours < 5) {
      return `翌朝${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    // 5時以降の場合は通常の時刻表記
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch {
    return '-';
  }
};

/**
 * 実働時間を計算します
 * APIから取得したtotalWorkMinutesを使用
 * @param log 勤怠ログ
 * @returns 実働時間（HH:MM形式、計算できない場合は'-'）
 */
const calculateWorkTime = (log: AttendanceLog): string => {
  // APIから取得した労働時間（totalWorkMinutes）を使用
  if (log.totalWorkMinutes === undefined || log.totalWorkMinutes === null) {
    return '-';
  }

  const workMinutes = log.totalWorkMinutes;
  const workHours = Math.floor(workMinutes / 60);
  const workMins = workMinutes % 60;
  return `${String(workHours).padStart(2, '0')}:${String(workMins).padStart(2, '0')}`;
};

/**
 * 表示モードを表す型。
 */
type ViewMode = 'stamp' | 'edit' | 'list';

/**
 * 勤怠画面コンポーネント。
 * 従業員の出勤・退勤打刻、打刻修正、打刻履歴確認を行います。
 *
 * @returns {JSX.Element} 勤怠画面コンポーネント。
 */
export const Attendance: React.FC = () => {
  const { userId } = useAuth();
  // 認可APIから取得したemployeeIdを使用（userIdはCognitoのユーザーIDで、APIが期待するemployeeIdとは異なる）
  const getEmployeeId = (): string | null => {
    const userInfo = getUserInfo();
    return userInfo.employeeId;
  };

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // 初期表示時はAPIを呼ばないため、falseに変更
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState<ViewMode>('stamp');
  const [editDate, setEditDate] = useState('');
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editBreaks, setEditBreaks] = useState<Break[]>([]);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [missingClockOutError, setMissingClockOutError] = useState<{ date: string; clockIn: string } | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 有給残日数の設定（実際の実装ではバックエンドから取得）
  const totalPaidLeaveDays = 20; // 年間有給日数
  const paidLeaveExpiryDate = '2025-12-31'; // 有給期限
  
  // ダミーの休暇申請データ（実際の実装ではバックエンドから取得）
  const leaveRequests = [
    {
      id: '1',
      employeeId: userId || '',
      startDate: '2024-01-10',
      endDate: '2024-01-10',
      days: 1,
      type: '有給' as const,
      status: '承認' as const,
      isHalfDay: false
    },
    {
      id: '2',
      employeeId: userId || '',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      days: 0.5,
      type: '有給' as const,
      status: '承認' as const,
      isHalfDay: true
    }
  ];

  // 承認済みの有給申請から使用日数を計算
  const usedPaidLeaveDays = leaveRequests
    .filter(req => req.type === '有給' && req.status === '承認')
    .reduce((sum, req) => sum + req.days, 0);

  const remainingPaidLeaveDays = totalPaidLeaveDays - usedPaidLeaveDays;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 打刻タブ：本日の日付で勤怠記録一覧取得APIを呼び出す
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      if (viewMode !== 'stamp') {
        return; // 打刻タブでない場合は実行しない
      }

      const employeeId = getEmployeeId();
      if (!employeeId) {
        logError('Employee ID is not available. Please ensure you are logged in and authorized.');
        setSnackbar({ message: '従業員IDが取得できませんでした。ログインし直してください。', type: 'error' });
        setTimeout(() => setSnackbar(null), 5000);
        return;
      }

      try {
        setIsLoading(true);
        const today = getTodayDate();

        // 本日の日付のみでAPIを呼び出し
        const response = await getAttendanceList(employeeId, today, today);
        
        // APIレスポンスをUI用の形式に変換
        const convertedLogs = response.logs.map(apiLog => convertApiLogToUiLog(apiLog));

        // 本日の勤怠データを取得（まず今日の日付で検索）
        let todayLogData = convertedLogs.find(log => log.date === today);
        // 今日の日付で見つからない場合は、レスポンスにデータがある場合は最初のログを使用
        if (!todayLogData && convertedLogs.length > 0) {
          todayLogData = convertedLogs[0];
        }
        if (todayLogData) {
          setTodayLog(todayLogData);
        } else {
          // データがない場合はnullに設定
          setTodayLog(null);
        }
      } catch (error) {
        logError('Failed to fetch today attendance:', error);
        
        // エラーメッセージを表示（ログイン画面へのリダイレクトは行わない）
        const errorMessage = translateApiError(error);
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => setSnackbar(null), 5000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayAttendance();
  }, [viewMode]); // viewModeが'stamp'の時に実行

  // 出勤簿タブ：検索年月で勤怠記録一覧取得APIを呼び出す
  useEffect(() => {
    const fetchMonthAttendance = async () => {
      if (viewMode !== 'list') {
        return; // 出勤簿タブでない場合は実行しない
      }

      const employeeId = getEmployeeId();
      if (!employeeId) {
        logError('Employee ID is not available. Please ensure you are logged in and authorized.');
        setSnackbar({ message: '従業員IDが取得できませんでした。ログインし直してください。', type: 'error' });
        setTimeout(() => setSnackbar(null), 5000);
        return;
      }

      try {
        setIsLoading(true);

        // 出勤簿一覧APIを呼び出し（year, month, employeeIdを使用）
        const year = String(selectedYear);
        const month = String(selectedMonth).padStart(2, '0');
        const response = await getAttendanceMyRecords(year, month, employeeId);
        
        // サマリー情報を設定
        setSummary(response.summary);
        
        // APIレスポンスをUI用の形式に変換
        const convertedLogs = response.logs.map(apiLog => convertApiLogToUiLog(apiLog));
        setLogs(convertedLogs);

        // 本日の勤怠データも更新（もし本日が選択された月に含まれる場合）
        const today = getTodayDate();
        const todayLogData = convertedLogs.find(log => log.date === today);
        if (todayLogData) {
          setTodayLog(todayLogData);
        }
      } catch (error) {
        logError('Failed to fetch attendance list:', error);
        
        // エラーメッセージを表示（ログイン画面へのリダイレクトは行わない）
        const errorMessage = translateApiError(error);
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => setSnackbar(null), 5000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthAttendance();
  }, [viewMode, selectedYear, selectedMonth]); // viewModeが'list'の時、またはselectedYear/selectedMonthが変更された時に実行

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 退勤打刻がされていない日付を取得（過去日付で出勤のみのデータも含む）
  const getMissingClockOutDates = (): string[] => {
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0];
    const missingDates: string[] = [];
    
    // 現在時刻が5時以降の場合、昨日以降のログをチェック
    if (currentHour >= 5) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];
      
      // 昨日のログをチェック
      const yesterdayLog = logs.find(log => log.date === yesterdayDate);
      if (yesterdayLog && yesterdayLog.clockIn && !yesterdayLog.clockOut) {
        missingDates.push(yesterdayDate);
      }
    }
    
    // それ以前の日付もチェック（29時を過ぎた日付）
    logs.forEach(log => {
      if (log.clockIn && !log.clockOut) {
        const logDate = new Date(log.date);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // 29時（翌日の5時）を過ぎた日付かチェック
        if (daysDiff >= 1 && now.getHours() >= 5) {
          missingDates.push(log.date);
        }
      }
    });
    
    // 過去日付（今日より前）で出勤のみのデータを検出
    logs.forEach(log => {
      if (log.clockIn && !log.clockOut) {
        const logDate = log.date;
        // 今日より前の日付で、出勤のみ（退勤なし）のデータ
        if (logDate < today) {
          // 既に追加されていない場合のみ追加
          if (!missingDates.includes(logDate)) {
            missingDates.push(logDate);
          }
        }
      }
    });
    
    return missingDates;
  };

  // 退勤時刻が29時（翌日の5時）を過ぎても登録されていない場合をチェック
  useEffect(() => {
    const checkMissingClockOut = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // 現在時刻が5時以降の場合、昨日の出勤ログをチェック
      if (currentHour >= 5) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().split('T')[0];
        
        setLogs(prevLogs => {
          const yesterdayLog = prevLogs.find(log => log.date === yesterdayDate);
          
          // 昨日出勤打刻はあるが退勤打刻がない場合
          if (yesterdayLog && yesterdayLog.clockIn && !yesterdayLog.clockOut) {
            setMissingClockOutError({
              date: yesterdayDate,
              clockIn: yesterdayLog.clockIn
            });
          } else {
            setMissingClockOutError(null);
          }
          
          return prevLogs; // logsは変更しない
        });
      } else {
        setMissingClockOutError(null);
      }
    };

    checkMissingClockOut();
    const interval = setInterval(checkMissingClockOut, 60000); // 1分ごとにチェック
    return () => clearInterval(interval);
  }, []); // logsを依存配列から削除

  // 29時を過ぎたら、ステータスを戻す（出勤可能な状態にする）
  useEffect(() => {
    const resetStatusAfter29Hours = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // 現在時刻が5時以降の場合、昨日のログをチェック
      if (currentHour >= 5) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().split('T')[0];
        
        setLogs(prevLogs => {
          const yesterdayLog = prevLogs.find(log => log.date === yesterdayDate);
          
          // 昨日出勤打刻はあるが退勤打刻がない場合、ステータスを「未出勤」に戻す
          if (yesterdayLog && yesterdayLog.clockIn && !yesterdayLog.clockOut && yesterdayLog.status !== '未出勤') {
            return prevLogs.map(log => 
              log.date === yesterdayDate 
                ? { ...log, status: '未出勤' as const }
                : log
            );
          }
          
          return prevLogs; // 変更がない場合はそのまま返す
        });
      }
    };

    resetStatusAfter29Hours();
    const interval = setInterval(resetStatusAfter29Hours, 60000); // 1分ごとにチェック
    return () => clearInterval(interval);
  }, []); // logsを依存配列から削除

  const missingClockOutDates = getMissingClockOutDates();

  const getTodayDate = () => {
    // 勤務日の考え方: 前日の22:00から当日の21:59までが1つの勤務日
    // 現在時刻が05:00より前の場合は、前日の勤務日として扱う
    const now = new Date();
    const hours = now.getHours();
    
    // 05:00より前の場合は前日の日付を返す
    if (hours < 5) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // 05:00以降の場合は当日の日付を返す
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  // 日付を統一フォーマットに変換（YYYY年MM月DD日）
  // 日付フォーマット関数（yyyy/mm/dd形式）

  // 打刻API呼び出し後に最新の勤怠データを取得して反映する共通関数
  const refreshAttendanceData = async () => {
    const employeeId = getEmployeeId();
    if (!employeeId) {
      return;
    }

    try {
      // todayLogが存在する場合は、そのworkDateを使用して検索
      // 存在しない場合は、今日の日付を使用
      const searchDate = todayLog?.date || getTodayDate();
      
      // 検索日付のデータを取得
      const response = await getAttendanceList(employeeId, searchDate, searchDate);
      const convertedLogs = response.logs.map(apiLog => convertApiLogToUiLog(apiLog));
      // 検索日付の勤怠データを取得（まず検索日付で検索）
      let logData = convertedLogs.find(log => log.date === searchDate);
      // 検索日付で見つからない場合は、レスポンスにデータがある場合は最初のログを使用
      if (!logData && convertedLogs.length > 0) {
        logData = convertedLogs[0];
      }
      if (logData) {
        setTodayLog(logData);
      }

      // 現在の日付が選択された月に含まれている場合、logsも更新
      const searchDateObj = new Date(searchDate);
      if (searchDateObj.getFullYear() === selectedYear && searchDateObj.getMonth() + 1 === selectedMonth) {
        // 選択された月のデータを再取得
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const monthResponse = await getAttendanceList(employeeId, startDate, endDate);
        const convertedMonthLogs = monthResponse.logs.map(apiLog => convertApiLogToUiLog(apiLog));
        setLogs(convertedMonthLogs);
      }
    } catch (error) {
      logError('Failed to refresh attendance data:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      const employeeId = getEmployeeId();
      if (!employeeId) {
        setSnackbar({ message: '従業員IDが取得できませんでした。', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
        return;
      }

      // API仕様書に基づき、リクエストボディは不要です（日付と時刻はサーバー側で自動的に取得されます）
      await clockIn();

      // 最新の勤怠データを取得して反映
      await refreshAttendanceData();

      setSnackbar({ message: '出勤打刻を記録しました', type: 'success' });
      setTimeout(() => setSnackbar(null), 3000);
    } catch (error) {
      logError('Failed to clock in:', error);
      const errorMessage = error instanceof Error ? error.message : '出勤打刻に失敗しました';
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const handleClockOut = async () => {
    if (!todayLog) {
      setSnackbar({ message: '出勤打刻がされていません', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }

    try {
      const employeeId = getEmployeeId();
      if (!employeeId) {
        setSnackbar({ message: '従業員IDが取得できませんでした。', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
        return;
      }

      // API仕様書に基づき、リクエストボディは不要です（日付と時刻はサーバー側で自動的に取得されます）
      await clockOut();

      // 最新の勤怠データを取得して反映
      await refreshAttendanceData();

      setSnackbar({ message: '退勤打刻を記録しました', type: 'success' });
      setTimeout(() => setSnackbar(null), 3000);
    } catch (error) {
      logError('Failed to clock out:', error);
      const errorMessage = error instanceof Error ? error.message : '退勤打刻に失敗しました';
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const handleEdit = (log: AttendanceLog) => {
    setSelectedLog(log);
    setEditDate(log.date);
    setEditClockIn(log.clockIn || '');
    setEditClockOut(log.clockOut || '');
    setEditBreaks(log.breaks || []);
    setViewMode('edit');
  };

  const handleSaveEdit = async () => {
    if (!editDate || !editClockIn || !selectedLog) {
      setSnackbar({ message: '必須項目を入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }

    try {
      const employeeId = getEmployeeId();
      if (!employeeId) {
        setSnackbar({ message: '従業員IDを取得できませんでした', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
        return;
      }

      // UI用のbreaksをAPI用のbreaksに変換（idは不要）
      const apiBreaks: BreakRequest[] = editBreaks.map(breakItem => ({
        start: convertTimeToJST(editDate, breakItem.start),
        end: breakItem.end ? convertTimeToJST(editDate, breakItem.end) : null
      }));

      const apiLog = await updateAttendance({
        employeeId,
        workDate: editDate,
        clockIn: editClockIn ? convertTimeToJST(editDate, editClockIn) : null,
        clockOut: editClockOut ? convertTimeToJST(editDate, editClockOut) : null,
        breaks: apiBreaks
      });

      const updatedLog = convertApiLogToUiLog(apiLog);

      setLogs(logs.map(log => log.id === selectedLog.id ? updatedLog : log));

      if (editDate === getTodayDate()) {
        setTodayLog(updatedLog);
      }

      setSnackbar({ message: '打刻を更新しました', type: 'success' });
      setTimeout(() => setSnackbar(null), 3000);
      setViewMode('list');
      setSelectedLog(null);
      setEditDate('');
      setEditClockIn('');
      setEditClockOut('');
      setEditBreaks([]);
    } catch (error) {
      logError('Failed to update attendance:', error);
      const errorMessage = error instanceof Error ? error.message : '打刻の更新に失敗しました';
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const handleCancelEdit = () => {
    setViewMode('stamp');
    setSelectedLog(null);
    setEditDate('');
    setEditClockIn('');
    setEditClockOut('');
    setEditBreaks([]);
  };

  // カレンダー用の日付生成関数
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 (日曜日) から 6 (土曜日)
    
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];
    
    // 前月の日付を追加（カレンダーの最初の週を埋めるため）
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevMonthLastDay - i).padStart(2, '0')}`,
        day: prevMonthLastDay - i,
        isCurrentMonth: false
      });
    }
    
    // 今月の日付を追加
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        isCurrentMonth: true
      });
    }
    
    // 次月の日付を追加（カレンダーの最後の週を埋めるため）
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const remainingDays = 42 - days.length; // 6週間分
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  // 指定された日付の打刻情報を取得
  const getLogByDate = (date: string): AttendanceLog | undefined => {
    return logs.find(log => log.date === date);
  };

  // 出勤簿は選択された月のカレンダー表示
  const calendarDays = generateCalendarDays(selectedYear, selectedMonth);

  // 選択された月の打刻データを取得
  const monthLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    return logDate.getFullYear() === selectedYear && logDate.getMonth() + 1 === selectedMonth;
  });

  // 統計データを計算
  const calculateStatistics = () => {
    const workingDays = monthLogs.filter(log => log.clockIn && log.clockOut).length;
    const weekdayWorkingDays = monthLogs.filter(log => {
      if (!log.clockIn || !log.clockOut) return false;
      const date = new Date(log.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // 日曜日と土曜日以外
    }).length;
    const holidayWorkingDays = monthLogs.filter(log => {
      if (!log.clockIn || !log.clockOut) return false;
      const date = new Date(log.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // 日曜日または土曜日
    }).length;
    const absenceDays = 0; // 欠勤日数（実装が必要な場合は追加）

    // 実労働時間と実残業時間を計算
    // APIから取得したtotalWorkMinutesを使用
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;
    monthLogs.forEach(log => {
      // APIから取得した労働時間（totalWorkMinutes）を使用
      if (log.totalWorkMinutes !== undefined && log.totalWorkMinutes !== null) {
        totalWorkMinutes += log.totalWorkMinutes;
        
        // 残業時間（8時間を超える分）
        const standardWorkMinutes = 8 * 60;
        if (log.totalWorkMinutes > standardWorkMinutes) {
          totalOvertimeMinutes += log.totalWorkMinutes - standardWorkMinutes;
        }
      }
    });

    const workHours = Math.floor(totalWorkMinutes / 60);
    const workMins = totalWorkMinutes % 60;
    const overtimeHours = Math.floor(totalOvertimeMinutes / 60);
    const overtimeMins = totalOvertimeMinutes % 60;

    // 所定労働日数（月の平日数を計算）
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    let prescribedWorkingDays = 0;
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        prescribedWorkingDays++;
      }
    }

    return {
      workingDays,
      weekdayWorkingDays,
      holidayWorkingDays,
      absenceDays,
      totalWorkTime: `${String(workHours).padStart(2, '0')}:${String(workMins).padStart(2, '0')}`,
      totalOvertime: `${String(overtimeHours).padStart(2, '0')}:${String(overtimeMins).padStart(2, '0')}`,
      prescribedWorkingDays
    };
  };

  const statistics = calculateStatistics();

  // 本日の日付を取得（変換不要）
  const today = getTodayDate();
  
  // 現在時刻を取得して5時を過ぎたかどうかを判定
  const currentTime = now;
  const currentHour = currentTime.getHours();
  
  // APIから取得したtodayLogを優先的に使用（todayLogがある場合は表示する）
  // todayLogがない場合は、logsから今日の日付で検索
  const currentLog = todayLog || logs.find(log => log.date === today);
  
  // ステータスはcurrentLogのstatusを優先（currentLogが存在しない場合のみ「未出勤」）
  // 5時以降でも、既に退勤済みの場合は「退勤済み」と表示する
  const currentStatus: AttendanceLog['status'] = currentLog?.status || '未出勤';

  // ステータスに応じたメッセージと色を取得
  const getStatusMessage = (status: AttendanceLog['status']): string => {
    switch (status) {
      case '未出勤':
        return '未出勤';
      case '出勤中':
        return '勤務中';
      case '休憩中':
        return '休憩中';
      case '退勤済み':
        return '本日の勤務を終了しました';
      default:
        return '未出勤';
    }
  };

  const getStatusColor = (status: AttendanceLog['status']): string => {
    switch (status) {
      case '未出勤':
        return '#e5e7eb'; // グレー
      case '出勤中':
        return '#06b6d4'; // シアン（青緑）
      case '休憩中':
        return '#fef3c7'; // 黄色
      case '退勤済み':
        return '#d1fae5'; // 緑
      default:
        return '#e5e7eb';
    }
  };

  const getStatusTextColor = (status: AttendanceLog['status']): string => {
    switch (status) {
      case '未出勤':
        return '#374151'; // ダークグレー
      case '出勤中':
        return '#ffffff'; // 白
      case '休憩中':
        return '#92400e'; // ダークイエロー
      case '退勤済み':
        return '#065f46'; // ダークグリーン
      default:
        return '#374151';
    }
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
      <h2 style={{ marginBottom: isMobile ? '1rem' : '1.4rem', fontSize: isMobile ? fontSizes.h2.mobile : fontSizes.h2.desktop }}>
        勤怠
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
          onClick={() => setViewMode('stamp')}
          disabled={viewMode === 'edit'}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: viewMode === 'stamp' ? '#92400e' : 'rgba(146, 64, 14, 0.4)',
            color: '#ffffff',
            border: 'none',
            borderBottom: viewMode === 'stamp' ? '3px solid #ffffff' : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: viewMode === 'edit' ? 'not-allowed' : 'pointer',
            fontWeight: viewMode === 'stamp' ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            opacity: viewMode === 'edit' ? 0.5 : (viewMode === 'stamp' ? 1 : 0.8),
            textShadow: viewMode === 'stamp'
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : '0 1px 2px rgba(0,0,0,0.25)',
            position: 'relative'
          }}
        >
          打刻
        </button>
        <button
          onClick={() => setViewMode('list')}
          disabled={viewMode === 'edit'}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: viewMode === 'list' ? '#92400e' : 'rgba(146, 64, 14, 0.4)',
            color: '#ffffff',
            border: 'none',
            borderBottom: viewMode === 'list' ? '3px solid #ffffff' : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: viewMode === 'edit' ? 'not-allowed' : 'pointer',
            fontWeight: viewMode === 'list' ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            opacity: viewMode === 'edit' ? 0.5 : (viewMode === 'list' ? 1 : 0.8),
            textShadow: viewMode === 'list'
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : '0 1px 2px rgba(0,0,0,0.25)'
          }}
        >
          出勤簿
        </button>
      </div>

      {/* 打刻画面 */}
      {viewMode === 'stamp' && (
        <div>
          {/* 退勤時刻未登録エラー */}
          {missingClockOutError && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '2px solid #dc2626',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              color: '#991b1b'
            }}>
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: fontSizes.large, 
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <span>退勤時刻が登録されていません</span>
              </div>
              <div style={{ fontSize: fontSizes.medium, marginBottom: '0.75rem' }}>
                {formatDate(missingClockOutError.date)}に出勤打刻（{missingClockOutError.clockIn}）はありますが、退勤時刻が29時（翌日5時）を過ぎても登録されていません。
              </div>
              <button
                onClick={() => {
                  const errorLog = logs.find(log => log.date === missingClockOutError.date);
                  if (errorLog) {
                    handleEdit(errorLog);
                  }
                }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.cursor = 'pointer';
              }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: 'none',
                  minHeight: 'auto',
                  minWidth: 'auto',
                  transition: 'background-color 0.2s, transform 0.2s'
                }}
              >
                出勤簿から打刻修正する
              </button>
            </div>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '1.5rem' : '2rem',
            marginBottom: isMobile ? '1rem' : '1.4rem'
          }}>
        <div style={{
          backgroundColor: '#f9fafb',
          padding: isMobile ? '1.5rem' : '1rem',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          {/* 勤怠ステータスバナー */}
          <div style={{
            width: '100%',
            padding: isMobile ? '1rem' : '1.25rem',
            backgroundColor: getStatusColor(currentStatus),
            color: getStatusTextColor(currentStatus),
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop,
            marginBottom: isMobile ? '1rem' : '1rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {getStatusMessage(currentStatus)}
          </div>
          <div style={{ marginBottom: isMobile ? '0.75rem' : '0.5rem' }}>
            <p style={{ 
              fontSize: isMobile ? '1.5rem' : '2rem', 
              fontWeight: 'bold',
              color: (() => {
                const date = new Date(today);
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0) return '#dc2626'; // 日曜日→赤色
                if (dayOfWeek === 6) return '#2563eb'; // 土曜日→青色
                return '#1f2937'; // 平日→黒色
              })()
            }}>
              {(() => {
                const formattedDate = formatDate(today);
                const date = new Date(today);
                const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                const dayName = dayNames[date.getDay()];
                return `${formattedDate}(${dayName})`;
              })()}
            </p>
            <p style={{ fontSize: isMobile ? '3rem' : '4.5rem', fontWeight: 'bold', marginTop: '0.5rem', letterSpacing: '0.1em' }}>
              {now.toLocaleTimeString('ja-JP', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: '1rem', 
            justifyContent: 'center', 
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleClockIn}
              disabled={currentStatus !== '未出勤'}
              onMouseEnter={(e) => {
                if (currentStatus === '未出勤') {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={(e) => {
                if (currentStatus === '未出勤') {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: '1rem 2rem',
                backgroundColor: currentStatus === '未出勤' ? '#10b981' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                cursor: currentStatus === '未出勤' ? 'pointer' : 'not-allowed',
                opacity: currentStatus === '未出勤' ? 1 : 0.6,
                transition: 'background-color 0.2s, transform 0.2s'
              }}
            >
              出勤
            </button>
            <button
              onClick={handleClockOut}
              disabled={currentStatus !== '出勤中'}
              onMouseEnter={(e) => {
                if (currentStatus === '出勤中') {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={(e) => {
                if (currentStatus === '出勤中') {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: '1rem 2rem',
                backgroundColor: currentStatus === '出勤中' ? '#ef4444' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                cursor: currentStatus === '出勤中' ? 'pointer' : 'not-allowed',
                opacity: currentStatus === '出勤中' ? 1 : 0.6,
                transition: 'background-color 0.2s, transform 0.2s'
              }}
            >
              退勤
            </button>
            <button
              onClick={async () => {
                if (!currentLog?.clockIn) {
                  return;
                }
                if (currentLog.clockOut) {
                  return;
                }
                // 最後の休憩が終了していない場合は休憩終了を促す
                const lastBreak = currentLog.breaks && currentLog.breaks.length > 0 
                  ? currentLog.breaks[currentLog.breaks.length - 1] 
                  : null;
                if (lastBreak && !lastBreak.end) {
                  return; // 最後の休憩が終了していない場合は新しい休憩を開始できない
                }
                try {
                  // API仕様書に基づき、リクエストボディは不要です（日付と時刻はサーバー側で自動的に取得されます）
                  const employeeId = getEmployeeId();
                  if (!employeeId) {
                    setSnackbar({ message: '従業員IDが取得できませんでした。', type: 'error' });
                    setTimeout(() => setSnackbar(null), 3000);
                    return;
                  }

                  await startBreak();

                  // 最新の勤怠データを取得して反映
                  await refreshAttendanceData();

                  setSnackbar({ message: '休憩開始を記録しました', type: 'success' });
                  setTimeout(() => setSnackbar(null), 3000);
                } catch (error) {
                  logError('Failed to start break:', error);
                  const errorMessage = error instanceof Error ? error.message : '休憩開始に失敗しました';
                  setSnackbar({ message: errorMessage, type: 'error' });
                  setTimeout(() => setSnackbar(null), 3000);
                }
              }}
              disabled={currentStatus !== '出勤中'}
              onMouseEnter={(e) => {
                if (currentStatus === '出勤中') {
                  e.currentTarget.style.backgroundColor = '#d97706';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={(e) => {
                if (currentStatus === '出勤中') {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: '1rem 2rem',
                backgroundColor: currentStatus === '出勤中' ? '#f59e0b' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                cursor: currentStatus === '出勤中' ? 'pointer' : 'not-allowed',
                opacity: currentStatus === '出勤中' ? 1 : 0.6,
                transition: 'background-color 0.2s, transform 0.2s'
              }}
            >
              休憩開始
            </button>
            <button
              onClick={async () => {
                if (currentStatus !== '休憩中') {
                  return;
                }
                try {
                  // API仕様書に基づき、リクエストボディは不要です（日付と時刻はサーバー側で自動的に取得されます）
                  const employeeId = getEmployeeId();
                  if (!employeeId) {
                    setSnackbar({ message: '従業員IDが取得できませんでした。', type: 'error' });
                    setTimeout(() => setSnackbar(null), 3000);
                    return;
                  }

                  await endBreak();

                  // 最新の勤怠データを取得して反映
                  await refreshAttendanceData();

                  setSnackbar({ message: '休憩終了を記録しました', type: 'success' });
                  setTimeout(() => setSnackbar(null), 3000);
                } catch (error) {
                  logError('Failed to end break:', error);
                  const errorMessage = error instanceof Error ? error.message : '休憩終了に失敗しました';
                  setSnackbar({ message: errorMessage, type: 'error' });
                  setTimeout(() => setSnackbar(null), 3000);
                }
              }}
              disabled={currentStatus !== '休憩中'}
              onMouseEnter={(e) => {
                if (currentStatus === '休憩中') {
                  e.currentTarget.style.backgroundColor = '#ea580c';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={(e) => {
                if (currentStatus === '休憩中') {
                  e.currentTarget.style.backgroundColor = '#f97316';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: '1rem 2rem',
                backgroundColor: currentStatus === '休憩中' ? '#f97316' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                cursor: currentStatus === '休憩中' ? 'pointer' : 'not-allowed',
                opacity: currentStatus === '休憩中' ? 1 : 0.6,
                transition: 'background-color 0.2s, transform 0.2s'
              }}
            >
              休憩終了
            </button>
          </div>
        </div>
        <div style={{
          backgroundColor: '#f9fafb',
          padding: isMobile ? '1.5rem' : '1rem',
          borderRadius: '8px'
        }}>
          <h3 style={{ marginBottom: '1rem', fontSize: fontSizes.medium }}>
            打刻履歴（今日）
          </h3>
            <div style={{ maxHeight: isMobile ? '300px' : '400px', overflowY: 'auto' }}>
            {!currentLog ? (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>打刻履歴がありません</p>
            ) : isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>{formatDate(currentLog.date)}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div><strong>出勤時刻:</strong> {formatTimeWithNextDay(currentLog.clockInIso)}</div>
                    <div><strong>退勤時刻:</strong> {formatTimeWithNextDay(currentLog.clockOutIso)}</div>
                  </div>
                  {currentLog.breaks && currentLog.breaks.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>休憩時間:</strong>
                      {currentLog.breaks.map((breakItem, index) => (
                        <div key={index} style={{ fontSize: fontSizes.medium, marginLeft: '0.5rem' }}>
                          {formatTimeWithNextDay(breakItem.startIso)} - {breakItem.endIso ? formatTimeWithNextDay(breakItem.endIso) : '休憩中'}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>実働時間:</strong> {calculateWorkTime(currentLog)}
                  </div>
                  <div>
                    <strong>ステータス:</strong>{' '}
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: fontSizes.badge,
                          backgroundColor:
                            currentLog.status === '未出勤' ? '#e5e7eb' :
                            currentLog.status === '出勤中' ? '#dbeafe' :
                            currentLog.status === '休憩中' ? '#fef3c7' :
                            '#d1fae5',
                          color:
                            currentLog.status === '未出勤' ? '#374151' :
                            currentLog.status === '出勤中' ? '#1e40af' :
                            currentLog.status === '休憩中' ? '#92400e' :
                            '#065f46'
                    }}>
                      {currentLog.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                overflowX: 'auto',
                maxHeight: isMobile ? '400px' : '600px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: '2px solid #e5e7eb',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#ffffff',
                      zIndex: 10,
                      boxShadow: '0 2px 2px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>日付</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>出勤時刻</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>退勤時刻</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>休憩時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>実働時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLog && (
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem' }}>{formatDate(currentLog.date)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatTimeWithNextDay(currentLog.clockInIso)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatTimeWithNextDay(currentLog.clockOutIso)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {currentLog.breaks && currentLog.breaks.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {currentLog.breaks.map((breakItem, index) => (
                              <div key={index} style={{ fontSize: fontSizes.medium }}>
                                {formatTimeWithNextDay(breakItem.startIso)} - {breakItem.endIso ? formatTimeWithNextDay(breakItem.endIso) : '休憩中'}
                              </div>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{calculateWorkTime(currentLog)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                            backgroundColor:
                              currentLog.status === '未出勤' ? '#e5e7eb' :
                              currentLog.status === '出勤中' ? '#dbeafe' :
                              currentLog.status === '休憩中' ? '#fef3c7' :
                              '#d1fae5',
                            color:
                              currentLog.status === '未出勤' ? '#374151' :
                              currentLog.status === '出勤中' ? '#1e40af' :
                              currentLog.status === '休憩中' ? '#92400e' :
                              '#065f46'
                        }}>
                          {currentLog.status}
                        </span>
                      </td>
                    </tr>
                  )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
      )}

      {/* 打刻修正画面 */}
      {viewMode === 'edit' && (
        <div style={{
          backgroundColor: '#f9fafb',
          padding: isMobile ? '1.5rem' : '1.4rem',
          borderRadius: '8px'
        }}>
          <h3 style={{ marginBottom: '1.05rem', fontSize: isMobile ? '1.125rem' : '0.875rem' }}>
            打刻修正
          </h3>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              修正する日付 *
            </label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => {
                setEditDate(e.target.value);
                const existingLog = logs.find(log => log.date === e.target.value);
                if (existingLog) {
                  setSelectedLog(existingLog);
                  setEditClockIn(existingLog.clockIn || '');
                  setEditClockOut(existingLog.clockOut || '');
                  setEditBreaks(existingLog.breaks || []);
                } else {
                  setSelectedLog(null);
                  setEditClockIn('');
                  setEditClockOut('');
                  setEditBreaks([]);
                }
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
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              出勤時刻 *
            </label>
            <input
              type="time"
              value={editClockIn}
              onChange={(e) => setEditClockIn(e.target.value)}
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
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              退勤時刻
            </label>
            <input
              type="time"
              value={editClockOut}
              onChange={(e) => setEditClockOut(e.target.value)}
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
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold' }}>
                休憩
              </label>
              <Button
                variant="primary"
                onClick={() => setEditBreaks([...editBreaks, { start: '', end: null, startIso: '', endIso: null }])}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.05rem',
                  minWidth: '100px',
                  fontSize: fontSizes.button
                }}
              >
                <PlusIcon size={18} color="#2563eb" />
                追加
              </Button>
            </div>
            {editBreaks.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: fontSizes.medium }}>休憩がありません</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {editBreaks.map((breakItem, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: fontSizes.medium }}>休憩 {index + 1}</span>
                      <DeleteButton
                        onClick={() => {
                          const updated = editBreaks.filter((_, i) => i !== index);
                          setEditBreaks(updated);
                        }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.label }}>
                          開始時刻
                        </label>
                        <input
                          type="time"
                          value={breakItem.start}
                          onChange={(e) => {
                            const updated = [...editBreaks];
                            updated[index] = { ...breakItem, start: e.target.value };
                            setEditBreaks(updated);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: fontSizes.input,
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.label }}>
                          終了時刻
                        </label>
                        <input
                          type="time"
                          value={breakItem.end || ''}
                          onChange={(e) => {
                            const updated = [...editBreaks];
                            updated[index] = { ...breakItem, end: e.target.value || null };
                            setEditBreaks(updated);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: fontSizes.input,
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
            <CancelButton
              fullWidth
              onClick={handleCancelEdit}
            />
            <RegisterButton
              fullWidth
              onClick={handleSaveEdit}
            />
          </div>
        </div>
      )}

      {/* 出勤簿画面 */}
      {viewMode === 'list' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => {
                    if (selectedMonth === 1) {
                      setSelectedYear(selectedYear - 1);
                      setSelectedMonth(12);
                    } else {
                      setSelectedMonth(selectedMonth - 1);
                    }
                  }}
                  style={{
                    width: isMobile ? '36px' : '40px',
                    height: isMobile ? '36px' : '40px',
                    background: 'linear-gradient(135deg, #d4a574 0%, #8b5a2b 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  ←
                </button>
                
                {/* 年入力 */}
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => {
                    const year = Number(e.target.value);
                    if (year >= 2000 && year <= 2100) {
                      setSelectedYear(year);
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: fontSizes.badge,
                    fontWeight: 'bold',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    width: isMobile ? '80px' : '100px',
                    textAlign: 'center'
                  }}
                  min="2000"
                  max="2100"
                />
                
                <span style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: 'bold', color: '#1f2937' }}>
                  年
                </span>
                
                {/* 月選択 */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: fontSizes.badge,
                    fontWeight: 'bold',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    cursor: 'pointer',
                    minWidth: '70px'
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
                
                <span style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: 'bold', color: '#1f2937' }}>
                  月
                </span>
                
                <button
                  onClick={() => {
                    if (selectedMonth === 12) {
                      setSelectedYear(selectedYear + 1);
                      setSelectedMonth(1);
                    } else {
                      setSelectedMonth(selectedMonth + 1);
                    }
                  }}
                  style={{
                    width: isMobile ? '36px' : '40px',
                    height: isMobile ? '36px' : '40px',
                    background: 'linear-gradient(135deg, #d4a574 0%, #8b5a2b 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  →
                </button>
              </div>

          {/* サマリー情報表示切り替えリボン */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '0.75rem 1rem',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          onClick={() => setShowSummary(!showSummary)}
          >
            <span style={{
              fontSize: fontSizes.medium,
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              サマリー情報
            </span>
            <span style={{
              fontSize: fontSizes.medium,
              color: '#6b7280',
              transform: showSummary ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              display: 'inline-block'
            }}>
              ▼
            </span>
          </div>

          {/* サマリー情報 */}
          {showSummary && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* ユーザー情報 */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #d1d5db'
            }}>
              <h4 style={{ 
                marginBottom: '0.75rem', 
                fontSize: fontSizes.badge,
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                ユーザー情報
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>年月:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{selectedYear}年{selectedMonth}月</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>氏名:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.employeeName || userId || 'ゲスト'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>所定労働日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.scheduledWorkDays ?? statistics.prescribedWorkingDays}日</span>
                </div>
              </div>
            </div>

            {/* 基本項目 */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #d1d5db'
            }}>
              <h4 style={{ 
                marginBottom: '0.75rem', 
                fontSize: fontSizes.badge,
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                基本項目
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>実働日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.actualWorkDays ?? statistics.workingDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>平日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.weekdayWorkDays ?? statistics.weekdayWorkingDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>休日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.holidayWorkDays ?? statistics.holidayWorkingDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>欠勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.absenceDays ?? statistics.absenceDays}</span>
                </div>
              </div>
            </div>

            {/* 労働時間 */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #d1d5db'
            }}>
              <h4 style={{ 
                marginBottom: '0.75rem', 
                fontSize: fontSizes.badge,
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                労働時間
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>実労働時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary ? formatMinutesToTime(summary.actualWorkHours) : statistics.totalWorkTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>実残業時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary ? formatMinutesToTime(summary.actualOvertimeHours) : statistics.totalOvertime}</span>
                </div>
              </div>
            </div>

            {/* 本日時点休暇残日数 */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #d1d5db'
            }}>
              <h4 style={{ 
                marginBottom: '0.75rem', 
                fontSize: fontSizes.badge,
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                本日時点休暇残日数
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>年間有給日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold', color: '#000000' }}>
                    {summary?.annualPaidLeaveDays ?? totalPaidLeaveDays}日
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>使用日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold', color: '#000000' }}>
                    {summary?.usedPaidLeaveDays ?? usedPaidLeaveDays}日
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>残有給日数:</span>
                  <span style={{ 
                    fontSize: fontSizes.badge, 
                    fontWeight: 'bold', 
                    color: '#000000'
                  }}>
                    {summary?.remainingPaidLeaveDays ?? remainingPaidLeaveDays}日
                  </span>
                </div>
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#dbeafe',
                  borderRadius: '4px',
                  border: '1px solid #93c5fd'
                }}>
                  <div style={{ fontSize: fontSizes.medium, fontWeight: 'bold', color: '#1e40af', marginBottom: '0.25rem' }}>
                    有給期限
                  </div>
                  <div style={{ fontSize: fontSizes.medium, color: '#1e40af' }}>
                    {formatDate(summary?.paidLeaveExpirationDate ?? paidLeaveExpiryDate)}
                  </div>
                  <div style={{ fontSize: fontSizes.medium, color: '#1e3a8a', marginTop: '0.25rem' }}>
                    上記日付までに消化日付分(残り{summary?.remainingPaidLeaveDays ?? remainingPaidLeaveDays}日)の有給を取得してください
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* テーブル形式の出勤簿（ジョブカン風） */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid #d1d5db',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflowX: 'auto',
            maxHeight: isMobile ? '400px' : '600px',
            overflowY: 'auto'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: fontSizes.table
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f3f4f6',
                  borderBottom: '2px solid #d1d5db',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 2px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: 'bold',
                    borderRight: '1px solid #d1d5db',
                    whiteSpace: 'nowrap'
                  }}>日付</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: 'bold',
                    borderRight: '1px solid #d1d5db',
                    whiteSpace: 'nowrap'
                  }}>出勤時刻</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: 'bold',
                    borderRight: '1px solid #d1d5db',
                    whiteSpace: 'nowrap'
                  }}>退勤時刻</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: 'bold',
                    borderRight: '1px solid #d1d5db',
                    whiteSpace: 'nowrap'
                  }}>労働時間</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: 'bold',
                    borderRight: '1px solid #d1d5db',
                    whiteSpace: 'nowrap'
                  }}>残業時間</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: 'bold',
                    borderRight: '1px solid #d1d5db',
                    whiteSpace: 'nowrap'
                  }}>深夜時間</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: 'bold',
                    borderRight: '1px solid #d1d5db',
                    whiteSpace: 'nowrap'
                  }}>休憩時間</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: 'bold',
                    borderRight: '1px solid #d1d5db',
                    whiteSpace: 'nowrap'
                  }}>勤務状況</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}>修正</th>
                </tr>
              </thead>
              <tbody>
                {calendarDays
                  .filter(day => day.isCurrentMonth)
                  .map((calendarDay) => {
                    const log = getLogByDate(calendarDay.date);
                    const date = new Date(calendarDay.date);
                    const dayOfWeek = date.getDay();
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;
                    // 退勤打刻がない日付かチェック
                    const needsCorrection = missingClockOutDates.includes(calendarDay.date);
                    
                    // 労働時間計算（APIから取得した値を使用）
                    let workTime = '-';
                    let overtime = '-';
                    let lateNight = '-';
                    let breakTime = '-';
                    
                    if (log) {
                      // 労働時間: APIから取得したtotalWorkMinutesを使用
                      if (log.totalWorkMinutes !== undefined && log.totalWorkMinutes !== null) {
                        const workHours = Math.floor(log.totalWorkMinutes / 60);
                        const workMins = log.totalWorkMinutes % 60;
                        workTime = `${String(workHours).padStart(2, '0')}:${String(workMins).padStart(2, '0')}`;
                      }
                      
                      // 残業時間: APIから取得したovertimeMinutesを使用
                      if (log.overtimeMinutes !== undefined && log.overtimeMinutes !== null) {
                        const overtimeHours = Math.floor(log.overtimeMinutes / 60);
                        const overtimeMins = log.overtimeMinutes % 60;
                        overtime = `${String(overtimeHours).padStart(2, '0')}:${String(overtimeMins).padStart(2, '0')}`;
                      } else {
                        overtime = '00:00';
                      }
                      
                      // 深夜時間: APIから取得したlateNightMinutesを使用
                      if (log.lateNightMinutes !== undefined && log.lateNightMinutes !== null) {
                        const lateNightHours = Math.floor(log.lateNightMinutes / 60);
                        const lateNightMins = log.lateNightMinutes % 60;
                        lateNight = `${String(lateNightHours).padStart(2, '0')}:${String(lateNightMins).padStart(2, '0')}`;
                      } else {
                        lateNight = '00:00';
                      }
                      
                      // 休憩時間計算（フロントエンドで計算）
                      if (log.breaks && log.breaks.length > 0) {
                        let breakMinutes = 0;
                        log.breaks.forEach(breakItem => {
                          if (breakItem.startIso && breakItem.endIso) {
                            // YYYY-MM-DD HH:MM:SS形式から時刻を抽出して計算
                            try {
                              const startDate = parseJSTDateTime(breakItem.startIso);
                              const endDate = breakItem.endIso ? parseJSTDateTime(breakItem.endIso) : null;
                              if (endDate) {
                                const diffMs = endDate.getTime() - startDate.getTime();
                                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                                breakMinutes += Math.max(0, diffMinutes);
                              }
                            } catch (error) {
                              // パースエラーの場合は従来の方法で計算
                              if (breakItem.start && breakItem.end) {
                                const [bStartHour, bStartMinute] = breakItem.start.split(':').map(Number);
                                const [bEndHour, bEndMinute] = breakItem.end.split(':').map(Number);
                                const bStartMinutes = bStartHour * 60 + bStartMinute;
                                const bEndMinutes = bEndHour * 60 + bEndMinute;
                                breakMinutes += Math.max(0, bEndMinutes - bStartMinutes);
                              }
                            }
                          }
                        });
                        breakTime = `${String(Math.floor(breakMinutes / 60)).padStart(2, '0')}:${String(breakMinutes % 60).padStart(2, '0')}`;
                      } else {
                        breakTime = '00:00';
                      }
                    }
                    
                    return (
                      <tr 
                        key={calendarDay.date}
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: isSunday ? '#fef2f2' : isSaturday ? '#eff6ff' : '#ffffff'
                        }}
                      >
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb',
                          color: isSunday ? '#dc2626' : isSaturday ? '#2563eb' : '#1f2937',
                          fontWeight: (isSunday || isSaturday) ? 'bold' : 'normal',
                          backgroundColor: 'transparent'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {formatDate(calendarDay.date)}
                            {needsCorrection && (
                              <>
                                <WarningIcon size={18} color="#f59e0b" />
                                <span style={{
                                  color: '#dc2626',
                                  fontWeight: 'bold',
                                  fontSize: fontSizes.small
                                }}>
                                  退勤未打刻のため修正が必要です
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb'
                        }}>
                          {log ? formatTimeWithNextDay(log.clockInIso) : '-'}
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb'
                        }}>
                          {log ? formatTimeWithNextDay(log.clockOutIso) : '-'}
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb',
                          fontWeight: 'bold'
                        }}>
                          {workTime}
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb'
                        }}>
                          {overtime}
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb'
                        }}>
                          {lateNight}
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb'
                        }}>
                          {breakTime}
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb'
                        }}>
                          {log ? (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: fontSizes.badge,
                              backgroundColor: log.status === '退勤済み' ? '#d1fae5' : '#dbeafe',
                              color: log.status === '退勤済み' ? '#065f46' : '#1e40af'
                            }}>
                              {log.status}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          textAlign: 'center'
                        }}>
                          {log ? (
                            isMobile ? (
                              <EditButton
                                onClick={() => handleEdit(log)}
                                size="small"
                              >
                                修正
                              </EditButton>
                            ) : (
                              <Button
                                variant="icon-edit"
                                onClick={() => handleEdit(log)}
                                title="修正"
                              />
                            )
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

// 労働時間を計算する関数（休憩時間を考慮）
// const calculateWorkTime = (log: AttendanceLog): string => {
//   if (!log.clockIn || !log.clockOut) {
//     return '-';
//   }

//   const [inHour, inMinute] = log.clockIn.split(':').map(Number);
//   const [outHour, outMinute] = log.clockOut.split(':').map(Number);
  
//   const inMinutes = inHour * 60 + inMinute;
//   const outMinutes = outHour * 60 + outMinute;

//   // 休憩時間の合計を計算（複数回の休憩に対応）
//   let breakMinutes = 0;
//   if (log.breaks && log.breaks.length > 0) {
//     log.breaks.forEach(breakItem => {
//       if (breakItem.start && breakItem.end) {
//         const [bStartHour, bStartMinute] = breakItem.start.split(':').map(Number);
//         const [bEndHour, bEndMinute] = breakItem.end.split(':').map(Number);
//         const bStartMinutes = bStartHour * 60 + bStartMinute;
//         const bEndMinutes = bEndHour * 60 + bEndMinute;
//         breakMinutes += Math.max(0, bEndMinutes - bStartMinutes);
//       }
//     });
//   }
  
//   const workMinutes = outMinutes - inMinutes - breakMinutes;
  
//   if (workMinutes <= 0) {
//     return '00:00';
//   }
  
//   const hours = Math.floor(workMinutes / 60);
//   const minutes = workMinutes % 60;
  
//   return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
// };

