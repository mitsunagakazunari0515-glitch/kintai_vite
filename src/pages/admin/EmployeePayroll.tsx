/**
 * ファイル名: EmployeePayroll.tsx
 * 画面名: 従業員給与明細画面
 * 説明: 特定の従業員の給与明細を表示・編集する画面
 * 機能:
 *   - 給与明細のプレビュー表示
 *   - 給与明細の編集（基本情報は編集不可）
 *   - PDF出力機能
 *   - 年月での検索機能
 *   - 過去の明細一覧表示
 *   - 手当マスタからの参照
 *   - 控除マスタからの参照
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { EditIcon } from '../../components/Icons';
import { NewRegisterButton, ViewButton, PdfExportButton, CancelButton, RegisterButton, UpdateButton } from '../../components/Button';
import { formatCurrency } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';
import { dummyAllowances, dummyDeductions, getPayrollRecordsByEmployeeId } from '../../data/dummyData';

/**
 * 手当を表すインターフェース。
 */
interface Allowance {
  /** 手当ID。 */
  id: string;
  /** 手当名。 */
  name: string;
  /** 手当の表示色（16進数カラーコード）。 */
  color: string;
}

/**
 * 控除を表すインターフェース。
 */
interface Deduction {
  /** 控除ID。 */
  id: string;
  /** 控除名。 */
  name: string;
}

/**
 * 給与明細の詳細情報を表すインターフェース。
 */
interface PayrollDetail {
  /** 出勤日数。 */
  workingDays: number;
  /** 休日出勤日数。 */
  holidayWork: number;
  /** 有給休暇日数。 */
  paidLeave: number;
  /** 有給残日数。 */
  paidLeaveRemaining: number;
  /** 有給残の時点（日付文字列）。 */
  paidLeaveRemainingDate: string;
  /** 普通残業時間。 */
  normalOvertime: number;
  /** 深夜残業時間。 */
  lateNightOvertime: number;
  /** 基本給。 */
  baseSalary: number;
  /** 時間外手当。 */
  overtimeAllowance: number;
  /** 深夜手当。 */
  lateNightAllowance: number;
  /** 食事手当。 */
  mealAllowance: number;
  /** 手当IDをキーとした金額のマップ。 */
  allowances: { [key: string]: number };
  /** 総支給額。 */
  totalEarnings: number;
  /** 控除IDをキーとした金額のマップ。 */
  deductions: { [key: string]: number };
  /** 控除合計。 */
  totalDeductions: number;
  /** 差引支給額。 */
  netPay: number;
}

/**
 * 給与明細レコードを表すインターフェース。
 */
interface PayrollRecord {
  /** レコードID。 */
  id: string;
  /** 従業員ID。 */
  employeeId: string;
  /** 従業員名。 */
  employeeName: string;
  /** 会社名。 */
  companyName: string;
  /** 給与期間。 */
  period: string;
  /** 給与明細の詳細情報。 */
  detail: PayrollDetail;
  /** 更新日時。 */
  updatedAt?: string;
}

/**
 * 表示モードを表す型。
 */
type ViewMode = 'list' | 'preview' | 'edit' | 'new';

/**
 * 従業員給与明細画面コンポーネント。
 * 特定の従業員の給与明細を表示・編集します。
 * 給与明細のプレビュー表示、編集、PDF出力、年月での検索機能を提供します。
 *
 * @returns {JSX.Element} 従業員給与明細画面コンポーネント。
 */
export const EmployeePayroll: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [previousViewMode, setPreviousViewMode] = useState<ViewMode>('list'); // 編集画面に入る前のviewModeを記録
  const [newPeriod, setNewPeriod] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const payslipRef = useRef<HTMLDivElement>(null);
  
  const [searchFiscalYear, setSearchFiscalYear] = useState<number>(getCurrentFiscalYear());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 手当マスタ（実際の実装では共有状態管理やAPIから取得）
  const [allowances] = useState<Allowance[]>(dummyAllowances);

  // 控除マスタ（実際の実装では共有状態管理やAPIから取得）
  const [deductions] = useState<Deduction[]>(dummyDeductions);

  // ダミーデータ（実際の実装ではAPIから取得）
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(
    getPayrollRecordsByEmployeeId(employeeId || '').map(record => ({
      ...record,
      updatedAt: record.updatedAt || record.createdAt,
      detail: {
        ...record.detail,
        allowances: record.detail.allowances || {},
        deductions: record.detail.deductions || {}
      }
    }))
  );

  const [formData, setFormData] = useState<PayrollDetail>(payrollRecords[0]?.detail || {
    workingDays: 0,
    holidayWork: 0,
    paidLeave: 0,
    paidLeaveRemaining: 0,
    paidLeaveRemainingDate: '',
    normalOvertime: 0,
    lateNightOvertime: 0,
    baseSalary: 0,
    overtimeAllowance: 0,
    lateNightAllowance: 0,
    mealAllowance: 0,
    allowances: {},
    totalEarnings: 0,
    deductions: {},
    totalDeductions: 0,
    netPay: 0
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ブラウザバック時の処理
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { 
        viewMode?: ViewMode; 
        recordId?: string; 
        previousViewMode?: ViewMode;
      } | null;
      
      if (state && state.viewMode) {
        // 履歴の状態に基づいて画面を復元
        setViewMode(state.viewMode);
        
        // previousViewModeも復元（編集画面から戻る場合に必要）
        if (state.previousViewMode) {
          setPreviousViewMode(state.previousViewMode);
        }
        
        if (state.recordId) {
          const record = payrollRecords.find(r => r.id === state.recordId);
          if (record) {
            setSelectedRecord(record);
            setFormData(record.detail);
          }
        } else {
          setSelectedRecord(null);
        }
      } else {
        // 履歴がない場合は一覧に戻る
        setViewMode('list');
        setSelectedRecord(null);
        setPreviousViewMode('list');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [payrollRecords]);

  useEffect(() => {
    // 総支給額と控除合計、差引支給額を自動計算
    const allowanceTotal = Object.values(formData.allowances).reduce((sum, amount) => sum + amount, 0);
    const totalEarnings = formData.baseSalary + 
      formData.overtimeAllowance + 
      formData.lateNightAllowance + 
      formData.mealAllowance + 
      allowanceTotal;
    
    const deductionTotal = Object.values(formData.deductions).reduce((sum, amount) => sum + amount, 0);
    const netPay = totalEarnings - deductionTotal;

    setFormData(prev => ({
      ...prev,
      totalEarnings,
      totalDeductions: deductionTotal,
      netPay
    }));
  }, [
    formData.baseSalary,
    formData.overtimeAllowance,
    formData.lateNightAllowance,
    formData.mealAllowance,
    formData.allowances,
    formData.deductions
  ]);


  const handleView = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setFormData(record.detail);
    setViewMode('preview');
    // ブラウザの履歴に追加
    window.history.pushState({ viewMode: 'preview', recordId: record.id }, '', window.location.pathname);
  };

  const handleEdit = (record: PayrollRecord) => {
    // 編集画面に入る前のviewModeを記録（一覧からかプレビューからかを判定するため）
    const prevMode = viewMode;
    setPreviousViewMode(prevMode);
    setSelectedRecord(record);
    setFormData(record.detail);
    setViewMode('edit');
    // ブラウザの履歴に追加（previousViewModeも保存）
    window.history.pushState({ 
      viewMode: 'edit', 
      recordId: record.id,
      previousViewMode: prevMode 
    }, '', window.location.pathname);
  };

  const handleNew = () => {
    // 新規登録モードに切り替え
    setViewMode('new');
    setSelectedRecord(null);
    // 初期データを設定
    setFormData({
      workingDays: 0,
      holidayWork: 0,
      paidLeave: 0,
      paidLeaveRemaining: 0,
      paidLeaveRemainingDate: '',
      normalOvertime: 0,
      lateNightOvertime: 0,
      baseSalary: 0,
      overtimeAllowance: 0,
      lateNightAllowance: 0,
      mealAllowance: 0,
      allowances: {},
      totalEarnings: 0,
      deductions: {},
      totalDeductions: 0,
      netPay: 0
    });
    // ブラウザの履歴に追加
    window.history.pushState({ viewMode: 'new' }, '', window.location.pathname);
  };

  const handleSave = () => {
    if (viewMode === 'new') {
      // 新規登録
      const newPeriodString = `${newPeriod.year}年 ${newPeriod.month}月`;
      
      // 同じ期間のレコードが既に存在するかチェック
      const existingRecord = payrollRecords.find(record => 
        record.employeeId === employeeId && record.period === newPeriodString
      );
      
      if (existingRecord) {
        setSnackbar({ message: `${newPeriodString}の給与明細は既に登録されています。`, type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
        return;
      }
      
      const newRecord: PayrollRecord = {
        id: `payroll_${Date.now()}`,
        employeeId: employeeId || '',
        employeeName: '山田太郎', // 実際の実装では従業員情報から取得
        companyName: '株式会社A・1インテリア',
        period: newPeriodString,
        detail: formData,
        updatedAt: new Date().toISOString()
      };
      setPayrollRecords([...payrollRecords, newRecord]);
      setSelectedRecord(null);
      setViewMode('list');
      // ブラウザの履歴に追加
      window.history.pushState({ viewMode: 'list' }, '', window.location.pathname);
      setSnackbar({ message: '給与明細を登録しました', type: 'success' });
      setTimeout(() => setSnackbar(null), 3000);
    } else if (selectedRecord) {
      // 更新
      const updatedRecord: PayrollRecord = {
        ...selectedRecord,
        detail: formData,
        updatedAt: new Date().toISOString()
      };
      setPayrollRecords(payrollRecords.map(r => 
        r.id === selectedRecord.id ? updatedRecord : r
      ));
      setSelectedRecord(updatedRecord);
      
      // 編集画面に入る前のviewModeに戻る（一覧からなら一覧、プレビューからならプレビュー）
      const returnViewMode = previousViewMode === 'list' ? 'list' : 'preview';
      setViewMode(returnViewMode);
      
      // ブラウザの履歴に追加
      if (returnViewMode === 'list') {
        window.history.pushState({ viewMode: 'list' }, '', window.location.pathname);
      } else {
        window.history.pushState({ viewMode: 'preview', recordId: updatedRecord.id }, '', window.location.pathname);
      }
      
      setSnackbar({ message: '給与明細を更新しました', type: 'success' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const handleCancel = () => {
    if (viewMode === 'new') {
      setViewMode('list');
      setSelectedRecord(null);
      // ブラウザの履歴に追加
      window.history.pushState({ viewMode: 'list' }, '', window.location.pathname);
    } else if (viewMode === 'edit' && selectedRecord) {
      // 編集画面から戻る場合は、編集前の画面（previousViewMode）に戻る
      const returnViewMode = previousViewMode === 'list' ? 'list' : 'preview';
      setViewMode(returnViewMode);
      
      if (returnViewMode === 'preview') {
        // プレビューに戻る場合は、selectedRecordを保持
        setFormData(selectedRecord.detail);
        window.history.pushState({ viewMode: 'preview', recordId: selectedRecord.id }, '', window.location.pathname);
      } else {
        // 一覧に戻る場合は、selectedRecordをクリア
        setSelectedRecord(null);
        window.history.pushState({ viewMode: 'list' }, '', window.location.pathname);
      }
    } else {
      setViewMode('list');
      setSelectedRecord(null);
      // ブラウザの履歴に追加
      window.history.pushState({ viewMode: 'list' }, '', window.location.pathname);
    }
  };

  const handleExportPDF = async () => {
    if (!payslipRef.current || !selectedRecord) return;

    try {
      const canvas = await html2canvas(payslipRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${selectedRecord.employeeName}_${selectedRecord.period.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF出力エラー:', error);
      alert('PDF出力に失敗しました');
    }
  };


  // 期間文字列から年月を抽出してソート用の数値を取得
  const getPeriodSortValue = (period: string): number => {
    const yearMatch = period.match(/(\d{4})年/);
    const monthMatch = period.match(/(\d{1,2})月/);
    if (!yearMatch || !monthMatch) return 0;
    
    const year = parseInt(yearMatch[1], 10);
    const month = parseInt(monthMatch[1], 10);
    
    // 年度順（4月〜3月）でソートするため、4月を0、3月を11として扱う
    // 例: 2025年4月 = 202500, 2025年5月 = 202501, ..., 2026年3月 = 202511
    const fiscalMonth = month >= 4 ? month - 4 : month + 8;
    const fiscalYear = month >= 4 ? year : year - 1;
    
    return fiscalYear * 100 + fiscalMonth;
  };

  // period（例: "2025年 10月"）から年度を判定する関数
  const getFiscalYearFromPeriod = (period: string): number | null => {
    const match = period.match(/(\d{4})年\s*(\d{1,2})月/);
    if (!match) return null;
    
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    
    // 4月以降は当年、3月までは前年
    return month >= 4 ? year : year - 1;
  };

  const filteredRecords = payrollRecords.filter(record => {
    const recordFiscalYear = getFiscalYearFromPeriod(record.period);
    return recordFiscalYear === searchFiscalYear;
  });

  // ソート処理
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (!sortKey) {
      // ソートキーが指定されていない場合は、デフォルトで期間の降順
      const aValue = getPeriodSortValue(a.period);
      const bValue = getPeriodSortValue(b.period);
      return bValue - aValue;
    }
    
    let aValue: any;
    let bValue: any;
    
    if (sortKey === 'period') {
      aValue = getPeriodSortValue(a.period);
      bValue = getPeriodSortValue(b.period);
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (sortKey === 'totalEarnings') {
      aValue = a.detail.totalEarnings || 0;
      bValue = b.detail.totalEarnings || 0;
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (sortKey === 'totalDeductions') {
      aValue = a.detail.totalDeductions || 0;
      bValue = b.detail.totalDeductions || 0;
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (sortKey === 'netPay') {
      aValue = a.detail.netPay || 0;
      bValue = b.detail.netPay || 0;
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (sortKey === 'updatedAt') {
      aValue = a.updatedAt || '';
      bValue = b.updatedAt || '';
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  // ソートアイコンを取得
  const getSortIcon = (key: string) => {
    if (sortKey !== key) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // 期間文字列から年月を抽出
  const extractYearMonthFromPeriod = (period: string): { year: number; month: number } | null => {
    const yearMatch = period.match(/(\d{4})年/);
    const monthMatch = period.match(/(\d{1,2})月/);
    if (!yearMatch || !monthMatch) return null;
    return {
      year: parseInt(yearMatch[1], 10),
      month: parseInt(monthMatch[1], 10)
    };
  };

  // プレビュー画面で選択中の年月
  const [previewYearMonth, setPreviewYearMonth] = useState<{ year: number; month: number } | null>(null);

  // プレビュー画面で年月が変更されたときの処理
  useEffect(() => {
    if (viewMode === 'preview' && selectedRecord) {
      const yearMonth = extractYearMonthFromPeriod(selectedRecord.period);
      if (yearMonth) {
        setPreviewYearMonth(yearMonth);
      }
    }
  }, [viewMode, selectedRecord]);

  // 年月変更時の処理
  const handlePreviewYearMonthChange = (year: number, month: number) => {
    setPreviewYearMonth({ year, month });
    const periodString = `${year}年 ${month}月`;
    const foundRecord = payrollRecords.find(
      record => record.employeeId === employeeId && record.period === periodString
    );
    if (foundRecord) {
      setSelectedRecord(foundRecord);
      window.history.pushState({ viewMode: 'preview', recordId: foundRecord.id }, '', window.location.pathname);
    } else {
      setSnackbar({ message: `${periodString}の給与明細が見つかりません`, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const currentRecord = viewMode === 'new' ? 
    { 
      id: '',
      employeeId: employeeId || '',
      employeeName: payrollRecords[0]?.employeeName || '従業員',
      companyName: '株式会社A・1インテリア',
      period: `${newPeriod.year}年 ${newPeriod.month}月`,
      detail: formData
    } :
    (selectedRecord ? 
      (viewMode === 'preview' ? selectedRecord : { ...selectedRecord, detail: formData }) : 
      null);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%' }}>
      {/* スナックバー */}
      {snackbar && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: snackbar.type === 'error' ? '#ef4444' : '#10b981',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            minWidth: '300px',
            maxWidth: '90%',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <div style={{ flex: 1, fontWeight: 'bold' }}>
            {snackbar.message}
          </div>
          <button
            onClick={() => setSnackbar(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: 0,
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none',
              minHeight: 'auto',
              minWidth: 'auto'
            }}
          >
            ×
          </button>
        </div>
      )}
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: isMobile ? '1rem' : '1.5rem',
        marginBottom: isMobile ? '1rem' : '1.4rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.05rem' }}>
          {payrollRecords[0]?.employeeName || '従業員'} - {
            viewMode === 'preview' ? '給与明細書' :
            viewMode === 'new' ? '給与明細登録' :
            viewMode === 'edit' ? '給与明細編集' :
            '給与明細一覧'
          }
        </h2>
        {viewMode === 'list' && (
          <NewRegisterButton
            onClick={handleNew}
          />
        )}
        {viewMode === 'preview' && currentRecord && previewYearMonth && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: isMobile ? '0.875rem' : '0.7rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              年月:
            </label>
            <input
              type="number"
              value={previewYearMonth.year}
              onChange={(e) => {
                const year = Number(e.target.value);
                handlePreviewYearMonthChange(year, previewYearMonth.month);
              }}
              min="2000"
              max="2100"
              style={{
                width: '80px',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: fontSizes.input,
                boxSizing: 'border-box'
              }}
            />
            <span style={{ fontSize: isMobile ? '0.875rem' : '0.7rem' }}>年</span>
            <select
              value={previewYearMonth.month}
              onChange={(e) => {
                const month = Number(e.target.value);
                handlePreviewYearMonthChange(previewYearMonth.year, month);
              }}
              style={{
                width: '80px',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: fontSizes.input,
                boxSizing: 'border-box',
                backgroundColor: 'white'
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 一覧画面 */}
      {viewMode === 'list' && (
        <div style={{ paddingBottom: isMobile ? '100px' : '120px' }}>
          {/* 検索条件 */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '0.75rem',
            borderRadius: '8px',
            marginBottom: '0.5rem'
          }}>
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, maxWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: isMobile ? '0.875rem' : '0.7rem' }}>
                  年度
                </label>
                <input
                  type="number"
                  value={searchFiscalYear}
                  onChange={(e) => setSearchFiscalYear(Number(e.target.value))}
                  min="2000"
                  max="2100"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: fontSizes.input,
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: fontSizes.small, color: '#6b7280', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                  {searchFiscalYear}年度（{searchFiscalYear}年4月 〜 {searchFiscalYear + 1}年3月）
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: isMobile ? '0.875rem' : '0.7rem', opacity: 0, height: '1.25rem' }}>
                  年度
                </label>
                <button
                  onClick={() => {
                    setSearchFiscalYear(getCurrentFiscalYear());
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'none',
                    minHeight: 'auto',
                    minWidth: 'auto'
                  }}
                >
                  今年度に戻す
                </button>
              </div>
              <div style={{ 
                fontSize: fontSizes.badge,
                color: '#6b7280',
                flex: isMobile ? '1' : '0 0 auto',
                alignSelf: isMobile ? 'flex-start' : 'flex-end',
                paddingBottom: isMobile ? '0' : '0.25rem',
                minWidth: isMobile ? '100%' : 'auto'
              }}>
                検索結果: {sortedRecords.length}件
              </div>
            </div>
          </div>

          {/* 給与明細一覧 */}
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            {sortedRecords.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                給与明細が見つかりません
              </p>
            ) : isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sortedRecords.map((record) => (
                  <div
                    key={record.id}
                    style={{
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                          {record.period}
                        </div>
                        <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                          差引支給額: {formatCurrency(record.detail.netPay)}
                        </div>
                        <div style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>
                          更新日時: {record.updatedAt ? new Date(record.updatedAt).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        <ViewButton
                          onClick={() => handleView(record)}
                          title="給与明細を閲覧"
                        />
                        <button
                          onClick={() => handleEdit(record)}
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
                            color: '#10b981',
                            transition: 'background-color 0.2s',
                            boxShadow: 'none',
                            minHeight: 'auto',
                            minWidth: 'auto'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="編集"
                        >
                          <EditIcon size={28} color="#10b981" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                overflowX: 'auto',
                maxHeight: isMobile ? '400px' : 'calc(100vh - 400px)',
                overflowY: 'auto',
                flex: 1,
                padding: isMobile ? '1rem' : '0'
              }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '600px', border: '2px solid #e5e7eb' }}>
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
                        onClick={() => handleSort('period')}
                      >
                        {getSortIcon('period')} 期間
                      </th>
                      <th 
                        style={{ padding: '0.75rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('totalEarnings')}
                      >
                        {getSortIcon('totalEarnings')} 総支給額
                      </th>
                      <th 
                        style={{ padding: '0.75rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('totalDeductions')}
                      >
                        {getSortIcon('totalDeductions')} 控除合計
                      </th>
                      <th 
                        style={{ padding: '0.75rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('netPay')}
                      >
                        {getSortIcon('netPay')} 差引支給額
                      </th>
                      <th 
                        style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('updatedAt')}
                      >
                        {getSortIcon('updatedAt')} 更新日時
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>明細詳細</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>編集</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((record) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{record.period}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {formatCurrency(record.detail.totalEarnings)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {formatCurrency(record.detail.totalDeductions)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatCurrency(record.detail.netPay)}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {record.updatedAt ? new Date(record.updatedAt).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <ViewButton
                            onClick={() => handleView(record)}
                            title="給与明細を閲覧"
                          />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleEdit(record)}
                            style={{
                              padding: '0.75rem',
                              background: 'transparent',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#2563eb',
                              transition: 'background-color 0.2s',
                              boxShadow: 'none',
                              minHeight: 'auto',
                              minWidth: 'auto'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#eff6ff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="編集"
                          >
                            <EditIcon size={28} color="#2563eb" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          {/* 一覧画面のフッター */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            padding: isMobile ? '1rem' : '1.5rem',
            borderTop: '1px solid #e5e7eb',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <CancelButton
              onClick={() => navigate('/admin/employees')}
              style={{ whiteSpace: 'nowrap' }}
            >
              ←戻る
            </CancelButton>
          </div>
        </div>
      )}

      {/* プレビュー・編集画面 */}
      {(viewMode === 'preview' || viewMode === 'edit' || viewMode === 'new') && currentRecord && (
        <div style={{ paddingBottom: isMobile ? '100px' : '120px' }}>
          {viewMode === 'new' && (
            <div style={{
              backgroundColor: '#eff6ff',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #3b82f6'
            }}>
              <h3 style={{ margin: '0 0 0.7rem 0', fontSize: isMobile ? '1.125rem' : '0.875rem', color: '#1e40af' }}>
                新規給与明細登録
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: isMobile ? '0.875rem' : '0.7rem' }}>
                    年
                  </label>
                  <input
                    type="number"
                    value={newPeriod.year}
                    onChange={(e) => setNewPeriod({ ...newPeriod, year: Number(e.target.value) })}
                    min="2000"
                    max="2100"
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
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: isMobile ? '0.875rem' : '0.7rem' }}>
                    月
                  </label>
                  <select
                    value={newPeriod.month}
                    onChange={(e) => setNewPeriod({ ...newPeriod, month: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: fontSizes.input,
                      boxSizing: 'border-box'
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          {/* プレビュー画面 */}
          {viewMode === 'preview' && (
            <div ref={payslipRef} style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              fontFamily: 'sans-serif',
              color: '#1f2937'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>給与明細書</h1>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {currentRecord.companyName}
                  </div>
                  <div style={{ fontSize: fontSizes.large }}>
                    氏名 {currentRecord.employeeName}様
                  </div>
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                  {currentRecord.period}
                </div>
              </div>

              {/* 勤務セクション */}
              <div style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f3f4f6', padding: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>
                  勤務
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', padding: '1rem' }}>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>出勤日数</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{currentRecord.detail.workingDays}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>休日出勤</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{currentRecord.detail.holidayWork}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>有給休暇</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{currentRecord.detail.paidLeave}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>有給残</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                      {currentRecord.detail.paidLeaveRemaining}
                      {currentRecord.detail.paidLeaveRemainingDate && ` (${currentRecord.detail.paidLeaveRemainingDate}時点)`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>普通残業</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{String(currentRecord.detail.normalOvertime).padStart(2, '0')}:00</div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>深夜残業</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{String(currentRecord.detail.lateNightOvertime).padStart(2, '0')}:00</div>
                  </div>
                </div>
              </div>

              {/* 支給・控除セクション（横並び） */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexDirection: isMobile ? 'column' : 'row' }}>
                {/* 支給セクション */}
                <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f3f4f6', padding: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>
                    支給
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                      <div>基本給</div>
                      <div style={{ fontWeight: 'bold' }}>{formatCurrency(currentRecord.detail.baseSalary)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                      <div>時間外手当</div>
                      <div style={{ fontWeight: 'bold' }}>{formatCurrency(currentRecord.detail.overtimeAllowance)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                      <div>深夜手当</div>
                      <div style={{ fontWeight: 'bold' }}>{formatCurrency(currentRecord.detail.lateNightAllowance)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                      <div>食事手当</div>
                      <div style={{ fontWeight: 'bold' }}>{formatCurrency(currentRecord.detail.mealAllowance)}</div>
                    </div>
                    {/* 手当マスタから動的に表示 */}
                    {allowances.map(allowance => {
                      const amount = currentRecord.detail.allowances[allowance.id] || 0;
                      if (amount === 0) return null;
                      return (
                        <div key={allowance.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                          <div>{allowance.name}</div>
                          <div style={{ fontWeight: 'bold' }}>{formatCurrency(amount)}</div>
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.5rem', borderTop: '2px solid #1f2937' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>総支給額</div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{formatCurrency(currentRecord.detail.totalEarnings)}</div>
                    </div>
                  </div>
                </div>

                {/* 控除セクション */}
                <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f3f4f6', padding: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>
                    控除
                  </div>
                  <div style={{ padding: '1rem' }}>
                    {/* 控除マスタから動的に表示 */}
                    {deductions.map(deduction => {
                      const amount = currentRecord.detail.deductions[deduction.id] || 0;
                      if (amount === 0) return null;
                      return (
                        <div key={deduction.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                          <div>{deduction.name}</div>
                          <div style={{ fontWeight: 'bold' }}>{formatCurrency(amount)}</div>
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.5rem', borderTop: '2px solid #1f2937' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>控除合計</div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{formatCurrency(currentRecord.detail.totalDeductions)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 差引支給額 */}
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: '#d1fae5', 
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: fontSizes.medium, color: '#065f46', marginBottom: '0.5rem' }}>差引支給額</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#065f46' }}>
                  {formatCurrency(currentRecord.detail.netPay)}
                </div>
              </div>
            </div>
          )}

          {/* プレビュー画面のフッター */}
          {viewMode === 'preview' && currentRecord && (
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              padding: isMobile ? '1rem' : '1.5rem',
              borderTop: '1px solid #e5e7eb',
              boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              zIndex: 1000
            }}>
              <CancelButton
                onClick={() => {
                  setViewMode('list');
                  window.history.pushState({ viewMode: 'list' }, '', window.location.pathname);
                }}
                style={{ whiteSpace: 'nowrap' }}
              >
                ← 戻る
              </CancelButton>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <PdfExportButton
                  onClick={handleExportPDF}
                  iconSize={isMobile ? 20 : 24}
                  style={{ 
                    fontSize: isMobile ? '0.875rem' : '0.7rem',
                    whiteSpace: 'nowrap'
                  }}
                />
                <button
                  onClick={() => handleEdit(currentRecord)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'white',
                    backgroundColor: 'white',
                    border: '1px solid #2563eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    color: '#2563eb',
                    transition: 'background-color 0.2s, border-color 0.2s',
                    whiteSpace: 'nowrap',
                    boxShadow: 'none',
                    minHeight: 'auto',
                    minWidth: 'auto',
                    fontSize: isMobile ? '0.875rem' : '0.7rem',
                    fontWeight: 'bold'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                    e.currentTarget.style.borderColor = '#1d4ed8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#2563eb';
                  }}
                  title="編集"
                >
                  <EditIcon size={isMobile ? 20 : 24} color="#2563eb" />
                  編集
                </button>
              </div>
            </div>
          )}

          {/* 編集画面 */}
          {(viewMode === 'edit' || viewMode === 'new') && (
            <div style={{
              backgroundColor: '#f9fafb',
              padding: isMobile ? '1rem' : '1.5rem',
              borderRadius: '8px'
            }}>
              <h3 style={{ marginBottom: '1.05rem', fontSize: isMobile ? '1.125rem' : '0.875rem' }}>
                {viewMode === 'new' ? '給与明細登録' : '給与明細編集'}
              </h3>

              {/* 勤務情報 */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: isMobile ? fontSizes.h4.mobile : fontSizes.h4.desktop, fontWeight: 'bold' }}>勤務情報</h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', 
                  gap: '1rem'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>出勤日数</label>
                    <input
                      type="number"
                      value={formData.workingDays}
                      onChange={(e) => setFormData({ ...formData, workingDays: Number(e.target.value) })}
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>休日出勤</label>
                    <input
                      type="number"
                      value={formData.holidayWork}
                      onChange={(e) => setFormData({ ...formData, holidayWork: Number(e.target.value) })}
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>有給休暇</label>
                    <input
                      type="number"
                      value={formData.paidLeave}
                      onChange={(e) => setFormData({ ...formData, paidLeave: Number(e.target.value) })}
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>有給残</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.paidLeaveRemaining}
                      onChange={(e) => setFormData({ ...formData, paidLeaveRemaining: Number(e.target.value) })}
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>有給残時点</label>
                    <input
                      type="text"
                      value={formData.paidLeaveRemainingDate}
                      onChange={(e) => setFormData({ ...formData, paidLeaveRemainingDate: e.target.value })}
                      placeholder="2026.7"
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>普通残業 (時間)</label>
                    <input
                      type="number"
                      value={formData.normalOvertime}
                      onChange={(e) => setFormData({ ...formData, normalOvertime: Number(e.target.value) })}
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>深夜残業 (時間)</label>
                    <input
                      type="number"
                      value={formData.lateNightOvertime}
                      onChange={(e) => setFormData({ ...formData, lateNightOvertime: Number(e.target.value) })}
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

              {/* 支給・控除セクション（横並び） */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                {/* 支給 */}
                <div style={{ flex: 1, padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: isMobile ? fontSizes.h4.mobile : fontSizes.h4.desktop, fontWeight: 'bold' }}>支給</h4>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>基本給</label>
                      <input
                        type="number"
                        value={formData.baseSalary}
                        onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
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
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>時間外手当</label>
                      <input
                        type="number"
                        value={formData.overtimeAllowance}
                        onChange={(e) => setFormData({ ...formData, overtimeAllowance: Number(e.target.value) })}
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
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>深夜手当</label>
                      <input
                        type="number"
                        value={formData.lateNightAllowance}
                        onChange={(e) => setFormData({ ...formData, lateNightAllowance: Number(e.target.value) })}
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
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>食事手当</label>
                      <input
                        type="number"
                        value={formData.mealAllowance}
                        onChange={(e) => setFormData({ ...formData, mealAllowance: Number(e.target.value) })}
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
                    {/* 手当マスタから動的に入力フィールドを生成 */}
                    {allowances.map(allowance => (
                      <div key={allowance.id}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>
                          {allowance.name}
                        </label>
                        <input
                          type="number"
                          value={formData.allowances[allowance.id] || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            allowances: {
                              ...formData.allowances,
                              [allowance.id]: Number(e.target.value)
                            }
                          })}
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
                    ))}
                  </div>
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#dbeafe', borderRadius: '4px', textAlign: 'right' }}>
                    <strong>総支給額: {formatCurrency(formData.totalEarnings)}</strong>
                  </div>
                </div>

                {/* 控除 */}
                <div style={{ flex: 1, padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: isMobile ? fontSizes.h4.mobile : fontSizes.h4.desktop, fontWeight: 'bold' }}>控除</h4>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                    gap: '1rem'
                  }}>
                    {deductions.map(deduction => (
                      <div key={deduction.id}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>
                          {deduction.name}
                        </label>
                        <input
                          type="number"
                          value={formData.deductions[deduction.id] || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            deductions: {
                              ...formData.deductions,
                              [deduction.id]: Number(e.target.value)
                            }
                          })}
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
                    ))}
                  </div>
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px', textAlign: 'right' }}>
                    <strong>控除合計: {formatCurrency(formData.totalDeductions)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '4px', textAlign: 'right' }}>
                <strong style={{ fontSize: '1.25rem' }}>差引支給額: {formatCurrency(formData.netPay)}</strong>
              </div>
            </div>
          )}

          {/* 編集・新規登録画面のフッター */}
          {(viewMode === 'edit' || viewMode === 'new') && (
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              padding: isMobile ? '1rem' : '1.5rem',
              borderTop: '1px solid #e5e7eb',
              boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              zIndex: 1000
            }}>
              <CancelButton
                onClick={handleCancel}
                style={{ whiteSpace: 'nowrap' }}
              >
                ← 戻る
              </CancelButton>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                {viewMode === 'new' ? (
                  <RegisterButton
                    onClick={handleSave}
                    style={{ whiteSpace: 'nowrap' }}
                  />
                ) : (
                  <UpdateButton
                    onClick={handleSave}
                    style={{ whiteSpace: 'nowrap' }}
                  />
                )}
              </div>
              <div style={{ width: '120px' }}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
