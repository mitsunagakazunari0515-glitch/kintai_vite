/**
 * ファイル名: Payroll.tsx
 * 画面名: 給与明細書入力・出力画面
 * 説明: 給与明細の新規登録、一覧表示、PDF出力を提供する画面
 * 機能:
 *   - 給与明細の新規登録
 *   - 登録済み給与明細の一覧表示
 *   - 給与明細のプレビュー表示
 *   - PDF出力機能
 *   - 勤務情報、支給、控除の入力
 */

import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { Snackbar } from '../../components/Snackbar';

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
  /** 交通費。 */
  commutingAllowance: number;
  /** 住宅手当。 */
  housingAllowance: number;
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
  /** 給与期間（例: "2025年 10月"）。 */
  period: string;
  /** 給与明細の詳細情報。 */
  detail: PayrollDetail;
}

/**
 * 給与明細書入力・出力画面コンポーネント。
 * 給与明細の新規登録、一覧表示、PDF出力を提供します。
 *
 * @returns {JSX.Element} 給与明細書入力・出力画面コンポーネント。
 */
export const Payroll: React.FC = () => {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showModal, setShowModal] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const payslipRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Omit<PayrollRecord, 'id'>>({
    employeeId: '',
    employeeName: '',
    companyName: '株式会社A・1インテリア',
    period: '',
    detail: {
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
      totalEarnings: 0,
      socialInsurance: 0,
      employeePension: 0,
      employmentInsurance: 0,
      municipalTax: 0,
      incomeTax: 0,
      totalDeductions: 0,
      netPay: 0
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // 総支給額と控除合計、差引支給額を自動計算
    const totalEarnings = formData.detail.baseSalary + 
      formData.detail.overtimeAllowance + 
      formData.detail.lateNightAllowance + 
      formData.detail.mealAllowance + 
      formData.detail.commutingAllowance + 
      formData.detail.housingAllowance;
    
    const totalDeductions = formData.detail.socialInsurance + 
      formData.detail.employeePension + 
      formData.detail.employmentInsurance + 
      formData.detail.municipalTax + 
      formData.detail.incomeTax;
    
    const netPay = totalEarnings - totalDeductions;

    setFormData(prev => ({
      ...prev,
      detail: {
        ...prev.detail,
        totalEarnings,
        totalDeductions,
        netPay
      }
    }));
  }, [
    formData.detail.baseSalary,
    formData.detail.overtimeAllowance,
    formData.detail.lateNightAllowance,
    formData.detail.mealAllowance,
    formData.detail.commutingAllowance,
    formData.detail.housingAllowance,
    formData.detail.socialInsurance,
    formData.detail.employeePension,
    formData.detail.employmentInsurance,
    formData.detail.municipalTax,
    formData.detail.incomeTax
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.employeeName || !formData.period) {
      setSnackbar({ message: '必須項目を入力してください', type: 'error' });
      return;
    }

    const newRecord: PayrollRecord = {
      id: Date.now().toString(),
      ...formData
    };
    setRecords([newRecord, ...records]);
    setSnackbar({ message: '給与明細を登録しました', type: 'success' });
    
    // フォームリセット
    setFormData({
      employeeId: '',
      employeeName: '',
      companyName: '株式会社A・1インテリア',
      period: '',
      detail: {
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
        totalEarnings: 0,
        socialInsurance: 0,
        employeePension: 0,
        employmentInsurance: 0,
        municipalTax: 0,
        incomeTax: 0,
        totalDeductions: 0,
        netPay: 0
      }
    });
  };


  const handleViewPayslip = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setShowModal(true);
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

  return (
    <div>
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
      <h2 style={{ marginBottom: isMobile ? '1rem' : '1.4rem', fontSize: isMobile ? '1.25rem' : '1.05rem' }}>
        給与明細書入力・出力
      </h2>

      {/* 入力フォーム */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '0.7rem', fontSize: isMobile ? '1.125rem' : '0.875rem' }}>給与明細入力</h3>
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f9fafb',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '8px'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                従業員ID *
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
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
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                氏名 *
              </label>
              <input
                type="text"
                value={formData.employeeName}
                onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
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
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                会社名 *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
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
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                期間 * (例: 2025年 10月)
              </label>
              <input
                type="text"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                placeholder="2025年 10月"
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
          </div>

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
                  value={formData.detail.workingDays}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, workingDays: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>休日出勤</label>
                <input
                  type="number"
                  value={formData.detail.holidayWork}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, holidayWork: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>有給休暇</label>
                <input
                  type="number"
                  value={formData.detail.paidLeave}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, paidLeave: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>有給残</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.detail.paidLeaveRemaining}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, paidLeaveRemaining: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>有給残時点</label>
                <input
                  type="text"
                  value={formData.detail.paidLeaveRemainingDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, paidLeaveRemainingDate: e.target.value }
                  })}
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
                  value={formData.detail.normalOvertime}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, normalOvertime: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>深夜残業 (時間)</label>
                <input
                  type="number"
                  value={formData.detail.lateNightOvertime}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, lateNightOvertime: Number(e.target.value) }
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
            </div>
          </div>

          {/* 支給 */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: isMobile ? fontSizes.h4.mobile : fontSizes.h4.desktop, fontWeight: 'bold' }}>支給</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: '1rem'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>基本給</label>
                <input
                  type="number"
                  value={formData.detail.baseSalary}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, baseSalary: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>時間外手当</label>
                <input
                  type="number"
                  value={formData.detail.overtimeAllowance}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, overtimeAllowance: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>深夜手当</label>
                <input
                  type="number"
                  value={formData.detail.lateNightAllowance}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, lateNightAllowance: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>食事手当</label>
                <input
                  type="number"
                  value={formData.detail.mealAllowance}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, mealAllowance: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>交通費</label>
                <input
                  type="number"
                  value={formData.detail.commutingAllowance}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, commutingAllowance: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>住宅手当</label>
                <input
                  type="number"
                  value={formData.detail.housingAllowance}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, housingAllowance: Number(e.target.value) }
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
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#dbeafe', borderRadius: '4px', textAlign: 'right' }}>
              <strong>総支給額: {formatCurrency(formData.detail.totalEarnings)}</strong>
            </div>
          </div>

          {/* 控除 */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: isMobile ? fontSizes.h4.mobile : fontSizes.h4.desktop, fontWeight: 'bold' }}>控除</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: '1rem'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>社会保険</label>
                <input
                  type="number"
                  value={formData.detail.socialInsurance}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, socialInsurance: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>厚生年金</label>
                <input
                  type="number"
                  value={formData.detail.employeePension}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, employeePension: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>雇用保険</label>
                <input
                  type="number"
                  value={formData.detail.employmentInsurance}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, employmentInsurance: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>市県民税</label>
                <input
                  type="number"
                  value={formData.detail.municipalTax}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, municipalTax: Number(e.target.value) }
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: fontSizes.label }}>所得税</label>
                <input
                  type="number"
                  value={formData.detail.incomeTax}
                  onChange={(e) => setFormData({
                    ...formData,
                    detail: { ...formData.detail, incomeTax: Number(e.target.value) }
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
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px', textAlign: 'right' }}>
              <strong>控除合計: {formatCurrency(formData.detail.totalDeductions)}</strong>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '4px', textAlign: 'right' }}>
            <strong style={{ fontSize: '1.25rem' }}>差引支給額: {formatCurrency(formData.detail.netPay)}</strong>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            登録
          </button>
        </form>
      </div>

      {/* 登録済み給与明細一覧 */}
      <div>
        <h3 style={{ marginBottom: '0.7rem', fontSize: isMobile ? '1.125rem' : '0.875rem' }}>登録済み給与明細</h3>
        <div style={{
          backgroundColor: '#f9fafb',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '8px'
        }}>
          {records.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>登録された給与明細はありません</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {records.map((record) => (
                <div
                  key={record.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {record.employeeName} - {record.period}
                    </div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>
                      差引支給額: {formatCurrency(record.detail.netPay)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewPayslip(record)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: fontSizes.button,
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    表示
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 給与明細書モーダル */}
      {showModal && selectedRecord && (
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
        onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: isMobile ? '1rem' : '1.4rem',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? '1.125rem' : '0.875rem' }}>給与明細書</h3>
              <button
                onClick={handleExportPDF}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: fontSizes.tableCell,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                PDF出力
              </button>
            </div>

            {/* 給与明細書の内容 */}
            <div ref={payslipRef} style={{
              backgroundColor: 'white',
              padding: '2rem',
              fontFamily: 'sans-serif',
              color: '#1f2937'
            }}>
              {/* タイトル */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>給与明細書</h1>
              </div>

              {/* ヘッダー情報 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {selectedRecord.companyName}
                  </div>
                  <div style={{ fontSize: fontSizes.large }}>
                    氏名 {selectedRecord.employeeName}様
                  </div>
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                  {selectedRecord.period}
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
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{selectedRecord.detail.workingDays}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>休日出勤</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{selectedRecord.detail.holidayWork}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>有給休暇</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{selectedRecord.detail.paidLeave}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>有給残</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                      {selectedRecord.detail.paidLeaveRemaining}
                      {selectedRecord.detail.paidLeaveRemainingDate && ` (${selectedRecord.detail.paidLeaveRemainingDate}時点)`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>普通残業</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{String(selectedRecord.detail.normalOvertime).padStart(2, '0')}:00</div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>深夜残業</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{String(selectedRecord.detail.lateNightOvertime).padStart(2, '0')}:00</div>
                  </div>
                </div>
              </div>

              {/* 支給セクション */}
              <div style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f3f4f6', padding: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>
                  支給
                </div>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>基本給</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.baseSalary)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>時間外手当</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.overtimeAllowance)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>深夜手当</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.lateNightAllowance)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>食事手当</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.mealAllowance)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>交通費</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.commutingAllowance)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>住宅手当</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.housingAllowance)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.5rem', borderTop: '2px solid #1f2937' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>総支給額</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{formatCurrency(selectedRecord.detail.totalEarnings)}</div>
                  </div>
                </div>
              </div>

              {/* 控除セクション */}
              <div style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f3f4f6', padding: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>
                  控除
                </div>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>社会保険</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.socialInsurance)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>厚生年金</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.employeePension)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>雇用保険</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.employmentInsurance)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>市県民税</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.municipalTax)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div>所得税</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(selectedRecord.detail.incomeTax)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.5rem', borderTop: '2px solid #1f2937' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>控除合計</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{formatCurrency(selectedRecord.detail.totalDeductions)}</div>
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
                  {formatCurrency(selectedRecord.detail.netPay)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: fontSizes.large,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
