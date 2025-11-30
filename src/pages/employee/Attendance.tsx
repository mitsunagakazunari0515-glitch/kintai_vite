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
import { DeleteIcon } from '../../components/Icons';
import { Snackbar } from '../../components/Snackbar';
import { formatDate, formatTime } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';

interface Break {
  start: string;
  end: string | null;
}

interface AttendanceLog {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breaks: Break[]; // 休憩を複数回取れるように配列に変更
  status: '未出勤' | '出勤中' | '休憩中' | '退勤済み';
}

type ViewMode = 'stamp' | 'edit' | 'list';

export const Attendance: React.FC = () => {
  const { userId } = useAuth();
  // 昨日の日付を取得（退勤時刻未登録エラーのテスト用）
  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  // 一昨日の日付を取得（退勤時刻未登録エラーのテスト用）
  const getDayBeforeYesterdayDate = () => {
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    return dayBeforeYesterday.toISOString().split('T')[0];
  };

  const [logs, setLogs] = useState<AttendanceLog[]>([
    // 退勤時刻未登録のテスト用ダミーデータ（昨日の日付で出勤打刻のみ）
    {
      id: 'test-missing-clockout-yesterday',
      date: getYesterdayDate(),
      clockIn: '09:00',
      clockOut: null,
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '出勤中'
    },
    // 退勤時刻未登録のテスト用ダミーデータ（一昨日の日付で出勤打刻のみ）
    {
      id: 'test-missing-clockout-day-before-yesterday',
      date: getDayBeforeYesterdayDate(),
      clockIn: '09:15',
      clockOut: null,
      breaks: [{ start: '12:15', end: '13:15' }],
      status: '出勤中'
    },
    {
      id: '1',
      date: '2024-01-15',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '2',
      date: '2024-01-16',
      clockIn: '09:15',
      clockOut: '18:30',
      breaks: [{ start: '12:15', end: '13:15' }],
      status: '退勤済み'
    },
    // 2025年11月のダミーデータ
    {
      id: '3',
      date: '2025-11-01',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '4',
      date: '2025-11-04',
      clockIn: '09:10',
      clockOut: '18:15',
      breaks: [{ start: '12:10', end: '13:10' }],
      status: '退勤済み'
    },
    {
      id: '5',
      date: '2025-11-05',
      clockIn: '09:05',
      clockOut: '18:20',
      breaks: [{ start: '12:00', end: '13:00' }, { start: '15:00', end: '15:15' }],
      status: '退勤済み'
    },
    {
      id: '6',
      date: '2025-11-06',
      clockIn: '08:55',
      clockOut: '17:45',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '7',
      date: '2025-11-07',
      clockIn: '09:20',
      clockOut: '18:30',
      breaks: [{ start: '12:20', end: '13:20' }],
      status: '退勤済み'
    },
    {
      id: '8',
      date: '2025-11-11',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '9',
      date: '2025-11-12',
      clockIn: '09:15',
      clockOut: '18:10',
      breaks: [{ start: '12:15', end: '13:15' }],
      status: '退勤済み'
    },
    {
      id: '10',
      date: '2025-11-13',
      clockIn: '08:50',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '11',
      date: '2025-11-14',
      clockIn: '09:05',
      clockOut: '18:25',
      breaks: [{ start: '12:05', end: '13:05' }, { start: '15:30', end: '15:45' }],
      status: '退勤済み'
    },
    {
      id: '12',
      date: '2025-11-18',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '13',
      date: '2025-11-19',
      clockIn: '09:10',
      clockOut: '18:15',
      breaks: [{ start: '12:10', end: '13:10' }],
      status: '退勤済み'
    },
    {
      id: '14',
      date: '2025-11-20',
      clockIn: '09:20',
      clockOut: '18:30',
      breaks: [{ start: '12:20', end: '13:20' }],
      status: '退勤済み'
    },
    {
      id: '15',
      date: '2025-11-21',
      clockIn: '08:55',
      clockOut: '17:50',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '16',
      date: '2025-11-25',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '17',
      date: '2025-11-26',
      clockIn: '09:15',
      clockOut: '18:20',
      breaks: [{ start: '12:15', end: '13:15' }],
      status: '退勤済み'
    },
    {
      id: '18',
      date: '2025-11-27',
      clockIn: '09:05',
      clockOut: '18:10',
      breaks: [{ start: '12:05', end: '13:05' }],
      status: '退勤済み'
    },
    {
      id: '19',
      date: '2025-11-28',
      clockIn: '08:50',
      clockOut: '17:45',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    // 2025年12月のダミーデータ
    {
      id: '20',
      date: '2025-12-02',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '21',
      date: '2025-12-03',
      clockIn: '09:10',
      clockOut: '18:15',
      breaks: [{ start: '12:10', end: '13:10' }],
      status: '退勤済み'
    },
    {
      id: '22',
      date: '2025-12-04',
      clockIn: '09:05',
      clockOut: '18:20',
      breaks: [{ start: '12:00', end: '13:00' }, { start: '15:00', end: '15:15' }],
      status: '退勤済み'
    },
    {
      id: '23',
      date: '2025-12-05',
      clockIn: '08:55',
      clockOut: '17:50',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '24',
      date: '2025-12-06',
      clockIn: '09:20',
      clockOut: '18:30',
      breaks: [{ start: '12:20', end: '13:20' }],
      status: '退勤済み'
    },
    {
      id: '25',
      date: '2025-12-09',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '26',
      date: '2025-12-10',
      clockIn: '09:15',
      clockOut: '18:10',
      breaks: [{ start: '12:15', end: '13:15' }],
      status: '退勤済み'
    },
    {
      id: '27',
      date: '2025-12-11',
      clockIn: '08:50',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '28',
      date: '2025-12-12',
      clockIn: '09:05',
      clockOut: '18:25',
      breaks: [{ start: '12:05', end: '13:05' }, { start: '15:30', end: '15:45' }],
      status: '退勤済み'
    },
    {
      id: '29',
      date: '2025-12-16',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '30',
      date: '2025-12-17',
      clockIn: '09:10',
      clockOut: '18:15',
      breaks: [{ start: '12:10', end: '13:10' }],
      status: '退勤済み'
    },
    {
      id: '31',
      date: '2025-12-18',
      clockIn: '09:20',
      clockOut: '18:30',
      breaks: [{ start: '12:20', end: '13:20' }],
      status: '退勤済み'
    },
    {
      id: '32',
      date: '2025-12-19',
      clockIn: '08:55',
      clockOut: '17:50',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '33',
      date: '2025-12-20',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '34',
      date: '2025-12-23',
      clockIn: '09:15',
      clockOut: '18:20',
      breaks: [{ start: '12:15', end: '13:15' }],
      status: '退勤済み'
    },
    {
      id: '35',
      date: '2025-12-24',
      clockIn: '09:05',
      clockOut: '18:10',
      breaks: [{ start: '12:05', end: '13:05' }],
      status: '退勤済み'
    },
    {
      id: '36',
      date: '2025-12-26',
      clockIn: '08:50',
      clockOut: '17:45',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '37',
      date: '2025-12-27',
      clockIn: '09:00',
      clockOut: '18:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      status: '退勤済み'
    },
    {
      id: '38',
      date: '2025-12-30',
      clockIn: '09:10',
      clockOut: '18:15',
      breaks: [{ start: '12:10', end: '13:10' }],
      status: '退勤済み'
    }
  ]);
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState<ViewMode>('stamp');
  const [editDate, setEditDate] = useState('');
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editBreaks, setEditBreaks] = useState<Break[]>([]);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [showSummary, setShowSummary] = useState<boolean>(true);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 退勤打刻がされていない日付を取得
  const getMissingClockOutDates = (): string[] => {
    const now = new Date();
    const currentHour = now.getHours();
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
    return new Date().toISOString().split('T')[0];
  };

  const getCurrentTime = () => {
    return new Date().toTimeString().slice(0, 5);
  };

  // 日付を統一フォーマットに変換（YYYY年MM月DD日）
  // 日付フォーマット関数（yyyy/mm/dd形式）

  const handleClockIn = () => {
    const today = getTodayDate();
    const time = getCurrentTime();
    const newLog: AttendanceLog = {
      id: Date.now().toString(),
      date: today,
      clockIn: time,
      clockOut: null,
      breaks: [],
      status: '出勤中'
    };
    setTodayLog(newLog);
    setLogs([newLog, ...logs.filter(log => log.date !== today)]);
  };

  const handleClockOut = () => {
    if (!todayLog) {
      return;
    }
    const time = getCurrentTime();
    const updatedLog: AttendanceLog = {
      ...todayLog,
      clockOut: time,
      status: '退勤済み'
    };
    setTodayLog(updatedLog);
    setLogs(logs.map(log => 
      log.date === getTodayDate() ? updatedLog : log
    ));
  };

  const handleEdit = (log: AttendanceLog) => {
    setSelectedLog(log);
    setEditDate(log.date);
    setEditClockIn(log.clockIn || '');
    setEditClockOut(log.clockOut || '');
    setEditBreaks(log.breaks || []);
    setViewMode('edit');
  };

  const handleSaveEdit = () => {
    if (!editDate || !editClockIn) {
      return;
    }

    let status: AttendanceLog['status'] = '未出勤';
    if (editClockOut) {
      status = '退勤済み';
    } else if (editBreaks.some(b => b.start && !b.end)) {
      status = '休憩中';
    } else if (editClockIn) {
      status = '出勤中';
    }

    const updatedLog: AttendanceLog = {
      id: selectedLog?.id || Date.now().toString(),
      date: editDate,
      clockIn: editClockIn,
      clockOut: editClockOut || null,
      breaks: editBreaks,
      status
    };

    if (selectedLog) {
      setLogs(logs.map(log => log.id === selectedLog.id ? updatedLog : log));
    } else {
      setLogs([...logs, updatedLog]);
    }

    if (editDate === getTodayDate()) {
      setTodayLog(updatedLog);
    }

    setSnackbar({ message: selectedLog ? '打刻を更新しました' : '打刻を登録しました', type: 'success' });
    setViewMode('list');
    setSelectedLog(null);
    setEditDate('');
    setEditClockIn('');
    setEditClockOut('');
    setEditBreaks([]);
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
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;
    monthLogs.forEach(log => {
      if (log.clockIn && log.clockOut) {
        const [inHour, inMinute] = log.clockIn.split(':').map(Number);
        const [outHour, outMinute] = log.clockOut.split(':').map(Number);
        const inMinutes = inHour * 60 + inMinute;
        const outMinutes = outHour * 60 + outMinute;
        
        let breakMinutes = 0;
        if (log.breaks && log.breaks.length > 0) {
          log.breaks.forEach(breakItem => {
            if (breakItem.start && breakItem.end) {
              const [bStartHour, bStartMinute] = breakItem.start.split(':').map(Number);
              const [bEndHour, bEndMinute] = breakItem.end.split(':').map(Number);
              const bStartMinutes = bStartHour * 60 + bStartMinute;
              const bEndMinutes = bEndHour * 60 + bEndMinute;
              breakMinutes += Math.max(0, bEndMinutes - bStartMinutes);
            }
          });
        }
        
        const workMinutes = outMinutes - inMinutes - breakMinutes;
        totalWorkMinutes += workMinutes;
        
        // 残業時間（8時間を超える分）
        const standardWorkMinutes = 8 * 60;
        if (workMinutes > standardWorkMinutes) {
          totalOvertimeMinutes += workMinutes - standardWorkMinutes;
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

  const today = getTodayDate();
  const currentLog = todayLog || logs.find(log => log.date === today);
  const currentStatus: AttendanceLog['status'] =
    currentLog?.status || '未出勤';

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
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: viewMode === 'stamp' ? '#2563eb' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderBottom: viewMode === 'stamp' ? '3px solid #ffffff' : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: viewMode === 'stamp' ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            opacity: viewMode === 'stamp' ? 1 : 0.7,
            textShadow: viewMode === 'stamp'
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : '0 1px 2px rgba(0,0,0,0.25)',
            position: 'relative'
          }}
        >
          打刻
          {missingClockOutDates.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '0.25rem',
              right: '0.25rem',
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
              lineHeight: '1'
            }}>
              !
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('list')}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: viewMode === 'list' ? '#2563eb' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderBottom: viewMode === 'list' ? '3px solid #ffffff' : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: viewMode === 'list' ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            opacity: viewMode === 'list' ? 1 : 0.7,
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
            fontSize: fontSizes.medium,
            marginBottom: isMobile ? '1rem' : '1rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {getStatusMessage(currentStatus)}
          </div>
          <div style={{ marginBottom: isMobile ? '0.75rem' : '0.5rem' }}>
            <p style={{ fontSize: fontSizes.medium, fontWeight: 'bold', color: '#2563eb' }}>
              {formatDate(now.toISOString().split('T')[0])}
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
              disabled={currentLog?.clockIn !== null && currentLog?.clockIn !== undefined}
              onMouseEnter={(e) => {
                if (!currentLog?.clockIn) {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={(e) => {
                if (!currentLog?.clockIn) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: '1rem 2rem',
                backgroundColor: currentLog?.clockIn ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                cursor: currentLog?.clockIn ? 'not-allowed' : 'pointer',
                opacity: currentLog?.clockIn ? 0.6 : 1,
                transition: 'background-color 0.2s, transform 0.2s'
              }}
            >
              出勤
            </button>
            <button
              onClick={handleClockOut}
              disabled={!currentLog?.clockIn || currentLog?.clockOut !== null || currentStatus === '休憩中'}
              onMouseEnter={(e) => {
                if (currentLog?.clockIn && !currentLog?.clockOut && currentStatus !== '休憩中') {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={(e) => {
                if (currentLog?.clockIn && !currentLog?.clockOut && currentStatus !== '休憩中') {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: '1rem 2rem',
                backgroundColor: (!currentLog?.clockIn || currentLog?.clockOut || currentStatus === '休憩中') ? '#9ca3af' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                cursor: (!currentLog?.clockIn || currentLog?.clockOut || currentStatus === '休憩中') ? 'not-allowed' : 'pointer',
                opacity: (!currentLog?.clockIn || currentLog?.clockOut || currentStatus === '休憩中') ? 0.6 : 1,
                transition: 'background-color 0.2s, transform 0.2s'
              }}
            >
              退勤
            </button>
            <button
              onClick={() => {
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
                const time = getCurrentTime();
                const updated: AttendanceLog = {
                  ...(currentLog as AttendanceLog),
                  breaks: [...(currentLog.breaks || []), { start: time, end: null }],
                  status: '休憩中'
                };
                setTodayLog(updated);
                setLogs(logs.map(log => log.id === updated.id ? updated : log));
              }}
              disabled={!currentLog || !currentLog.clockIn || !!currentLog.clockOut || 
                (currentLog.breaks && currentLog.breaks.length > 0 && 
                 currentLog.breaks[currentLog.breaks.length - 1] && 
                 !currentLog.breaks[currentLog.breaks.length - 1].end)}
              onMouseEnter={(e) => {
                const isDisabled = !currentLog || !currentLog.clockIn || !!currentLog.clockOut || 
                  (currentLog.breaks && currentLog.breaks.length > 0 && 
                   currentLog.breaks[currentLog.breaks.length - 1] && 
                   !currentLog.breaks[currentLog.breaks.length - 1].end);
                if (!isDisabled) {
                  e.currentTarget.style.backgroundColor = '#d97706';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={(e) => {
                const isDisabled = !currentLog || !currentLog.clockIn || !!currentLog.clockOut || 
                  (currentLog.breaks && currentLog.breaks.length > 0 && 
                   currentLog.breaks[currentLog.breaks.length - 1] && 
                   !currentLog.breaks[currentLog.breaks.length - 1].end);
                if (!isDisabled) {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: '1rem 2rem',
                backgroundColor: (!currentLog || !currentLog.clockIn || currentLog.clockOut || 
                  (currentLog.breaks && currentLog.breaks.length > 0 && 
                   currentLog.breaks[currentLog.breaks.length - 1] && 
                   !currentLog.breaks[currentLog.breaks.length - 1].end)) ? '#9ca3af' : '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                cursor: (!currentLog || !currentLog.clockIn || currentLog.clockOut || 
                  (currentLog.breaks && currentLog.breaks.length > 0 && 
                   currentLog.breaks[currentLog.breaks.length - 1] && 
                   !currentLog.breaks[currentLog.breaks.length - 1].end)) ? 'not-allowed' : 'pointer',
                opacity: (!currentLog || !currentLog.clockIn || currentLog.clockOut || 
                  (currentLog.breaks && currentLog.breaks.length > 0 && 
                   currentLog.breaks[currentLog.breaks.length - 1] && 
                   !currentLog.breaks[currentLog.breaks.length - 1].end)) ? 0.6 : 1,
                transition: 'background-color 0.2s, transform 0.2s'
              }}
            >
              休憩開始
            </button>
            <button
              onClick={() => {
                if (!currentLog?.breaks || currentLog.breaks.length === 0) {
                  return;
                }
                const lastBreak = currentLog.breaks[currentLog.breaks.length - 1];
                if (lastBreak.end) {
                  return; // すでに終了している
                }
                const time = getCurrentTime();
                const updatedBreaks = [...currentLog.breaks];
                updatedBreaks[updatedBreaks.length - 1] = { ...lastBreak, end: time };
                const updated: AttendanceLog = {
                  ...(currentLog as AttendanceLog),
                  breaks: updatedBreaks,
                  status: '出勤中'
                };
                setTodayLog(updated);
                setLogs(logs.map(log => log.id === updated.id ? updated : log));
              }}
              disabled={!currentLog || !currentLog.breaks || currentLog.breaks.length === 0 || 
                !!(currentLog.breaks[currentLog.breaks.length - 1] && 
                 currentLog.breaks[currentLog.breaks.length - 1].end) || 
                !!currentLog.clockOut}
              onMouseEnter={(e) => {
                const isDisabled = !currentLog || !currentLog.breaks || currentLog.breaks.length === 0 || 
                  !!(currentLog.breaks[currentLog.breaks.length - 1] && 
                   currentLog.breaks[currentLog.breaks.length - 1].end) || 
                  !!currentLog.clockOut;
                if (!isDisabled) {
                  e.currentTarget.style.backgroundColor = '#ea580c';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={(e) => {
                const isDisabled = !currentLog || !currentLog.breaks || currentLog.breaks.length === 0 || 
                  !!(currentLog.breaks[currentLog.breaks.length - 1] && 
                   currentLog.breaks[currentLog.breaks.length - 1].end) || 
                  !!currentLog.clockOut;
                if (!isDisabled) {
                  e.currentTarget.style.backgroundColor = '#f97316';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: '1rem 2rem',
                backgroundColor: (!currentLog || !currentLog.breaks || currentLog.breaks.length === 0 || 
                  (currentLog.breaks[currentLog.breaks.length - 1] && 
                   currentLog.breaks[currentLog.breaks.length - 1].end) || 
                  currentLog.clockOut) ? '#9ca3af' : '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                cursor: (!currentLog || !currentLog.breaks || currentLog.breaks.length === 0 || 
                  (currentLog.breaks[currentLog.breaks.length - 1] && 
                   currentLog.breaks[currentLog.breaks.length - 1].end) || 
                  currentLog.clockOut) ? 'not-allowed' : 'pointer',
                opacity: (!currentLog || !currentLog.breaks || currentLog.breaks.length === 0 || 
                  (currentLog.breaks[currentLog.breaks.length - 1] && 
                   currentLog.breaks[currentLog.breaks.length - 1].end) || 
                  currentLog.clockOut) ? 0.6 : 1,
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
                    <div><strong>出勤:</strong> {formatTime(currentLog.clockIn)}</div>
                    <div><strong>退勤:</strong> {formatTime(currentLog.clockOut)}</div>
                  </div>
                  {currentLog.breaks && currentLog.breaks.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>休憩:</strong>
                      {currentLog.breaks.map((breakItem, index) => (
                        <div key={index} style={{ fontSize: fontSizes.medium, marginLeft: '0.5rem' }}>
                          {formatTime(breakItem.start)} - {breakItem.end ? formatTime(breakItem.end) : '休憩中'}
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
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
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>出勤</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>退勤</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>休憩</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>状態</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLog && (
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem' }}>{formatDate(currentLog.date)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatTime(currentLog.clockIn)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatTime(currentLog.clockOut)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {currentLog.breaks && currentLog.breaks.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {currentLog.breaks.map((breakItem, index) => (
                              <div key={index} style={{ fontSize: fontSizes.medium }}>
                                {formatTime(breakItem.start)} - {breakItem.end ? formatTime(breakItem.end) : '休憩中'}
                              </div>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
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
              <button
                type="button"
                onClick={() => setEditBreaks([...editBreaks, { start: '', end: null }])}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.cursor = 'pointer';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: fontSizes.badge,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s, transform 0.2s'
                }}
              >
                休憩を追加
              </button>
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
                      <button
                        type="button"
                        onClick={() => setEditBreaks(editBreaks.filter((_, i) => i !== index))}
                        style={{
                          padding: '0.5rem',
                          background: 'transparent',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#dc2626',
                          transition: 'background-color 0.2s',
                          boxShadow: 'none',
                          minHeight: 'auto',
                          minWidth: 'auto'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fee2e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="削除"
                      >
                        <DeleteIcon size={20} color="#dc2626" />
                      </button>
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
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
            <button
              onClick={handleCancelEdit}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6b7280';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.cursor = 'pointer';
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s, transform 0.2s'
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveEdit}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.cursor = 'pointer';
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s, transform 0.2s'
              }}
            >
              +登録
            </button>
          </div>
        </div>
      )}

      {/* 出勤簿画面 */}
      {viewMode === 'list' && (
        <div>
          <div style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <h3 style={{ fontSize: isMobile ? '1.125rem' : '0.875rem', margin: 0 }}>
                出勤簿
              </h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
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
            </div>
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{userId || 'ゲスト'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>所定労働日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{statistics.prescribedWorkingDays}日</span>
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{statistics.workingDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>平日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{statistics.weekdayWorkingDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>休日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{statistics.holidayWorkingDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>欠勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{statistics.absenceDays}</span>
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{statistics.totalWorkTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>実残業時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{statistics.totalOvertime}</span>
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
                    {totalPaidLeaveDays}日
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>使用日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold', color: '#000000' }}>
                    {usedPaidLeaveDays}日
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>残有給日数:</span>
                  <span style={{ 
                    fontSize: fontSizes.badge, 
                    fontWeight: 'bold', 
                    color: '#000000'
                  }}>
                    {remainingPaidLeaveDays}日
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
                    {formatDate(paidLeaveExpiryDate)}
                  </div>
                  <div style={{ fontSize: fontSizes.medium, color: '#1e3a8a', marginTop: '0.25rem' }}>
                    上記日付までに消化日付分(残り{remainingPaidLeaveDays}日)の有給を取得してください
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
                    whiteSpace: 'nowrap'
                  }}>勤務状況</th>
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
                    
                    // 労働時間計算
                    let workTime = '-';
                    let overtime = '-';
                    let lateNight = '-';
                    let breakTime = '-';
                    
                    if (log && log.clockIn && log.clockOut) {
                      const [inHour, inMinute] = log.clockIn.split(':').map(Number);
                      const [outHour, outMinute] = log.clockOut.split(':').map(Number);
                      const inMinutes = inHour * 60 + inMinute;
                      const outMinutes = outHour * 60 + outMinute;
                      
                      // 休憩時間計算
                      let breakMinutes = 0;
                      if (log.breaks && log.breaks.length > 0) {
                        log.breaks.forEach(breakItem => {
                          if (breakItem.start && breakItem.end) {
                            const [bStartHour, bStartMinute] = breakItem.start.split(':').map(Number);
                            const [bEndHour, bEndMinute] = breakItem.end.split(':').map(Number);
                            const bStartMinutes = bStartHour * 60 + bStartMinute;
                            const bEndMinutes = bEndHour * 60 + bEndMinute;
                            breakMinutes += Math.max(0, bEndMinutes - bStartMinutes);
                          }
                        });
                      }
                      breakTime = `${String(Math.floor(breakMinutes / 60)).padStart(2, '0')}:${String(breakMinutes % 60).padStart(2, '0')}`;
                      
                      // 労働時間
                      const workMinutes = outMinutes - inMinutes - breakMinutes;
                      const workHours = Math.floor(workMinutes / 60);
                      const workMins = workMinutes % 60;
                      workTime = `${String(workHours).padStart(2, '0')}:${String(workMins).padStart(2, '0')}`;
                      
                      // 残業時間（8時間を超える分）
                      const standardWorkMinutes = 8 * 60;
                      if (workMinutes > standardWorkMinutes) {
                        const overtimeMinutes = workMinutes - standardWorkMinutes;
                        const overtimeHours = Math.floor(overtimeMinutes / 60);
                        const overtimeMins = overtimeMinutes % 60;
                        overtime = `${String(overtimeHours).padStart(2, '0')}:${String(overtimeMins).padStart(2, '0')}`;
                      } else {
                        overtime = '00:00';
                      }
                      
                      // 深夜時間（22時以降の労働時間、簡易的に0:00と表示）
                      lateNight = '00:00';
                    }
                    
                    return (
                      <tr 
                        key={calendarDay.date}
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: needsCorrection ? '#fee2e2' : (isSunday ? '#fef2f2' : isSaturday ? '#eff6ff' : '#ffffff')
                        }}
                      >
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb',
                          color: needsCorrection ? '#dc2626' : (isSunday ? '#dc2626' : isSaturday ? '#2563eb' : '#1f2937'),
                          fontWeight: (needsCorrection || isSunday || isSaturday) ? 'bold' : 'normal',
                          backgroundColor: needsCorrection ? '#fee2e2' : 'transparent'
                        }}>
                          {formatDate(calendarDay.date)}
                          {needsCorrection && (
                            <span style={{
                              marginLeft: '0.25rem',
                              color: '#dc2626',
                              fontWeight: 'bold'
                            }}>
                              (修正必要)
                            </span>
                          )}
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb'
                        }}>
                          {log ? formatTime(log.clockIn) : '-'}
                        </td>
                        <td style={{ 
                          padding: '0.75rem',
                          borderRight: '1px solid #e5e7eb'
                        }}>
                          {log ? formatTime(log.clockOut) : '-'}
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
                          padding: '0.75rem'
                        }}>
                          {log ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: fontSizes.badge,
                                backgroundColor: log.status === '退勤済み' ? '#d1fae5' : '#dbeafe',
                                color: log.status === '退勤済み' ? '#065f46' : '#1e40af'
                              }}>
                                {log.status}
                              </span>
                              <button
                                onClick={() => handleEdit(log)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                修正
                              </button>
                            </div>
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

