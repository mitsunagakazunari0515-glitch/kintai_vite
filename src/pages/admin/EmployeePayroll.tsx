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
import { EditIcon, ViewIcon, InfoIcon } from '../../components/Icons';
import { error as logError, log } from '../../utils/logger';
import { PdfExportButton, RegisterButton, UpdateButton, Button, EditButton, BackButton } from '../../components/Button';
import { formatCurrency } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';
import { dummyAllowances, dummyDeductions, dummyEmployees } from '../../data/dummyData';
import { apiRequest } from '../../config/apiConfig';
import { getPayrollList, getPayrollDetail, createPayroll, updatePayroll, PayrollListResponse, PayrollApiResponse, PayrollDetailResponse, formatPeriod, parsePeriod, convertPayrollListResponseToRecord, convertPayrollApiResponseToRecord } from '../../utils/payrollApi';
import { getStatementTypeLabel } from '../../utils/codeTranslator';
import { getAllowances, Allowance as ApiAllowance } from '../../utils/allowanceApi';
import { getDeductions, Deduction as ApiDeduction } from '../../utils/deductionApi';
import { getAttendanceMyRecords, AttendanceSummary } from '../../utils/attendanceApi';
import { getEmployee, EmployeeResponse } from '../../utils/employeeApi';

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
  /** 残業代に含むかどうか。 */
  includeInOvertime?: boolean;
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
 * 給与明細の詳細情報を表すインターフェース（API仕様に合わせて定義）。
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
  /** 普通残業時間（分）。 */
  normalOvertime: number;
  /** 深夜残業時間（分）。 */
  lateNightOvertime: number;
  /** 月の総稼働時間（分）。 */
  totalWorkHours: number;
  /** 基本給。 */
  baseSalary: number;
  /** 時間外手当。 */
  overtimeAllowance: number;
  /** 深夜手当。 */
  lateNightAllowance: number;
  /** 食事手当。 */
  mealAllowance: number;
  /** 通勤手当。 */
  commutingAllowance: number;
  /** 住宅手当。 */
  housingAllowance: number;
  /** 手当IDをキーとした金額のマップ。 */
  allowances: { [key: string]: number };
  /** 総支給額。 */
  totalEarnings: number;
  /** 社会保険料。 */
  socialInsurance: number;
  /** 厚生年金保険料。 */
  employeePension: number;
  /** 雇用保険料。 */
  employmentInsurance: number;
  /** 市県民税。 */
  municipalTax: number;
  /** 所得税。 */
  incomeTax: number;
  /** 控除IDをキーとした金額のマップ。 */
  deductions: { [key: string]: number };
  /** 控除合計。 */
  totalDeductions: number;
  /** 差引支給額。 */
  netPay: number;
}

/**
 * 賞与明細の詳細情報を表すインターフェース。
 */
interface BonusDetail {
  /** 賞与。 */
  bonus: number;
  /** 総支給額。 */
  totalEarnings: number;
  /** 健康保険料。 */
  healthInsurance: number;
  /** 厚生年金保険料。 */
  employeePension: number;
  /** 雇用保険料。 */
  employmentInsurance: number;
  /** 所得税。 */
  incomeTax: number;
  /** 控除合計。 */
  totalDeductions: number;
  /** 差引支給額。 */
  netPay: number;
}

/**
 * 給与明細レコードを表すインターフェース（UI表示用）。
 * API仕様ではyear/monthを使用するが、UI表示用にperiod文字列も保持。
 */
interface PayrollRecord {
  /** レコードID（API仕様のpayrollId）。 */
  id: string;
  /** 年。 */
  year: number;
  /** 月。 */
  month: number;
  /** 明細タイプ（給与明細 or 賞与明細）。 */
  type?: 'payroll' | 'bonus';
  /** 従業員ID。 */
  employeeId: string;
  /** 従業員名。 */
  employeeName: string;
  /** 会社名。 */
  companyName: string;
  /** 給与期間（UI表示用、"2025年 10月"形式）。 */
  period: string;
  /** メモ。 */
  memo?: string | null;
  /** 給与明細の詳細情報（API仕様では賞与明細でもdetailを使用）。 */
  detail?: PayrollDetail;
  /** 賞与明細の詳細情報（後方互換性のため残すが、API仕様では使用しない）。 */
  bonusDetail?: BonusDetail;
  /** 更新日時。 */
  updatedAt?: string;
  /** 更新者。 */
  updatedBy?: string | null;
  /** 作成日時。 */
  createdAt?: string;
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
  const [recordType, setRecordType] = useState<'payroll' | 'bonus'>('payroll'); // 新規登録時の種類
  const [editingMemoRecordId, setEditingMemoRecordId] = useState<string | null>(null); // メモ編集中のレコードID
  const [editingMemo, setEditingMemo] = useState<string>(''); // 編集中のメモ
  const [bonusFormData, setBonusFormData] = useState<BonusDetail>({
    bonus: 0,
    totalEarnings: 0,
    healthInsurance: 0,
    employeePension: 0,
    employmentInsurance: 0,
    incomeTax: 0,
    totalDeductions: 0,
    netPay: 0
  });

  // 手当マスタ（APIから取得）
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [isLoadingAllowances, setIsLoadingAllowances] = useState<boolean>(false);

  // 控除マスタ（APIから取得）
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [isLoadingDeductions, setIsLoadingDeductions] = useState<boolean>(false);

  // 従業員名を取得（ダミーデータから、将来的にAPIから取得）
  const [employeeName, setEmployeeName] = useState<string>('従業員');
  const [companyName] = useState<string>('株式会社A・1インテリア');
  
  // 給与明細一覧の状態
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState<boolean>(false);
  
  // 従業員情報（基本給取得用）
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeResponse | null>(null);
  
  log(`[EmployeePayroll] Component initialized. employeeId=${employeeId}, payrollRecords.length=${payrollRecords.length}`);

  /**
   * 給与計算関数
   * 基本給、時間外手当、深夜手当を計算します
   * 
   * @param employee 従業員情報
   * @param normalOvertimeMinutes 普通残業時間（分）
   * @param lateNightOvertimeMinutes 深夜残業時間（分）
   * @param currentAllowances 現在の手当金額（残業代に含む手当を含む）
   * @param allowanceMasters 手当マスタ一覧（残業代に含む判定用）
   * @param actualWorkHoursMinutes 実労働時間（分、パートタイム従業員の基本給計算用）
   * @returns { baseSalary: number, overtimeAllowance: number, lateNightAllowance: number }
   */
  const calculatePayroll = (
    employee: EmployeeResponse | null,
    normalOvertimeMinutes: number,
    lateNightOvertimeMinutes: number,
    currentAllowances: { [key: string]: number },
    allowanceMasters: Allowance[],
    actualWorkHoursMinutes: number = 0
  ): { baseSalary: number; overtimeAllowance: number; lateNightAllowance: number } => {
    // 基本給
    // パートタイム従業員の場合は時給×稼働時間、正社員の場合は月額基本給
    let baseSalary = 0;
    if (employee?.employmentType === 'PART_TIME') {
      // パートタイム: 時給（baseSalary）× 稼働時間（時間）
      const hourlyRate = employee.baseSalary || 0;
      const workHours = actualWorkHoursMinutes / 60; // 分を時間に変換
      baseSalary = Math.round(hourlyRate * workHours);
    } else {
      // 正社員: 月額基本給
      baseSalary = employee?.baseSalary || 0;
    }

    // 残業代に含む手当（*マークが付いている手当）の金額合計を取得
    const allowancesForOvertime = allowanceMasters
      .filter(allowance => allowance.includeInOvertime)
      .reduce((sum, allowance) => {
        const amount = currentAllowances[allowance.id] || 0;
        return sum + amount;
      }, 0);

    // 残業単価 = (基本給 + 残業代に含む手当の金額合計) ÷ 20.5 ÷ 7.5
    const overtimeRate = (baseSalary + allowancesForOvertime) / 20.5 / 7.5;
    // 端数処理: 切り上げ（1円単位）
    const overtimeRateRounded = Math.ceil(overtimeRate);

    // 時間外手当の計算
    // 簡易版: normalOvertimeMinutes（普通残業時間）に平均単価率1.25倍を適用
    // 注意: 仕様書では時間帯別・曜日別の単価率があるが、簡易版として平均1.25倍を使用
    const overtimeAllowance = Math.ceil(overtimeRateRounded * 1.25 * (normalOvertimeMinutes / 60));

    // 深夜手当の計算
    // 深夜手当 = 深夜労働時間（分） × 残業単価 × 1.50倍
    const lateNightAllowance = Math.ceil(overtimeRateRounded * 1.50 * (lateNightOvertimeMinutes / 60));

    return {
      baseSalary,
      overtimeAllowance,
      lateNightAllowance
    };
  };

  /**
   * ツールチップコンポーネント
   */
  const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const arrowRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // ツールチップの位置を調整（画面端で見切れないように）
    useEffect(() => {
      if (isVisible && tooltipRef.current && arrowRef.current && containerRef.current) {
        const tooltip = tooltipRef.current;
        const arrow = arrowRef.current;
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width || 500; // 実際の幅を取得
        const viewportWidth = window.innerWidth;
        const margin = 10; // 画面端からの余白
        
        // アイコンの中心位置（画面座標）
        const iconCenterX = containerRect.left + containerRect.width / 2;
        
        // 中央揃えの位置を計算
        let leftPosition = iconCenterX - tooltipWidth / 2;
        let arrowLeft = '50%'; // 矢印の位置（デフォルトは中央）
        
        // 左端で見切れる場合
        if (leftPosition < margin) {
          leftPosition = margin;
          tooltip.style.left = `${leftPosition - containerRect.left}px`;
          tooltip.style.transform = 'none';
          // 矢印の位置をアイコンの中心に合わせる
          const arrowOffset = iconCenterX - leftPosition;
          arrowLeft = `${arrowOffset}px`;
          arrow.style.left = arrowLeft;
          arrow.style.transform = 'none';
        }
        // 右端で見切れる場合
        else if (leftPosition + tooltipWidth > viewportWidth - margin) {
          leftPosition = viewportWidth - tooltipWidth - margin;
          tooltip.style.left = `${leftPosition - containerRect.left}px`;
          tooltip.style.transform = 'none';
          // 矢印の位置をアイコンの中心に合わせる
          const arrowOffset = iconCenterX - leftPosition;
          arrowLeft = `${arrowOffset}px`;
          arrow.style.left = arrowLeft;
          arrow.style.transform = 'none';
        }
        // 通常の中央揃え
        else {
          tooltip.style.left = '50%';
          tooltip.style.transform = 'translateX(-50%)';
          arrow.style.left = '50%';
          arrow.style.transform = 'translateX(-50%)';
        }
      }
    }, [isVisible]);
    
    return (
      <div
        ref={containerRef}
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div
            ref={tooltipRef}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '0.5rem',
              padding: '0.75rem',
              backgroundColor: '#1f2937',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.875rem',
              whiteSpace: 'pre-line',
              zIndex: 1000,
              maxWidth: '500px',
              minWidth: '350px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              lineHeight: '1.5',
              pointerEvents: 'none'
            }}
          >
            {content}
            <div
              ref={arrowRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                border: '6px solid transparent',
                borderTopColor: '#1f2937'
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // 数値入力のバリデーション関数
  const handleNumberInput = (value: string, allowDecimal: boolean = false): number => {
    // 空文字列の場合は0を返す
    if (value === '' || value === '-') {
      return 0;
    }
    // 数値のみを許可（小数点も許可する場合はallowDecimalがtrueの場合のみ）
    const regex = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    if (!regex.test(value)) {
      return NaN;
    }
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const [formData, setFormData] = useState<PayrollDetail>(payrollRecords[0]?.detail || {
    workingDays: 0,
    holidayWork: 0,
    paidLeave: 0,
    paidLeaveRemaining: 0,
    paidLeaveRemainingDate: '',
    normalOvertime: 0,
    lateNightOvertime: 0,
    totalWorkHours: 0,
    baseSalary: 0,
    overtimeAllowance: 0,
    lateNightAllowance: 0,
    mealAllowance: 0,
    commutingAllowance: 0,
    housingAllowance: 0,
    allowances: {},
    totalEarnings: 0,
    socialInsurance: 0,
    employeePension: 0,
    employmentInsurance: 0,
    municipalTax: 0,
    incomeTax: 0,
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
            if (record.type === 'bonus' && record.bonusDetail) {
              setBonusFormData(record.bonusDetail);
              setRecordType('bonus');
            } else if (record.detail) {
            setFormData(record.detail);
              setRecordType('payroll');
            }
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

  // 年月変更時に勤務情報と給与明細情報を取得
  useEffect(() => {
    const fetchDataForPeriod = async () => {
      // 新規登録モードで給与明細の場合のみ実行
      if (viewMode !== 'new' || recordType !== 'payroll' || !employeeId) {
        return;
      }

      try {
        // 勤務情報を取得
        const year = String(newPeriod.year);
        const month = String(newPeriod.month).padStart(2, '0');
        
        // 従業員情報と勤怠情報を並行取得
        const [employeeResponse, attendanceResponse] = await Promise.all([
          getEmployee(employeeId),
          getAttendanceMyRecords(year, month, employeeId)
        ]);
        
        // 従業員情報を状態に保存（ツールチップ表示用）
        setEmployeeInfo(employeeResponse);
        
        // 出勤簿データから勤務情報を取得
        const summary = attendanceResponse.summary;
        
        // 深夜残業時間をlogsから集計（lateNightMinutesを合計）
        const lateNightOvertime = attendanceResponse.logs.reduce((total, log) => {
          return total + (log.lateNightMinutes || 0);
        }, 0);
        
        // 既存の給与明細を検索
        let existingPayrollDetail: PayrollDetail | null = null;
        try {
          const payrollList = await getPayrollList(employeeId, newPeriod.year);
          const existingRecord = payrollList.find(
            record => record.year === newPeriod.year && record.month === newPeriod.month && record.statementType === 'salary'
          );
          
          if (existingRecord) {
            const detailResponse = await getPayrollDetail(existingRecord.payrollId);
            if (detailResponse.detail) {
              existingPayrollDetail = {
                workingDays: detailResponse.detail.workingDays ?? 0,
                holidayWork: detailResponse.detail.holidayWork ?? 0,
                paidLeave: detailResponse.detail.paidLeave ?? 0,
                paidLeaveRemaining: detailResponse.detail.paidLeaveRemaining ?? 0,
                paidLeaveRemainingDate: detailResponse.detail.paidLeaveRemainingDate ?? '',
                normalOvertime: detailResponse.detail.normalOvertime ?? 0,
                lateNightOvertime: detailResponse.detail.lateNightOvertime ?? 0,
                totalWorkHours: detailResponse.detail.totalWorkHours ?? 0,
                baseSalary: detailResponse.detail.baseSalary ?? 0,
                overtimeAllowance: detailResponse.detail.overtimeAllowance ?? 0,
                lateNightAllowance: detailResponse.detail.lateNightAllowance ?? 0,
                mealAllowance: detailResponse.detail.mealAllowance ?? 0,
                commutingAllowance: detailResponse.detail.commutingAllowance ?? 0,
                housingAllowance: detailResponse.detail.housingAllowance ?? 0,
                allowances: detailResponse.detail.allowances || {},
                totalEarnings: detailResponse.detail.totalEarnings ?? 0,
                socialInsurance: detailResponse.detail.socialInsurance ?? 0,
                employeePension: detailResponse.detail.employeePension ?? 0,
                employmentInsurance: detailResponse.detail.employmentInsurance ?? 0,
                municipalTax: detailResponse.detail.municipalTax ?? 0,
                incomeTax: detailResponse.detail.incomeTax ?? 0,
                deductions: detailResponse.detail.deductions || {},
                totalDeductions: detailResponse.detail.totalDeductions ?? 0,
                netPay: detailResponse.detail.netPay ?? 0
              };
            }
          }
        } catch (error) {
          logError('Failed to fetch existing payroll detail:', error);
          // 既存の給与明細が取得できなくても、勤務情報は更新する
        }
        
        // 手当マスタから動的に生成される項目に0を自動セット（既存の給与明細がある場合は既存の値を優先）
        const currentAllowances = (() => {
          const existingAllowances = existingPayrollDetail?.allowances ?? {};
          const newAllowances: { [key: string]: number } = {};
          allowances.forEach(allowance => {
            newAllowances[allowance.id] = existingAllowances[allowance.id] ?? 0;
          });
          return newAllowances;
        })();
        
        // 給与計算（基本給、時間外手当、深夜手当）
        // 既存の給与明細がある場合はAPIの金額を使用、ない場合は計算した値を使用
        const normalOvertimeMinutes = summary.actualOvertimeHours || 0; // 分単位
        const actualWorkHoursMinutes = summary.actualWorkHours || 0; // 分単位（パートタイム従業員の基本給計算用）
        const payrollCalculation = existingPayrollDetail ? {
          baseSalary: existingPayrollDetail.baseSalary,
          overtimeAllowance: existingPayrollDetail.overtimeAllowance,
          lateNightAllowance: existingPayrollDetail.lateNightAllowance
        } : calculatePayroll(
          employeeResponse,
          normalOvertimeMinutes,
          lateNightOvertime,
          currentAllowances,
          allowances,
          actualWorkHoursMinutes
        );
        
        // フォームデータを更新
        // APIからのデフォルトバリューあり → APIの金額、データを使用
        // APIからのデフォルトバリューなし → 計算した値をセット
        setFormData({
          workingDays: summary.actualWorkDays || 0,
          holidayWork: summary.holidayWorkDays || 0,
          paidLeave: summary.usedPaidLeaveDays || 0,
          paidLeaveRemaining: summary.remainingPaidLeaveDays || 0,
          paidLeaveRemainingDate: summary.paidLeaveExpirationDate || '',
          normalOvertime: normalOvertimeMinutes, // 分単位
          lateNightOvertime: lateNightOvertime, // 分単位
          totalWorkHours: actualWorkHoursMinutes, // 分単位
          baseSalary: payrollCalculation.baseSalary,
          overtimeAllowance: payrollCalculation.overtimeAllowance,
          lateNightAllowance: payrollCalculation.lateNightAllowance,
          mealAllowance: existingPayrollDetail?.mealAllowance ?? 0,
          commutingAllowance: existingPayrollDetail?.commutingAllowance ?? 0,
          housingAllowance: existingPayrollDetail?.housingAllowance ?? 0,
          allowances: currentAllowances,
          totalEarnings: existingPayrollDetail?.totalEarnings ?? 0,
          socialInsurance: existingPayrollDetail?.socialInsurance ?? 0,
          employeePension: existingPayrollDetail?.employeePension ?? 0,
          employmentInsurance: existingPayrollDetail?.employmentInsurance ?? 0,
          municipalTax: existingPayrollDetail?.municipalTax ?? 0,
          incomeTax: existingPayrollDetail?.incomeTax ?? 0,
          // 控除マスタから動的に生成される項目に0を自動セット
          deductions: (() => {
            const existingDeductions = existingPayrollDetail?.deductions ?? {};
            const newDeductions: { [key: string]: number } = {};
            deductions.forEach(deduction => {
              newDeductions[deduction.id] = existingDeductions[deduction.id] ?? 0;
            });
            return newDeductions;
          })(),
          totalDeductions: existingPayrollDetail?.totalDeductions ?? 0,
          netPay: existingPayrollDetail?.netPay ?? 0
        });
      } catch (error) {
        logError('Failed to fetch data for period:', error);
        setSnackbar({ message: '勤務情報の取得に失敗しました', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
      }
    };

    fetchDataForPeriod();
  }, [newPeriod.year, newPeriod.month, viewMode, recordType, employeeId, allowances, deductions]);

  useEffect(() => {
    // 給与明細の場合のみ自動計算
    if (recordType === 'payroll' && formData) {
      const allowanceTotal = Object.values(formData.allowances || {}).reduce((sum, amount) => sum + amount, 0);
    const totalEarnings = formData.baseSalary + 
      formData.overtimeAllowance + 
      formData.lateNightAllowance + 
      allowanceTotal;
    
      const deductionTotal = Object.values(formData.deductions || {}).reduce((sum, amount) => sum + amount, 0);
    const netPay = totalEarnings - deductionTotal;

    setFormData(prev => ({
      ...prev,
      totalEarnings,
      totalDeductions: deductionTotal,
      netPay
    }));
    }
  }, [
    recordType,
    formData?.baseSalary,
    formData?.overtimeAllowance,
    formData?.lateNightAllowance,
    formData?.allowances,
    formData?.deductions
  ]);

  useEffect(() => {
    // 賞与明細の場合のみ自動計算
    if (recordType === 'bonus' && bonusFormData) {
      const totalEarnings = bonusFormData.bonus;
      const totalDeductions = bonusFormData.healthInsurance + 
        bonusFormData.employeePension + 
        bonusFormData.employmentInsurance + 
        bonusFormData.incomeTax;
      const netPay = totalEarnings - totalDeductions;

      setBonusFormData(prev => ({
        ...prev,
        totalEarnings,
        totalDeductions,
        netPay
      }));
    }
  }, [
    recordType,
    bonusFormData?.bonus,
    bonusFormData?.healthInsurance,
    bonusFormData?.employeePension,
    bonusFormData?.employmentInsurance,
    bonusFormData?.incomeTax
  ]);

  // 手当マスタをAPIから取得
  useEffect(() => {
    const fetchAllowances = async () => {
      setIsLoadingAllowances(true);
      try {
        const response = await getAllowances();
        const mappedAllowances: Allowance[] = response.allowances.map(allowance => ({
          id: allowance.id,
          name: allowance.name,
          color: allowance.color,
          includeInOvertime: allowance.includeInOvertime
        }));
        setAllowances(mappedAllowances);
      } catch (error) {
        logError('Failed to fetch allowances:', error);
        setSnackbar({ message: '手当マスタの取得に失敗しました', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
        setAllowances([]);
      } finally {
        setIsLoadingAllowances(false);
      }
    };

    fetchAllowances();
  }, []);

  // 控除マスタをAPIから取得
  useEffect(() => {
    const fetchDeductions = async () => {
      setIsLoadingDeductions(true);
      try {
        const response = await getDeductions();
        const mappedDeductions: Deduction[] = response.deductions.map(deduction => ({
          id: deduction.id,
          name: deduction.name
        }));
        setDeductions(mappedDeductions);
      } catch (error) {
        logError('Failed to fetch deductions:', error);
        setSnackbar({ message: '控除マスタの取得に失敗しました', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
        setDeductions([]);
      } finally {
        setIsLoadingDeductions(false);
      }
    };

    fetchDeductions();
  }, []);

  // 給与明細一覧をAPIから取得
  useEffect(() => {
    const fetchPayrollRecords = async () => {
      if (!employeeId) return;
      
      setIsLoadingPayroll(true);
      try {
        // 従業員名を取得（ダミーデータから、将来的にAPIから取得）
        const employee = dummyEmployees.find(emp => emp.id === employeeId) as any;
        if (employee && employee.firstName && employee.lastName) {
          setEmployeeName(`${employee.firstName} ${employee.lastName}`);
        }
        
        // APIから給与明細一覧を取得
        const records = await getPayrollList(employeeId, searchFiscalYear);
        const mappedRecords: PayrollRecord[] = records.map(record => {
          const converted = convertPayrollListResponseToRecord(
            record,
            employee && employee.firstName && employee.lastName 
              ? `${employee.firstName} ${employee.lastName}` 
              : '従業員',
            companyName
          );
          return {
            ...converted,
            employeeId: employeeId,
            // 一覧APIレスポンスには詳細情報が含まれないため、detailは未設定
            detail: undefined,
            bonusDetail: undefined
          } as PayrollRecord;
        });
        
        setPayrollRecords(mappedRecords);
      } catch (error) {
        logError('Failed to fetch payroll records:', error);
        setSnackbar({ message: '給与明細の取得に失敗しました', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
        // エラー時は空配列を設定
        setPayrollRecords([]);
      } finally {
        setIsLoadingPayroll(false);
      }
    };

    fetchPayrollRecords();
  }, [employeeId, searchFiscalYear, companyName]);

  const handleView = async (record: PayrollRecord) => {
    try {
      // 詳細情報が既にロードされている場合はそれを使用
      if (record.detail || record.bonusDetail) {
        setSelectedRecord(record);
        if (record.type === 'bonus' && record.bonusDetail) {
          setBonusFormData(record.bonusDetail);
          setRecordType('bonus');
        } else if (record.detail) {
          setFormData(record.detail);
          setRecordType('payroll');
        }
        setViewMode('preview');
        window.history.pushState({ viewMode: 'preview', recordId: record.id }, '', window.location.pathname);
        return;
      }
      
      // 詳細情報が無い場合はAPIから取得
      setIsLoadingPayroll(true);
      const detailResponse = await getPayrollDetail(record.id);
      const convertedRecord = convertPayrollApiResponseToRecord(
        detailResponse,
        employeeId || '',
        employeeName,
        companyName
      );
      
      const fullRecord: PayrollRecord = {
        ...record,
        ...convertedRecord,
        detail: convertedRecord.detail,
        memo: record.memo ?? undefined,
        updatedBy: record.updatedBy ?? undefined
      };
      
      setSelectedRecord(fullRecord);
      setFormData(convertedRecord.detail);
      setRecordType(convertedRecord.type);
      setViewMode('preview');
      window.history.pushState({ viewMode: 'preview', recordId: record.id }, '', window.location.pathname);
      
      // 一覧の該当レコードも更新（次回はAPI呼び出し不要にするため）
      setPayrollRecords(prev => prev.map(r => 
        r.id === record.id ? fullRecord : r
      ));
    } catch (error) {
      logError('Failed to fetch payroll detail:', error);
      setSnackbar({ message: '給与明細の取得に失敗しました', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    } finally {
      setIsLoadingPayroll(false);
    }
  };

  const handleEdit = (record: PayrollRecord) => {
    // 編集画面に入る前のviewModeを記録（一覧からかプレビューからかを判定するため）
    const prevMode = viewMode;
    setPreviousViewMode(prevMode);
    setSelectedRecord(record);
    if (record.type === 'bonus' && record.bonusDetail) {
      setBonusFormData(record.bonusDetail);
      setRecordType('bonus');
    } else if (record.detail) {
    setFormData(record.detail);
      setRecordType('payroll');
    }
    setViewMode('edit');
    // ブラウザの履歴に追加（previousViewModeも保存）
    window.history.pushState({ 
      viewMode: 'edit', 
      recordId: record.id,
      previousViewMode: prevMode 
    }, '', window.location.pathname);
  };

  const handleNew = async (type: 'payroll' | 'bonus' = 'payroll') => {
    // 新規登録モードに切り替え
    setViewMode('new');
    setSelectedRecord(null);
    setRecordType(type);
    
    // 初期データを設定
    if (type === 'bonus') {
      setBonusFormData({
        bonus: 0,
        totalEarnings: 0,
        healthInsurance: 0,
        employeePension: 0,
        employmentInsurance: 0,
        incomeTax: 0,
        totalDeductions: 0,
        netPay: 0
      });
    } else {
      // 給与明細の場合、出勤簿一覧取得APIから勤務情報を取得
      if (employeeId) {
        try {
          const year = String(newPeriod.year);
          const month = String(newPeriod.month).padStart(2, '0');
          
          // 従業員情報と勤怠情報を並行取得
          const [employeeResponse, attendanceResponse] = await Promise.all([
            getEmployee(employeeId),
            getAttendanceMyRecords(year, month, employeeId)
          ]);
          
          // 従業員情報を状態に保存（ツールチップ表示用）
          setEmployeeInfo(employeeResponse);
          
          // 出勤簿データから勤務情報を取得
          const summary = attendanceResponse.summary;
          
          // 深夜残業時間をlogsから集計（lateNightMinutesを合計）
          const lateNightOvertime = attendanceResponse.logs.reduce((total, log) => {
            return total + (log.lateNightMinutes || 0);
          }, 0);
          
          // 手当マスタと控除マスタから動的に生成される項目に0を自動セット
          const initialAllowances: { [key: string]: number } = {};
          allowances.forEach(allowance => {
            initialAllowances[allowance.id] = 0;
          });
          
          const initialDeductions: { [key: string]: number } = {};
          deductions.forEach(deduction => {
            initialDeductions[deduction.id] = 0;
          });
          
          // 給与計算（基本給、時間外手当、深夜手当）
          const normalOvertimeMinutes = summary.actualOvertimeHours || 0; // 分単位
          const actualWorkHoursMinutes = summary.actualWorkHours || 0; // 分単位（パートタイム従業員の基本給計算用）
          const payrollCalculation = calculatePayroll(
            employeeResponse,
            normalOvertimeMinutes,
            lateNightOvertime,
            initialAllowances,
            allowances,
            actualWorkHoursMinutes
          );
          
          setFormData({
            workingDays: summary.actualWorkDays || 0,
            holidayWork: summary.holidayWorkDays || 0,
            paidLeave: summary.usedPaidLeaveDays || 0,
            paidLeaveRemaining: summary.remainingPaidLeaveDays || 0,
            paidLeaveRemainingDate: summary.paidLeaveExpirationDate || '',
            normalOvertime: normalOvertimeMinutes, // 分単位
            lateNightOvertime: lateNightOvertime, // 分単位
            totalWorkHours: actualWorkHoursMinutes, // 分単位
            baseSalary: payrollCalculation.baseSalary,
            overtimeAllowance: payrollCalculation.overtimeAllowance,
            lateNightAllowance: payrollCalculation.lateNightAllowance,
            mealAllowance: 0,
            commutingAllowance: 0,
            housingAllowance: 0,
            allowances: initialAllowances,
            totalEarnings: 0,
            socialInsurance: 0,
            employeePension: 0,
            employmentInsurance: 0,
            municipalTax: 0,
            incomeTax: 0,
            deductions: initialDeductions,
            totalDeductions: 0,
            netPay: 0
          });
        } catch (error) {
          logError('Failed to fetch attendance data:', error);
          // エラー時はデフォルト値を設定（手当マスタと控除マスタから動的に生成される項目に0を自動セット）
          const errorAllowances: { [key: string]: number } = {};
          allowances.forEach(allowance => {
            errorAllowances[allowance.id] = 0;
          });
          
          const errorDeductions: { [key: string]: number } = {};
          deductions.forEach(deduction => {
            errorDeductions[deduction.id] = 0;
          });
          
          setFormData({
            workingDays: 0,
            holidayWork: 0,
            paidLeave: 0,
            paidLeaveRemaining: 0,
            paidLeaveRemainingDate: '',
            normalOvertime: 0,
            lateNightOvertime: 0,
            totalWorkHours: 0,
            baseSalary: 0,
            overtimeAllowance: 0,
            lateNightAllowance: 0,
            mealAllowance: 0,
            commutingAllowance: 0,
            housingAllowance: 0,
            allowances: errorAllowances,
            totalEarnings: 0,
            socialInsurance: 0,
            employeePension: 0,
            employmentInsurance: 0,
            municipalTax: 0,
            incomeTax: 0,
            deductions: errorDeductions,
            totalDeductions: 0,
            netPay: 0
          });
        }
      } else {
        // employeeIdがない場合はデフォルト値を設定（手当マスタと控除マスタから動的に生成される項目に0を自動セット）
        const defaultAllowances: { [key: string]: number } = {};
        allowances.forEach(allowance => {
          defaultAllowances[allowance.id] = 0;
        });
        
        const defaultDeductions: { [key: string]: number } = {};
        deductions.forEach(deduction => {
          defaultDeductions[deduction.id] = 0;
        });
        
        setFormData({
          workingDays: 0,
          holidayWork: 0,
          paidLeave: 0,
          paidLeaveRemaining: 0,
          paidLeaveRemainingDate: '',
          normalOvertime: 0,
          lateNightOvertime: 0,
          totalWorkHours: 0,
          baseSalary: 0,
          overtimeAllowance: 0,
          lateNightAllowance: 0,
          mealAllowance: 0,
          commutingAllowance: 0,
          housingAllowance: 0,
          allowances: defaultAllowances,
          totalEarnings: 0,
          socialInsurance: 0,
          employeePension: 0,
          employmentInsurance: 0,
          municipalTax: 0,
          incomeTax: 0,
          deductions: defaultDeductions,
          totalDeductions: 0,
          netPay: 0
        });
      }
    }
    // ブラウザの履歴に追加
    window.history.pushState({ viewMode: 'new' }, '', window.location.pathname);
  };

  const handleSave = async () => {
    if (!employeeId) {
      setSnackbar({ message: '従業員IDが取得できませんでした', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }

    setIsLoadingPayroll(true);
    try {
      if (viewMode === 'new') {
        // 新規登録
        const statementType = recordType === 'bonus' ? 'bonus' : 'salary';
        
        // BonusFormDataをPayrollDetailResponseに変換
        let detailPayload: PayrollDetailResponse;
        if (recordType === 'bonus') {
          // 賞与明細の場合
          detailPayload = {
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
            commutingAllowance: 0,
            housingAllowance: 0,
            allowances: { '賞与': bonusFormData.bonus },
            totalEarnings: bonusFormData.totalEarnings,
            socialInsurance: bonusFormData.healthInsurance,
            employeePension: bonusFormData.employeePension,
            employmentInsurance: bonusFormData.employmentInsurance,
            municipalTax: 0,
            incomeTax: bonusFormData.incomeTax,
            deductions: {},
            totalDeductions: bonusFormData.totalDeductions,
            netPay: bonusFormData.netPay
          };
        } else {
          // 給与明細の場合
          detailPayload = formData;
        }
        
        await createPayroll({
          employeeId,
          year: newPeriod.year,
          month: newPeriod.month,
          statementType,
          detail: detailPayload
        });
        
        // 一覧を再取得
        const records = await getPayrollList(employeeId, searchFiscalYear);
        const employee = dummyEmployees.find(emp => emp.id === employeeId) as any;
        const mappedRecords: PayrollRecord[] = records.map(record => {
          const converted = convertPayrollListResponseToRecord(
            record,
            employee && employee.firstName && employee.lastName 
              ? `${employee.firstName} ${employee.lastName}` 
              : '従業員',
            companyName
          );
          return {
            ...converted,
            employeeId: employeeId,
            detail: undefined,
            bonusDetail: undefined
          } as PayrollRecord;
        });
        setPayrollRecords(mappedRecords);
        
        setSelectedRecord(null);
        setViewMode('list');
        window.history.pushState({ viewMode: 'list' }, '', window.location.pathname);
        const typeLabel = getStatementTypeLabel(recordType === 'bonus' ? 'bonus' : 'salary');
        setSnackbar({ message: `${typeLabel}を登録しました`, type: 'success' });
        setTimeout(() => setSnackbar(null), 3000);
      } else if (selectedRecord) {
        // 更新
        const statementType = selectedRecord.type === 'bonus' ? 'bonus' : 'salary';
        
        // BonusFormDataをPayrollDetailResponseに変換
        let detailPayload: PayrollDetailResponse;
        if (selectedRecord.type === 'bonus') {
          // 賞与明細の場合
          detailPayload = {
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
            commutingAllowance: 0,
            housingAllowance: 0,
            allowances: { '賞与': bonusFormData.bonus },
            totalEarnings: bonusFormData.totalEarnings,
            socialInsurance: bonusFormData.healthInsurance,
            employeePension: bonusFormData.employeePension,
            employmentInsurance: bonusFormData.employmentInsurance,
            municipalTax: 0,
            incomeTax: bonusFormData.incomeTax,
            deductions: {},
            totalDeductions: bonusFormData.totalDeductions,
            netPay: bonusFormData.netPay
          };
        } else {
          // 給与明細の場合
          detailPayload = formData;
        }
        
        await updatePayroll(selectedRecord.id, {
          employeeId,
          year: selectedRecord.year,
          month: selectedRecord.month,
          statementType,
          detail: detailPayload
        });
        
        // 一覧を再取得
        const records = await getPayrollList(employeeId, searchFiscalYear);
        const employee = dummyEmployees.find(emp => emp.id === employeeId) as any;
        const mappedRecords: PayrollRecord[] = records.map(record => {
          const converted = convertPayrollListResponseToRecord(
            record,
            employee && employee.firstName && employee.lastName 
              ? `${employee.firstName} ${employee.lastName}` 
              : '従業員',
            companyName
          );
          return {
            ...converted,
            employeeId: employeeId,
            detail: undefined,
            bonusDetail: undefined
          } as PayrollRecord;
        });
        setPayrollRecords(mappedRecords);
        
        // 更新されたレコードを選択状態に設定
        const updatedRecord = mappedRecords.find(r => r.id === selectedRecord.id);
        if (updatedRecord) {
          // 詳細情報を取得して設定
          const detailResponse = await getPayrollDetail(updatedRecord.id);
          const convertedRecord = convertPayrollApiResponseToRecord(
            detailResponse,
            employeeId,
            employeeName,
            companyName
          );
          const fullRecord: PayrollRecord = {
            ...updatedRecord,
            ...convertedRecord,
            detail: convertedRecord.detail,
            memo: updatedRecord.memo ?? undefined,
            updatedBy: updatedRecord.updatedBy ?? undefined
          };
          setSelectedRecord(fullRecord);
        }
        
        // 編集画面に入る前のviewModeに戻る（一覧からなら一覧、プレビューからならプレビュー）
        const returnViewMode = previousViewMode === 'list' ? 'list' : 'preview';
        setViewMode(returnViewMode);
        
        // ブラウザの履歴に追加
        if (returnViewMode === 'list') {
          window.history.pushState({ viewMode: 'list' }, '', window.location.pathname);
        } else {
          const recordToUse = updatedRecord || selectedRecord;
          window.history.pushState({ viewMode: 'preview', recordId: recordToUse.id }, '', window.location.pathname);
        }
        
        const typeLabel = getStatementTypeLabel((selectedRecord.type === 'payroll' ? 'salary' : selectedRecord.type) || 'salary');
        setSnackbar({ message: `${typeLabel}を更新しました`, type: 'success' });
        setTimeout(() => setSnackbar(null), 3000);
      }
    } catch (error) {
      logError('Failed to save payroll:', error);
      const typeLabel = viewMode === 'new' 
        ? getStatementTypeLabel(recordType === 'bonus' ? 'bonus' : 'salary')
        : getStatementTypeLabel((selectedRecord?.type === 'payroll' ? 'salary' : selectedRecord?.type) || 'salary');
      const action = viewMode === 'new' ? '登録' : '更新';
      setSnackbar({ message: `${typeLabel}の${action}に失敗しました`, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    } finally {
      setIsLoadingPayroll(false);
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
        if (selectedRecord.type === 'bonus' && selectedRecord.bonusDetail) {
          setBonusFormData(selectedRecord.bonusDetail);
          setRecordType('bonus');
        } else if (selectedRecord.detail) {
        setFormData(selectedRecord.detail);
          setRecordType('payroll');
        }
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
    } catch (err) {
      logError('PDF出力エラー:', err);
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
    if (!match) {
      log(`[EmployeePayroll] getFiscalYearFromPeriod: period=${period} - no match`);
      return null;
    }
    
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    
    // 4月以降は当年、3月までは前年
    const fiscalYear = month >= 4 ? year : year - 1;
    log(`[EmployeePayroll] getFiscalYearFromPeriod: period=${period}, year=${year}, month=${month}, fiscalYear=${fiscalYear}`);
    return fiscalYear;
  };

  log(`[EmployeePayroll] Before filter: payrollRecords.length=${payrollRecords.length}, searchFiscalYear=${searchFiscalYear}`);
  log(`[EmployeePayroll] All payrollRecords:`, payrollRecords.map(r => ({
    id: r.id,
    period: r.period,
    employeeName: r.employeeName
  })));

  const filteredRecords = payrollRecords.filter(record => {
    const recordFiscalYear = getFiscalYearFromPeriod(record.period);
    const matches = recordFiscalYear === searchFiscalYear;
    log(`[EmployeePayroll] Filter check: period=${record.period}, recordFiscalYear=${recordFiscalYear}, searchFiscalYear=${searchFiscalYear}, matches=${matches}`);
    return matches;
  });
  
  log(`[EmployeePayroll] After filter: filteredRecords.length=${filteredRecords.length}`);
  log(`[EmployeePayroll] Filtered records:`, filteredRecords.map(r => ({
    id: r.id,
    period: r.period,
    employeeName: r.employeeName
  })));

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
      aValue = (a.type === 'bonus' ? a.bonusDetail?.totalEarnings : a.detail?.totalEarnings) || 0;
      bValue = (b.type === 'bonus' ? b.bonusDetail?.totalEarnings : b.detail?.totalEarnings) || 0;
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (sortKey === 'totalDeductions') {
      aValue = (a.type === 'bonus' ? a.bonusDetail?.totalDeductions : a.detail?.totalDeductions) || 0;
      bValue = (b.type === 'bonus' ? b.bonusDetail?.totalDeductions : b.detail?.totalDeductions) || 0;
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (sortKey === 'netPay') {
      aValue = (a.type === 'bonus' ? a.bonusDetail?.netPay : a.detail?.netPay) || 0;
      bValue = (b.type === 'bonus' ? b.bonusDetail?.netPay : b.detail?.netPay) || 0;
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
      year: newPeriod.year,
      month: newPeriod.month,
      type: recordType,
      employeeId: employeeId || '',
      employeeName: payrollRecords[0]?.employeeName || '従業員',
      companyName: '株式会社A・1インテリア',
      period: `${newPeriod.year}年 ${newPeriod.month}月`,
      ...(recordType === 'bonus' ? { bonusDetail: bonusFormData } : { detail: formData })
    } :
    (selectedRecord ? 
      (viewMode === 'preview' ? selectedRecord : { 
        ...selectedRecord, 
        ...(selectedRecord.type === 'bonus' 
          ? { bonusDetail: bonusFormData } 
          : { detail: formData }) 
      }) : 
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
        alignItems: 'flex-start',
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleNew('payroll');
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: fontSizes.button,
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              + 給与明細登録
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleNew('bonus');
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: fontSizes.button,
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              + 賞与明細登録
            </button>
          </div>
        )}
        {viewMode === 'preview' && currentRecord && previewYearMonth && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: isMobile ? '0.875rem' : '0.7rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              年月:
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={previewYearMonth.year || ''}
              onChange={(e) => {
                const num = handleNumberInput(e.target.value);
                if (!isNaN(num) && num >= 2000 && num <= 2100) {
                  handlePreviewYearMonthChange(num, previewYearMonth.month);
                }
              }}
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
                  type="text"
                  inputMode="numeric"
                  value={searchFiscalYear || ''}
                  onChange={(e) => {
                    const num = handleNumberInput(e.target.value);
                    if (!isNaN(num) && num >= 2000 && num <= 2100) {
                      setSearchFiscalYear(num);
                    }
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
                <div style={{ fontSize: fontSizes.small, color: '#6b7280', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                  {searchFiscalYear}年度（{searchFiscalYear}年4月 〜 {searchFiscalYear + 1}年3月）
                </div>
              </div>
              {!isMobile && (
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
                  </button>
                </div>
              )}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                {sortedRecords.map((record) => {
                  const totalEarnings = record.type === 'bonus' ? (record.bonusDetail?.totalEarnings || 0) : (record.detail?.totalEarnings || 0);
                  const totalDeductions = record.type === 'bonus' ? (record.bonusDetail?.totalDeductions || 0) : (record.detail?.totalDeductions || 0);
                  const netPay = record.type === 'bonus' ? (record.bonusDetail?.netPay || 0) : (record.detail?.netPay || 0);
                  return (
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
                        alignItems: 'flex-start',
                      marginBottom: '0.75rem'
                    }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 'bold', fontSize: fontSizes.large }}>
                          {record.period}
                            </div>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              backgroundColor: record.type === 'bonus' ? '#fef3c7' : '#dbeafe',
                              color: record.type === 'bonus' ? '#92400e' : '#1e40af'
                            }}>
                              {getStatementTypeLabel((record.type === 'payroll' ? 'salary' : record.type) || 'salary')}
                            </span>
                        </div>
                        <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                            総支給額: {formatCurrency(totalEarnings)}
                        </div>
                          <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                            控除合計: {formatCurrency(totalDeductions)}
                          </div>
                          <div style={{ fontSize: fontSizes.medium, color: '#1f2937', marginBottom: '0.25rem', fontWeight: 'bold' }}>
                            差引支給額: {formatCurrency(netPay)}
                          </div>
                          <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                            更新者: {record.updatedBy || '-'}
                          </div>
                          <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                          更新日時: {record.updatedAt ? new Date(record.updatedAt).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </div>
                          <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.5rem' }}>
                            メモ: {editingMemoRecordId === record.id ? (
                              <textarea
                                value={editingMemo}
                                onChange={(e) => setEditingMemo(e.target.value)}
                                onBlur={async () => {
                                  try {
                                    await apiRequest(`/api/v1/payroll/${record.id}/memo`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ memo: editingMemo })
                                    });
                                    setPayrollRecords(payrollRecords.map(r => 
                                      r.id === record.id ? { ...r, memo: editingMemo } : r
                                    ));
                                    setEditingMemoRecordId(null);
                                    setEditingMemo('');
                                    setSnackbar({ message: 'メモを保存しました', type: 'success' });
                                    setTimeout(() => setSnackbar(null), 3000);
                                  } catch (error) {
                                    logError('メモの保存に失敗しました', error);
                                    setSnackbar({ message: 'メモの保存に失敗しました', type: 'error' });
                                    setTimeout(() => setSnackbar(null), 3000);
                                    setEditingMemoRecordId(null);
                                    setEditingMemo('');
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditingMemoRecordId(null);
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
                                  marginTop: '0.25rem',
                                  resize: 'vertical',
                                  fontFamily: 'inherit'
                                }}
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingMemoRecordId(record.id);
                                  setEditingMemo(record.memo || '');
                                }}
                                style={{
                                  cursor: 'pointer',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid transparent',
                                  transition: 'background-color 0.2s',
                                  display: 'inline-block',
                                  marginTop: '0.25rem',
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
                                {record.memo || '（クリックして編集）'}
                              </span>
                            )}
                      </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => handleView(record)}
                          title="給与明細を閲覧"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            flex: 1,
                            justifyContent: 'center',
                            fontSize: fontSizes.button
                          }}
                        >
                          <ViewIcon size={16} color="#2563eb" />
                          閲覧
                        </Button>
                        <button
                          onClick={() => handleEdit(record)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'transparent',
                            backgroundColor: 'transparent',
                            border: '1px solid #2563eb',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2563eb',
                            transition: 'background-color 0.2s',
                            boxShadow: 'none',
                            minHeight: 'auto',
                            minWidth: 'auto',
                            flex: 1
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="編集"
                        >
                          <EditIcon size={16} color="#2563eb" />
                          編集
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                        style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none', width: '120px', minWidth: '120px', maxWidth: '120px' }}
                        onClick={() => handleSort('period')}
                      >
                        {getSortIcon('period')} 期間
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', width: '100px', minWidth: '100px', maxWidth: '100px' }}>種類</th>
                      <th 
                        style={{ padding: '0.75rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none', width: '150px', minWidth: '150px', maxWidth: '150px'  }}
                        onClick={() => handleSort('totalEarnings')}
                      >
                        {getSortIcon('totalEarnings')} 総支給額
                      </th>
                      <th 
                        style={{ padding: '0.75rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none', width: '150px', minWidth: '150px', maxWidth: '150px'  }}
                        onClick={() => handleSort('totalDeductions')}
                      >
                        {getSortIcon('totalDeductions')} 控除合計
                      </th>
                      <th 
                        style={{ padding: '0.75rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none', width: '150px', minWidth: '150px', maxWidth: '150px'  }}
                        onClick={() => handleSort('netPay')}
                      >
                        {getSortIcon('netPay')} 差引支給額
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>メモ</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', width: '120px', minWidth: '120px', maxWidth: '120px' }}>更新者</th>
                      <th 
                        style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none', width: '170px', minWidth: '170px', maxWidth: '170px' }}
                        onClick={() => handleSort('updatedAt')}
                      >
                        {getSortIcon('updatedAt')} 更新日時
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' ,width: '100px', minWidth: '100px', maxWidth: '100px' }}>明細詳細</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' ,width: '100px', minWidth: '100px', maxWidth: '100px' }}>編集</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((record) => {
                      const totalEarnings = record.type === 'bonus' ? (record.bonusDetail?.totalEarnings || 0) : (record.detail?.totalEarnings || 0);
                      const totalDeductions = record.type === 'bonus' ? (record.bonusDetail?.totalDeductions || 0) : (record.detail?.totalDeductions || 0);
                      const netPay = record.type === 'bonus' ? (record.bonusDetail?.netPay || 0) : (record.detail?.netPay || 0);
                      return (
                      <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 'bold', width: '120px', minWidth: '120px', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.period}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', width: '100px', minWidth: '100px', maxWidth: '100px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: 'bold',
                              backgroundColor: record.type === 'bonus' ? '#fef3c7' : '#dbeafe',
                              color: record.type === 'bonus' ? '#92400e' : '#1e40af'
                            }}>
                              {getStatementTypeLabel((record.type === 'payroll' ? 'salary' : record.type) || 'salary')}
                            </span>
                          </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            {formatCurrency(totalEarnings)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {formatCurrency(totalDeductions)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatCurrency(netPay)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>
                          {editingMemoRecordId === record.id ? (
                            <textarea
                              value={editingMemo}
                              onChange={(e) => setEditingMemo(e.target.value)}
                              onBlur={async () => {
                                try {
                                  // API呼び出し（即座に保存）
                                  await apiRequest(`/api/v1/payroll/${record.id}/memo`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ memo: editingMemo })
                                  });
                                  
                                  // ローカル状態を更新
                                  setPayrollRecords(payrollRecords.map(r => 
                                    r.id === record.id ? { ...r, memo: editingMemo } : r
                                  ));
                                  setEditingMemoRecordId(null);
                                  setEditingMemo('');
                                  setSnackbar({ message: 'メモを保存しました', type: 'success' });
                                  setTimeout(() => setSnackbar(null), 3000);
                                } catch (error) {
                                  logError('メモの保存に失敗しました', error);
                                  setSnackbar({ message: 'メモの保存に失敗しました', type: 'error' });
                                  setTimeout(() => setSnackbar(null), 3000);
                                  setEditingMemoRecordId(null);
                                  setEditingMemo('');
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingMemoRecordId(null);
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
                                setEditingMemoRecordId(record.id);
                                setEditingMemo(record.memo || '');
                              }}
                              style={{
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                minHeight: '1.5rem',
                                whiteSpace: 'pre-wrap',
                                border: '1px solid transparent',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.borderColor = '#d1d5db';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = 'transparent';
                              }}
                              title={record.memo || '（クリックして編集）'}
                            >
                              {record.memo || '（クリックして編集）'}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', width: '120px', minWidth: '120px', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {record.updatedBy || '-'}
                        </td>
                        <td style={{ padding: '0.75rem', width: '140px', minWidth: '140px', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {record.updatedAt ? new Date(record.updatedAt).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleView(record)}
                            title="給与明細を閲覧"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.05rem',
                              minWidth: '100px',
                              fontSize: fontSizes.button
                            }}
                          >
                            <ViewIcon size={16} color="#2563eb" />
                            閲覧
                          </Button>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {isMobile ? (
                            <EditButton
                              onClick={() => handleEdit(record)}
                              size="small"
                            />
                          ) : (
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
            <BackButton
              onClick={() => navigate('/admin/employees')}
              style={{ whiteSpace: 'nowrap' }}
            />
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
                    type="text"
                    inputMode="numeric"
                    value={newPeriod.year || ''}
                    onChange={(e) => {
                      const num = handleNumberInput(e.target.value);
                      if (!isNaN(num) && num >= 2000 && num <= 2100) {
                        setNewPeriod({ ...newPeriod, year: num });
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
          {viewMode === 'preview' && currentRecord && (
            <div ref={payslipRef} style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              fontFamily: 'sans-serif',
              color: '#1f2937'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                  {getStatementTypeLabel((currentRecord.type === 'payroll' ? 'salary' : currentRecord.type) || 'salary')}書
                </h1>
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

              {currentRecord.type === 'bonus' && 'bonusDetail' in currentRecord && currentRecord.bonusDetail ? (
                // 賞与明細のプレビュー
                <>
                  {/* 支給セクション */}
                  <div style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#f3f4f6', padding: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>
                      支給
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: 'bold' }}>賞与</div>
                        <div style={{ fontWeight: 'bold' }}>{formatCurrency(currentRecord.bonusDetail.bonus)}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.5rem', borderTop: '2px solid #1f2937' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>総支給額</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{formatCurrency(currentRecord.bonusDetail.totalEarnings)}</div>
                      </div>
                    </div>
                  </div>

                  {/* 控除セクション */}
                  <div style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#f3f4f6', padding: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>
                      控除
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <div>健康保険料</div>
                        <div style={{ fontWeight: 'bold' }}>{formatCurrency(currentRecord.bonusDetail.healthInsurance)}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <div>厚生年金保険料</div>
                        <div style={{ fontWeight: 'bold' }}>{formatCurrency(currentRecord.bonusDetail.employeePension)}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <div>雇用保険料</div>
                        <div style={{ fontWeight: 'bold' }}>{formatCurrency(currentRecord.bonusDetail.employmentInsurance)}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <div>所得税</div>
                        <div style={{ fontWeight: 'bold' }}>{formatCurrency(currentRecord.bonusDetail.incomeTax)}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.5rem', borderTop: '2px solid #1f2937' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>控除合計</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{formatCurrency(currentRecord.bonusDetail.totalDeductions)}</div>
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
                      {formatCurrency(currentRecord.bonusDetail.netPay)}
                    </div>
                  </div>
                </>
              ) : 'detail' in currentRecord && currentRecord.detail ? (
                // 給与明細のプレビュー（既存）
                <>
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
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>稼働時間</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                      {(() => {
                        const hours = Math.floor((currentRecord.detail.totalWorkHours || 0) / 60);
                        const minutes = (currentRecord.detail.totalWorkHours || 0) % 60;
                        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                      })()}
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
                      const amount = currentRecord.detail?.allowances?.[allowance.id] || 0;
                      if (amount === 0) return null;
                      return (
                        <div key={allowance.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                          <div>{allowance.name}{allowance.includeInOvertime ? '*' : ''}</div>
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
                      const amount = currentRecord.detail?.deductions?.[deduction.id] || 0;
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
                </>
              ) : null}
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
              <BackButton
                onClick={() => {
                  setViewMode('list');
                  window.history.pushState({ viewMode: 'list' }, '', window.location.pathname);
                }}
                style={{ whiteSpace: 'nowrap' }}
              />
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
                {viewMode === 'new' ? `${getStatementTypeLabel(recordType === 'bonus' ? 'bonus' : 'salary')}登録` : `${getStatementTypeLabel((selectedRecord?.type === 'payroll' ? 'salary' : selectedRecord?.type) || 'salary')}編集`}
              </h3>

              {/* 給与明細の場合のみ勤務情報を表示 */}
              {((viewMode === 'new' && recordType === 'payroll') || (viewMode === 'edit' && selectedRecord?.type !== 'bonus')) && (
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
                      type="text"
                      inputMode="numeric"
                      value={formData.workingDays === 0 ? '0' : (formData.workingDays || '')}
                      onChange={(e) => {
                        const num = handleNumberInput(e.target.value);
                        if (!isNaN(num)) {
                          setFormData({ ...formData, workingDays: num });
                        }
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>休日出勤</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.holidayWork === 0 ? '0' : (formData.holidayWork || '')}
                      onChange={(e) => {
                        const num = handleNumberInput(e.target.value);
                        if (!isNaN(num)) {
                          setFormData({ ...formData, holidayWork: num });
                        }
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>有給休暇</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.paidLeave === 0 ? '0' : (formData.paidLeave || '')}
                      onChange={(e) => {
                        const num = handleNumberInput(e.target.value);
                        if (!isNaN(num)) {
                          setFormData({ ...formData, paidLeave: num });
                        }
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>有給残</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.paidLeaveRemaining === 0 ? '0' : (formData.paidLeaveRemaining || '')}
                      onChange={(e) => {
                        const num = handleNumberInput(e.target.value, true);
                        if (!isNaN(num)) {
                          setFormData({ ...formData, paidLeaveRemaining: num });
                        }
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>稼働時間 (時間)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.totalWorkHours === 0 ? '0' : (Math.round((formData.totalWorkHours || 0) / 60 * 100) / 100).toString()}
                      onChange={(e) => {
                        const num = handleNumberInput(e.target.value, true);
                        if (!isNaN(num)) {
                          // 時間を分に変換して保存
                          setFormData({ ...formData, totalWorkHours: Math.round(num * 60) });
                        }
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>普通残業 (時間)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.normalOvertime === 0 ? '0' : (formData.normalOvertime || '')}
                      onChange={(e) => {
                        const num = handleNumberInput(e.target.value);
                        if (!isNaN(num)) {
                          setFormData({ ...formData, normalOvertime: num });
                        }
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>深夜残業 (時間)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.lateNightOvertime === 0 ? '0' : (formData.lateNightOvertime || '')}
                      onChange={(e) => {
                        const num = handleNumberInput(e.target.value);
                        if (!isNaN(num)) {
                          setFormData({ ...formData, lateNightOvertime: num });
                        }
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
              )}

              {/* 支給・控除セクション（横並び） */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                {/* 支給 */}
                <div style={{ flex: 1, padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: isMobile ? fontSizes.h4.mobile : fontSizes.h4.desktop, fontWeight: 'bold' }}>支給</h4>
                  {/* 給与明細の場合 */}
                  {((viewMode === 'new' && recordType === 'payroll') || (viewMode === 'edit' && selectedRecord?.type !== 'bonus')) ? (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: fontSizes.label }}>
                        基本給
                        <Tooltip content="【算出ロジック】正社員: 従業員テーブルから取得した月額基本給。パートタイム: 時給 × 稼働時間（時間）。">
                          <InfoIcon size={16} color="#3b82f6" />
                        </Tooltip>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.baseSalary === 0 ? '0' : (formData.baseSalary || '')}
                        onChange={(e) => {
                          const num = handleNumberInput(e.target.value);
                          if (!isNaN(num)) {
                            setFormData({ ...formData, baseSalary: num });
                          }
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
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: fontSizes.label }}>
                        時間外手当
                        <Tooltip content={`【算出ロジック】\n残業単価 = (基本給 + 残業代に含む手当（*マーク付き）の金額合計) ÷ 20.5 ÷ 7.5\n時間外手当 = 残業単価 × 1.25倍 × (普通残業時間（分） ÷ 60)\n\n※端数処理: 切り上げ（1円単位）\n※簡易版として平均単価率1.25倍を使用（時間帯別・曜日別の単価率は未実装）`}>
                          <InfoIcon size={16} color="#3b82f6" />
                        </Tooltip>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.overtimeAllowance === 0 ? '0' : (formData.overtimeAllowance || '')}
                        onChange={(e) => {
                          const num = handleNumberInput(e.target.value);
                          if (!isNaN(num)) {
                            setFormData({ ...formData, overtimeAllowance: num });
                          }
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
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: fontSizes.label }}>
                        深夜手当
                        <Tooltip content={`【算出ロジック】\n残業単価 = (基本給 + 残業代に含む手当（*マーク付き）の金額合計) ÷ 20.5 ÷ 7.5\n深夜手当 = 残業単価 × 1.50倍 × (深夜残業時間（分） ÷ 60)\n\n※端数処理: 切り上げ（1円単位）\n※深夜時間帯: 22:00-04:59`}>
                          <InfoIcon size={16} color="#3b82f6" />
                        </Tooltip>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.lateNightAllowance === 0 ? '0' : (formData.lateNightAllowance || '')}
                        onChange={(e) => {
                          const num = handleNumberInput(e.target.value);
                          if (!isNaN(num)) {
                            setFormData({ ...formData, lateNightAllowance: num });
                          }
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
                    {/* 手当マスタから動的に入力フィールドを生成 */}
                    {allowances.map(allowance => (
                      <div key={allowance.id}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>
                          {allowance.name}{allowance.includeInOvertime ? '*' : ''}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.allowances[allowance.id] === 0 ? '0' : (formData.allowances[allowance.id] || '')}
                          onChange={(e) => {
                            const num = handleNumberInput(e.target.value);
                            if (!isNaN(num)) {
                              setFormData({
                                ...formData,
                                allowances: {
                                  ...formData.allowances,
                                  [allowance.id]: num
                                }
                              });
                            }
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
                    ))}
                  </div>
                  ) : (
                    /* 賞与明細の場合 - 賞与項目のみ */
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>賞与</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bonusFormData.bonus || ''}
                          onChange={(e) => {
                            const num = handleNumberInput(e.target.value);
                            if (!isNaN(num)) {
                              setBonusFormData({
                                ...bonusFormData,
                                bonus: num
                              });
                            }
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
                  )}
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#dbeafe', borderRadius: '4px', textAlign: 'right' }}>
                    <strong>総支給額: {formatCurrency(((viewMode === 'new' && recordType === 'payroll') || (viewMode === 'edit' && selectedRecord?.type !== 'bonus')) ? formData.totalEarnings : bonusFormData.totalEarnings)}</strong>
                  </div>
                </div>

                {/* 控除 */}
                <div style={{ flex: 1, padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: isMobile ? fontSizes.h4.mobile : fontSizes.h4.desktop, fontWeight: 'bold' }}>控除</h4>
                  {/* 給与明細の場合 */}
                  {((viewMode === 'new' && recordType === 'payroll') || (viewMode === 'edit' && selectedRecord?.type !== 'bonus')) ? (
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
                          type="text"
                          inputMode="numeric"
                          value={formData.deductions[deduction.id] === 0 ? '0' : (formData.deductions[deduction.id] || '')}
                          onChange={(e) => {
                            const num = handleNumberInput(e.target.value);
                            if (!isNaN(num)) {
                              setFormData({
                                ...formData,
                                deductions: {
                                  ...formData.deductions,
                                  [deduction.id]: num
                                }
                              });
                            }
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
                    ))}
                  </div>
                  ) : (
                    /* 賞与明細の場合 - 健康保険料、厚生年金保険料、雇用保険料、所得税のみ */
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                      gap: '1rem'
                    }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>健康保険料</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bonusFormData.healthInsurance || ''}
                          onChange={(e) => {
                            const num = handleNumberInput(e.target.value);
                            if (!isNaN(num)) {
                              const healthInsurance = num;
                              const totalDeductions = healthInsurance + bonusFormData.employeePension + bonusFormData.employmentInsurance + bonusFormData.incomeTax;
                              const netPay = bonusFormData.totalEarnings - totalDeductions;
                              setBonusFormData({
                                ...bonusFormData,
                                healthInsurance,
                                totalDeductions,
                                netPay
                              });
                            }
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>厚生年金保険料</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bonusFormData.employeePension || ''}
                          onChange={(e) => {
                            const num = handleNumberInput(e.target.value);
                            if (!isNaN(num)) {
                              const employeePension = num;
                              const totalDeductions = bonusFormData.healthInsurance + employeePension + bonusFormData.employmentInsurance + bonusFormData.incomeTax;
                              const netPay = bonusFormData.totalEarnings - totalDeductions;
                              setBonusFormData({
                                ...bonusFormData,
                                employeePension,
                                totalDeductions,
                                netPay
                              });
                            }
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>雇用保険料</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bonusFormData.employmentInsurance || ''}
                          onChange={(e) => {
                            const num = handleNumberInput(e.target.value);
                            if (!isNaN(num)) {
                              const employmentInsurance = num;
                              const totalDeductions = bonusFormData.healthInsurance + bonusFormData.employeePension + employmentInsurance + bonusFormData.incomeTax;
                              const netPay = bonusFormData.totalEarnings - totalDeductions;
                              setBonusFormData({
                                ...bonusFormData,
                                employmentInsurance,
                                totalDeductions,
                                netPay
                              });
                            }
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>所得税</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bonusFormData.incomeTax || ''}
                          onChange={(e) => {
                            const num = handleNumberInput(e.target.value);
                            if (!isNaN(num)) {
                              const incomeTax = num;
                              const totalDeductions = bonusFormData.healthInsurance + bonusFormData.employeePension + bonusFormData.employmentInsurance + incomeTax;
                              const netPay = bonusFormData.totalEarnings - totalDeductions;
                              setBonusFormData({
                                ...bonusFormData,
                                incomeTax,
                                totalDeductions,
                                netPay
                              });
                            }
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
                  )}
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px', textAlign: 'right' }}>
                    <strong>控除合計: {formatCurrency(((viewMode === 'new' && recordType === 'payroll') || (viewMode === 'edit' && selectedRecord?.type !== 'bonus')) ? formData.totalDeductions : bonusFormData.totalDeductions)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '4px', textAlign: 'right' }}>
                <strong style={{ fontSize: '1.25rem' }}>差引支給額: {formatCurrency(((viewMode === 'new' && recordType === 'payroll') || (viewMode === 'edit' && selectedRecord?.type !== 'bonus')) ? formData.netPay : bonusFormData.netPay)}</strong>
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
              <BackButton
                onClick={handleCancel}
                style={{ whiteSpace: 'nowrap' }}
              />
              <div style={{ flex: 1, display: 'flex', justifyContent: isMobile ? 'flex-end' : 'center' }}>
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
              {!isMobile && <div style={{ width: '120px' }}></div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
