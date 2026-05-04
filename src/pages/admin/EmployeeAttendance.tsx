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

import { useState, useEffect, useRef, useMemo } from 'react';
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
  AttendanceSummary,
  type DailyLaborRow
} from '../../utils/attendanceApi';
import { getEmployees } from '../../utils/employeeApi';
import { error as logError } from '../../utils/logger';
import { translateApiError } from '../../utils/apiErrorTranslator';
import {
  getPayrollClosingYearMonthFromDate,
  enumeratePayrollPeriodDates,
  mergePayrollPeriodSummary,
  formatPayrollPeriodRangeJapanese,
  getPayrollPeriodBounds,
  computePayrollPeriodDayStats,
  prescribedWorkingMinutesFromScheduledWeekdays
} from '../../utils/payrollPeriod';
import { sumAttendanceTableColumnTotals } from '../../utils/attendanceTableTotals';

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
  /** 勤怠メモ（管理者向け出勤簿のみ表示。APIの memo）。 */
  memo?: string | null;
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
    lateNightMinutes: apiLog.lateNightMinutes,
    memo: apiLog.memo ?? null
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

const formatMinutesCell = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return '-';
  return formatMinutesToTime(minutes);
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
  const initialClosingYm = getPayrollClosingYearMonthFromDate(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(initialClosingYm.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialClosingYm.month);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  /** 対象期間の日別労働内訳（API dailyLabor） */
  const [dailyLaborByDate, setDailyLaborByDate] = useState<Record<string, DailyLaborRow>>({});
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

  // 出勤簿データを取得（前月26日〜当月25日＝給与期間。2ヶ月分APIを結合）
  useEffect(() => {
    const fetchMonthAttendance = async () => {
      if (!employeeId) {
        setSnackbar({ message: '従業員IDが指定されていません。', type: 'error' });
        setTimeout(() => setSnackbar(null), 5000);
        return;
      }

      try {
        setIsLoading(true);

        const { startDate, endDate } = getPayrollPeriodBounds(selectedYear, selectedMonth);
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        const yearStr = String(selectedYear);
        const monthStr = String(selectedMonth).padStart(2, '0');
        const prevYearStr = String(prevYear);
        const prevMonthStr = String(prevMonth).padStart(2, '0');

        const [prevRes, currentRes] = await Promise.all([
          getAttendanceMyRecords(prevYearStr, prevMonthStr, employeeId),
          getAttendanceMyRecords(yearStr, monthStr, employeeId)
        ]);

        const filterPeriod = (log: ApiAttendanceLog) => {
          const d = log.workDate;
          return d >= startDate && d <= endDate;
        };
        const periodLogs = [...(prevRes.logs || []), ...(currentRes.logs || [])].filter(filterPeriod);

        const combinedDaily = [...(prevRes.dailyLabor ?? []), ...(currentRes.dailyLabor ?? [])];
        const laborMap: Record<string, DailyLaborRow> = {};
        combinedDaily
          .filter(d => d.workDate >= startDate && d.workDate <= endDate)
          .forEach(d => {
            laborMap[d.workDate] = d;
          });
        setDailyLaborByDate(laborMap);

        setSummary(
          mergePayrollPeriodSummary(currentRes.summary, periodLogs, startDate, endDate, combinedDaily)
        );
        const convertedLogs = periodLogs.map(apiLog => convertApiLogToUiLog(apiLog));
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

  /** 給与期間（前月26〜当月25）の全日を表形式用に列挙 */
  const getCalendarDays = () =>
    enumeratePayrollPeriodDates(selectedYear, selectedMonth).map(date => ({
      date,
      isCurrentMonth: true
    }));

  const calendarDays = getCalendarDays();

  const getLogByDate = (date: string): AttendanceLog | undefined => {
    return logs.find(log => log.date === date);
  };

  const tableTotals = useMemo(() => {
    const dates = enumeratePayrollPeriodDates(selectedYear, selectedMonth);
    return sumAttendanceTableColumnTotals(dates, dailyLaborByDate, d => logs.find(l => l.date === d));
  }, [selectedYear, selectedMonth, dailyLaborByDate, logs]);

  const periodDayStats = useMemo(() => {
    const { startDate, endDate } = getPayrollPeriodBounds(selectedYear, selectedMonth);
    return computePayrollPeriodDayStats(logs, startDate, endDate);
  }, [logs, selectedYear, selectedMonth]);

  // PDF出力処理
  const handleExportPDF = async () => {
    const pdfEl = pdfContentRef.current;
    if (!pdfEl) {
      setSnackbar({ message: 'PDF出力に失敗しました。', type: 'error' });
      setTimeout(() => setSnackbar(null), 5000);
      return;
    }

    // 変更前のインラインスタイル（画面外配置用）。finally で必ず戻す（空文字にすると React が再適用せず二重表示になる）
    const styleSnapshot = pdfEl.style.cssText;

    try {
      setIsLoading(true);

      // PDF出力用の要素を一時的に表示
      pdfEl.style.position = 'fixed';
      pdfEl.style.left = '0';
      pdfEl.style.top = '0';
      pdfEl.style.visibility = 'visible';
      pdfEl.style.zIndex = '9999';
      pdfEl.style.backgroundColor = '#ffffff';
      pdfEl.style.width = '100%';
      pdfEl.style.padding = '2rem';

      // 少し待ってからキャプチャ（レンダリングを待つ）
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(pdfEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // キャプチャ直後に画面外へ戻す（PDF生成失敗時は finally でも同様に復元）
      pdfEl.style.cssText = styleSnapshot;

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
      if (pdfContentRef.current) {
        pdfContentRef.current.style.cssText = styleSnapshot;
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
        <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.05rem', marginBottom: '0.5rem' }}>
          出勤簿
        </h2>
        <p style={{
          margin: '0 0 1rem 0',
          fontSize: fontSizes.medium,
          color: '#4b5563'
        }}>
          対象期間（前月26日〜当月25日）: {formatPayrollPeriodRangeJapanese(selectedYear, selectedMonth)}
        </p>
        
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
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>締め月:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{selectedYear}年{selectedMonth}月</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>氏名:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{employeeName || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>所定労働日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{periodDayStats.prescribedWorkingDays}日</span>
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{periodDayStats.workingDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>平日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{periodDayStats.weekdayWorkDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>休日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{periodDayStats.holidayWorkingDays}</span>
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
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>規定稼働時間（所定労働日数×7:30）:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(
                      prescribedWorkingMinutesFromScheduledWeekdays(periodDayStats.prescribedWorkingDays)
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>稼働時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.laborMinutes)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>実残業時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.overtimeMinutes)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>深夜残業時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.lateNightMinutes)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>休憩時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.breakMinutes)}
                  </span>
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
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>締め月:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{selectedYear}年{selectedMonth}月</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>氏名:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{employeeName || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>所定労働日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{periodDayStats.prescribedWorkingDays}日</span>
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
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{periodDayStats.workingDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>平日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{periodDayStats.weekdayWorkDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>休日出勤日数:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>{periodDayStats.holidayWorkingDays}</span>
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
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>規定稼働時間（所定労働日数×7:30）:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(
                      prescribedWorkingMinutesFromScheduledWeekdays(periodDayStats.prescribedWorkingDays)
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>打刻労働（合計）:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.stampMinutes)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>有給時間（換算）:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.paidLeaveMinutes)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>稼働時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.laborMinutes)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>実残業時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.overtimeMinutes)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>深夜残業時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.lateNightMinutes)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>休憩時間:</span>
                  <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    {formatMinutesToTime(tableTotals.breakMinutes)}
                  </span>
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
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>打刻労働</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>有給時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>稼働時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>残業時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>深夜時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>休憩時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>勤務状況</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', minWidth: '120px' }}>メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {calendarDays
                    .filter(day => day.isCurrentMonth)
                    .map((calendarDay) => {
                      const log = getLogByDate(calendarDay.date);
                      const dl = dailyLaborByDate[calendarDay.date];
                      const date = new Date(calendarDay.date);
                      const dayOfWeek = date.getDay();
                      const isSunday = dayOfWeek === 0;
                      const isSaturday = dayOfWeek === 6;
                      
                      let stampWork = '-';
                      let paidLeaveDisp = '-';
                      let laborTotal = '-';
                      let overtime = '-';
                      let lateNight = '-';
                      let breakTime = '-';
                      
                      if (dl) {
                        stampWork = formatMinutesCell(dl.timeRecordMinutes);
                        paidLeaveDisp = formatMinutesToTime(dl.paidLeaveMinutes);
                        laborTotal = formatMinutesToTime(dl.laborMinutes);
                      } else if (log) {
                        const tw = log.totalWorkMinutes;
                        if (tw !== undefined && tw !== null) {
                          stampWork = formatMinutesToTime(tw);
                          laborTotal = formatMinutesToTime(tw);
                        }
                      }
                      
                      if (log) {
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
                            {stampWork}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                            {paidLeaveDisp}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                            {laborTotal}
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
                          <td style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            backgroundColor: 'transparent',
                            maxWidth: '240px',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            color: '#374151',
                            fontSize: fontSizes.small
                          }}>
                            {log?.memo && String(log.memo).trim() !== '' ? log.memo : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    <tr
                      style={{
                        borderTop: '2px solid #d1d5db',
                        backgroundColor: '#f3f4f6',
                        fontWeight: 'bold'
                      }}
                    >
                      <td style={{ padding: '0.75rem', borderRight: '1px solid #e5e7eb', color: '#111827' }}>小計</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>—</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>—</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.stampMinutes)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.paidLeaveMinutes)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.laborMinutes)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.overtimeMinutes)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.lateNightMinutes)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.breakMinutes)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>—</td>
                      <td style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: fontSizes.small }}>—</td>
                    </tr>
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
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>打刻労働</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>有給時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>稼働時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>残業時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>深夜時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>休憩時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>勤務状況</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', minWidth: '120px' }}>メモ</th>
                </tr>
              </thead>
              <tbody>
                {calendarDays
                  .filter(day => day.isCurrentMonth)
                  .map((calendarDay) => {
                    const log = getLogByDate(calendarDay.date);
                    const dl = dailyLaborByDate[calendarDay.date];
                    const date = new Date(calendarDay.date);
                    const dayOfWeek = date.getDay();
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;
                    
                    let stampWork = '-';
                    let paidLeaveDisp = '-';
                    let laborTotal = '-';
                    let overtime = '-';
                    let lateNight = '-';
                    let breakTime = '-';
                    
                    if (dl) {
                      stampWork = formatMinutesCell(dl.timeRecordMinutes);
                      paidLeaveDisp = formatMinutesToTime(dl.paidLeaveMinutes);
                      laborTotal = formatMinutesToTime(dl.laborMinutes);
                    } else if (log) {
                      const tw = log.totalWorkMinutes;
                      if (tw !== undefined && tw !== null) {
                        stampWork = formatMinutesToTime(tw);
                        laborTotal = formatMinutesToTime(tw);
                      }
                    }
                    
                    if (log) {
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
                          {stampWork}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                          {paidLeaveDisp}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: 'transparent' }}>
                          {laborTotal}
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
                        <td style={{
                          padding: '0.75rem',
                          textAlign: 'left',
                          backgroundColor: 'transparent',
                          maxWidth: '280px',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          color: '#374151',
                          fontSize: fontSizes.small
                        }}>
                          {log?.memo && String(log.memo).trim() !== '' ? log.memo : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr
                    style={{
                      borderTop: '2px solid #d1d5db',
                      backgroundColor: '#f3f4f6',
                      fontWeight: 'bold'
                    }}
                  >
                    <td style={{ padding: '0.75rem', borderRight: '1px solid #e5e7eb', color: '#111827' }}>小計</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>—</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>—</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.stampMinutes)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.paidLeaveMinutes)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.laborMinutes)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.overtimeMinutes)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.lateNightMinutes)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#111827' }}>{formatMinutesToTime(tableTotals.breakMinutes)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>—</td>
                    <td style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: fontSizes.small }}>—</td>
                  </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
