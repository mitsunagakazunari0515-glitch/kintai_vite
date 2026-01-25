/**
 * ファイル名: EmployeeAttendance.tsx
 * 画面名: 管理者用出勤簿画面
 * 説明: 管理者が特定の従業員の出勤簿を閲覧・PDF出力する画面
 * 機能:
 *   - 特定従業員の出勤簿表示
 *   - 年月での検索機能
 *   - サマリー情報表示
 *   - PDF出力機能
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Snackbar } from '../../components/Snackbar';
import { ProgressBar } from '../../components/ProgressBar';
import { PdfExportButton } from '../../components/Button';
import { formatDate, parseJSTDateTime, extractTimeFromJST } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { 
  getAttendanceMyRecords,
  AttendanceLog as ApiAttendanceLog,
  Break as ApiBreak,
  AttendanceSummary
} from '../../utils/attendanceApi';
import { getEmployees } from '../../utils/employeeApi';
import { error as logError } from '../../utils/logger';
import { translateApiError } from '../../utils/apiErrorTranslator';

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
 */
const convertApiLogToUiLog = (apiLog: ApiAttendanceLog): AttendanceLog => {
  const extractTime = (dateTimeStr: string | null): string | null => {
    if (!dateTimeStr) return null;
    return extractTimeFromJST(dateTimeStr);
  };

  const convertBreaks = (apiBreaks: ApiBreak[]): Break[] => {
    return apiBreaks.map(apiBreak => ({
      start: extractTime(apiBreak.start) || '',
      end: apiBreak.end ? extractTime(apiBreak.end) : null,
      startIso: apiBreak.start,
      endIso: apiBreak.end || null
    }));
  };

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
    id: apiLog.attendanceId,
    date: apiLog.workDate,
    clockIn: extractTime(apiLog.clockIn),
    clockOut: extractTime(apiLog.clockOut),
    clockInIso: apiLog.clockIn,
    clockOutIso: apiLog.clockOut,
    breaks: convertBreaks(apiLog.breaks),
    status: convertStatus(apiLog.status),
    totalWorkMinutes: apiLog.totalWorkMinutes,
    overtimeMinutes: apiLog.overtimeMinutes,
    lateNightMinutes: apiLog.lateNightMinutes
  };
};

/**
 * 時刻を表示用に変換します（5時未満の場合は「翌朝」を付与）
 */
const formatTimeWithNextDay = (timeJST: string | null): string => {
  if (!timeJST) {
    return '-';
  }
  
  try {
    const date = parseJSTDateTime(timeJST);
    if (!date) return '-';
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    if (hours < 5) {
      return `翌朝${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch {
    return '-';
  }
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
 * 管理者用出勤簿画面コンポーネント。
 */
export const EmployeeAttendance: React.FC = () => {
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('employeeId');
  
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const pdfContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 従業員名を取得
  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!employeeId) return;
      
      try {
        const employees = await getEmployees();
        const employee = employees.find(emp => emp.id === employeeId);
        if (employee) {
          setEmployeeName(`${employee.firstName} ${employee.lastName}`);
        }
      } catch (error) {
        logError('Failed to fetch employee name:', error);
      }
    };

    fetchEmployeeName();
  }, [employeeId]);

  // 出勤簿データを取得
  useEffect(() => {
    const fetchMonthAttendance = async () => {
      if (!employeeId) {
        setSnackbar({ message: '従業員IDが指定されていません。', type: 'error' });
        setTimeout(() => setSnackbar(null), 5000);
        return;
      }

      try {
        setIsLoading(true);

        const year = String(selectedYear);
        const month = String(selectedMonth).padStart(2, '0');
        const response = await getAttendanceMyRecords(year, month, employeeId);
        
        setSummary(response.summary);
        const convertedLogs = response.logs.map(apiLog => convertApiLogToUiLog(apiLog));
        setLogs(convertedLogs);
      } catch (error) {
        logError('Failed to fetch attendance list:', error);
        const errorMessage = translateApiError(error);
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => setSnackbar(null), 5000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthAttendance();
  }, [employeeId, selectedYear, selectedMonth]);

  // カレンダーの日付を生成
  const getCalendarDays = () => {
    const year = selectedYear;
    const month = selectedMonth;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: Array<{ date: string; isCurrentMonth: boolean }> = [];

    // 前月の日付
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = prevMonthLastDay - i;
      days.push({
        date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    // 今月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        isCurrentMonth: true
      });
    }

    // 次月の日付（6週分のカレンダーを埋める）
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      days.push({
        date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    return days;
  };

  const calendarDays = getCalendarDays();

  const getLogByDate = (date: string): AttendanceLog | undefined => {
    return logs.find(log => log.date === date);
  };

  // PDF出力処理
  const handleExportPDF = async () => {
    if (!pdfContentRef.current) {
      setSnackbar({ message: 'PDF出力に失敗しました。', type: 'error' });
      setTimeout(() => setSnackbar(null), 5000);
      return;
    }

    try {
      setIsLoading(true);
      
      // PDF出力用の要素を一時的に表示
      const originalStyle = pdfContentRef.current.style.cssText;
      pdfContentRef.current.style.position = 'fixed';
      pdfContentRef.current.style.left = '0';
      pdfContentRef.current.style.top = '0';
      pdfContentRef.current.style.visibility = 'visible';
      pdfContentRef.current.style.zIndex = '9999';
      pdfContentRef.current.style.backgroundColor = '#ffffff';
      pdfContentRef.current.style.width = '100%';
      pdfContentRef.current.style.padding = '2rem';
      
      // 少し待ってからキャプチャ（レンダリングを待つ）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(pdfContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // 元のスタイルに戻す
      pdfContentRef.current.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      const x = (pdfWidth - imgScaledWidth) / 2;
      const y = (pdfHeight - imgScaledHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgScaledWidth, imgScaledHeight);
      
      const fileName = `出勤簿_${employeeName}_${selectedYear}年${selectedMonth}月.pdf`;
      pdf.save(fileName);
      
      setSnackbar({ message: 'PDFを出力しました。', type: 'success' });
      setTimeout(() => setSnackbar(null), 5000);
    } catch (error) {
      logError('Failed to export PDF:', error);
      setSnackbar({ message: 'PDF出力に失敗しました。', type: 'error' });
      setTimeout(() => setSnackbar(null), 5000);
    } finally {
      setIsLoading(false);
      // エラー時も元のスタイルに戻す
      if (pdfContentRef.current) {
        pdfContentRef.current.style.cssText = '';
      }
    }
  };

  if (!employeeId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>従業員IDが指定されていません。</p>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '1rem' : '1.4rem' }}>
      {isLoading && <ProgressBar isLoading={isLoading} />}
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.05rem', marginBottom: '1rem' }}>
          出勤簿
        </h2>
        
        {/* 年月選択とPDF出力ボタン */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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

          <PdfExportButton
            onClick={handleExportPDF}
            disabled={isLoading}
          />
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{employeeName || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>所定労働日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.scheduledWorkDays ?? '-'}日</span>
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.actualWorkDays ?? '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>平日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.weekdayWorkDays ?? '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>休日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.holidayWorkDays ?? '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>欠勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.absenceDays ?? '-'}</span>
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary ? formatMinutesToTime(summary.actualWorkHours) : '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>実残業時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary ? formatMinutesToTime(summary.actualOvertimeHours) : '-'}</span>
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
                    {summary?.annualPaidLeaveDays ?? '-'}日
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>使用日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold', color: '#000000' }}>
                    {summary?.usedPaidLeaveDays ?? '-'}日
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>残有給日数:</span>
                  <span style={{ 
                    fontSize: fontSizes.badge, 
                    fontWeight: 'bold', 
                    color: '#000000'
                  }}>
                    {summary?.remainingPaidLeaveDays ?? '-'}日
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* サマリー情報と出勤簿テーブル（PDF出力用のrefを追加） */}
        <div ref={pdfContentRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', backgroundColor: '#ffffff' }}>
          {/* タイトル */}
          <h2 style={{ margin: 0, fontSize: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
            出勤簿
          </h2>
          
          {/* サマリー情報 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#ffffff',
            padding: '1rem'
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{employeeName || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>所定労働日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.scheduledWorkDays ?? '-'}日</span>
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.actualWorkDays ?? '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>平日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.weekdayWorkDays ?? '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>休日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.holidayWorkDays ?? '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>欠勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary?.absenceDays ?? '-'}</span>
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary ? formatMinutesToTime(summary.actualWorkHours) : '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>実残業時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{summary ? formatMinutesToTime(summary.actualOvertimeHours) : '-'}</span>
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
                    {summary?.annualPaidLeaveDays ?? '-'}日
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>使用日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold', color: '#000000' }}>
                    {summary?.usedPaidLeaveDays ?? '-'}日
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>残有給日数:</span>
                  <span style={{ 
                    fontSize: fontSizes.badge, 
                    fontWeight: 'bold', 
                    color: '#000000'
                  }}>
                    {summary?.remainingPaidLeaveDays ?? '-'}日
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 出勤簿テーブル */}
          <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '4px', border: '1px solid #d1d5db' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSizes.medium }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #d1d5db' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>日付</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>出勤時刻</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>退勤時刻</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>労働時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>残業時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>深夜時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>休憩時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>勤務状況</th>
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
                      
                      let workTime = '-';
                      let overtime = '-';
                      let lateNight = '-';
                      let breakTime = '-';
                      
                      if (log) {
                        if (log.totalWorkMinutes !== undefined && log.totalWorkMinutes !== null) {
                          workTime = formatMinutesToTime(log.totalWorkMinutes);
                        }
                        
                        if (log.overtimeMinutes !== undefined && log.overtimeMinutes !== null) {
                          overtime = formatMinutesToTime(log.overtimeMinutes);
                        } else {
                          overtime = '00:00';
                        }
                        
                        if (log.lateNightMinutes !== undefined && log.lateNightMinutes !== null) {
                          lateNight = formatMinutesToTime(log.lateNightMinutes);
                        } else {
                          lateNight = '00:00';
                        }
                        
                        if (log.breaks && log.breaks.length > 0) {
                          let breakMinutes = 0;
                          log.breaks.forEach(breakItem => {
                            if (breakItem.startIso && breakItem.endIso) {
                              try {
                                const startDate = breakItem.startIso ? parseJSTDateTime(breakItem.startIso) : null;
                                const endDate = breakItem.endIso ? parseJSTDateTime(breakItem.endIso) : null;
                                if (startDate && endDate) {
                                  const diffMs = endDate.getTime() - startDate.getTime();
                                  const diffMinutes = Math.floor(diffMs / (1000 * 60));
                                  breakMinutes += Math.max(0, diffMinutes);
                                }
                              } catch (error) {
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
                          breakTime = formatMinutesToTime(breakMinutes);
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
                            {formatDate(calendarDay.date)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                            {log?.clockInIso ? formatTimeWithNextDay(log.clockInIso) : '-'}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                            {log?.clockOutIso ? formatTimeWithNextDay(log.clockOutIso) : '-'}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                            {workTime}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                            {overtime}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                            {lateNight}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                            {breakTime}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                            {log?.status || '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 出勤簿テーブル（表示用） */}
        <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '4px', border: '1px solid #d1d5db' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSizes.medium }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #d1d5db' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>日付</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>出勤時刻</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>退勤時刻</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>労働時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>残業時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>深夜時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>休憩時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>勤務状況</th>
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
                    
                    let workTime = '-';
                    let overtime = '-';
                    let lateNight = '-';
                    let breakTime = '-';
                    
                    if (log) {
                      if (log.totalWorkMinutes !== undefined && log.totalWorkMinutes !== null) {
                        workTime = formatMinutesToTime(log.totalWorkMinutes);
                      }
                      
                      if (log.overtimeMinutes !== undefined && log.overtimeMinutes !== null) {
                        overtime = formatMinutesToTime(log.overtimeMinutes);
                      } else {
                        overtime = '00:00';
                      }
                      
                      if (log.lateNightMinutes !== undefined && log.lateNightMinutes !== null) {
                        lateNight = formatMinutesToTime(log.lateNightMinutes);
                      } else {
                        lateNight = '00:00';
                      }
                      
                      if (log.breaks && log.breaks.length > 0) {
                        let breakMinutes = 0;
                        log.breaks.forEach(breakItem => {
                          if (breakItem.startIso && breakItem.endIso) {
                            try {
                              const startDate = breakItem.startIso ? parseJSTDateTime(breakItem.startIso) : null;
                              const endDate = breakItem.endIso ? parseJSTDateTime(breakItem.endIso) : null;
                              if (startDate && endDate) {
                                const diffMs = endDate.getTime() - startDate.getTime();
                                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                                breakMinutes += Math.max(0, diffMinutes);
                              }
                            } catch (error) {
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
                        breakTime = formatMinutesToTime(breakMinutes);
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
                          {formatDate(calendarDay.date)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                          {log?.clockInIso ? formatTimeWithNextDay(log.clockInIso) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                          {log?.clockOutIso ? formatTimeWithNextDay(log.clockOutIso) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                          {workTime}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                          {overtime}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                          {lateNight}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                          {breakTime}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                          {log?.status || '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
