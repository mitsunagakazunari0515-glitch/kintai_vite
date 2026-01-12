/**
 * ファイル名: EmployeeRegistration.tsx
 * 画面名: 従業員登録・編集画面
 * 説明: 従業員の新規登録および既存従業員の情報編集を行う画面
 * 機能:
 *   - 従業員の新規登録
 *   - 従業員情報の編集
 *   - 雇用形態（正社員/パート）の設定
 *   - 基本給（時給）の設定
 *   - 管理者フラグの設定
 *   - 手当の複数選択
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Snackbar } from '../../components/Snackbar';
import { Button, CancelButton } from '../../components/Button';
import { fontSizes } from '../../config/fontSizes';
import { getEmploymentTypes } from '../../config/masterData';
import { formatCurrency } from '../../utils/formatters';
import { createEmployee, updateEmployee, getEmployee, CreateEmployeeRequest } from '../../utils/employeeApi';
import { getAllowances } from '../../utils/allowanceApi';
import { error as logError } from '../../utils/logger';
import { translateApiError } from '../../utils/apiErrorTranslator';

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
  includeInOvertime: boolean;
}

/**
 * 従業員を表すインターフェース。
 */
interface Employee {
  /** 従業員ID。 */
  id: string;
  /** 苗字（姓）。 */
  firstName: string;
  /** 名前（名）。 */
  lastName: string;
  /** 雇用形態コード。 */
  employmentType: 'FULL_TIME' | 'PART_TIME';
  /** メールアドレス。 */
  email: string;
  /** 入社日。 */
  joinDate: string;
  /** 退社日。nullの場合は在籍中。 */
  leaveDate: string | null;
  /** 手当IDの配列。 */
  allowances: string[];
  /** 基本給（正社員の場合は月給、パートの場合は時給）。 */
  baseSalary: number;
  /** 基本休憩時間（分）。 */
  defaultBreakTime: number;
  /** 管理者フラグ。 */
  isAdmin: boolean;
  /** 有給情報の配列。 */
  paidLeaves: Array<{
    grantDate: string;  // 有給付与日（YYYY-MM-DD）
    days: number;       // 付与された有給日数
  }>;
}

/**
 * 従業員登録・編集画面コンポーネント。
 * 従業員の新規登録および既存従業員の情報編集を行います。
 *
 * @returns {JSX.Element} 従業員登録・編集画面コンポーネント。
 */
export const EmployeeRegistration: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isEditing] = useState(!!id);
  const employmentTypes = getEmploymentTypes();
  
  // 手当マスタ（localStorageから読み込む、なければAPIから取得）
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [isLoadingAllowances, setIsLoadingAllowances] = useState<boolean>(true);

  const [formData, setFormData] = useState<Employee>({
    id: '',
    firstName: '',
    lastName: '',
    employmentType: (employmentTypes[0]?.code || 'FULL_TIME') as 'FULL_TIME' | 'PART_TIME',
    email: '',
    joinDate: '',
    leaveDate: null,
    allowances: [],
    baseSalary: 0,
    defaultBreakTime: 60,
    isAdmin: false,
    paidLeaves: []
  });
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 従業員IDの自動採番関数
  // 実際の実装では、既存の従業員リストから最大のIDを取得して+1する
  // ここでは簡易的に、既存のダミーデータ（EMP001, EMP002）を考慮して次のIDを生成
  const generateEmployeeId = (): string => {
    // 実際の実装では、APIから既存の従業員リストを取得して最大の番号を計算する
    // ここでは、既存のダミーデータの最大番号（2）を考慮して、次のID（EMP003）を生成
    // 実際の実装では、以下のようなロジックを使用：
    // const existingIds = employees.map(emp => {
    //   const match = emp.id.match(/^EMP(\d+)$/);
    //   return match ? parseInt(match[1], 10) : 0;
    // }).filter(num => num > 0);
    // const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    // const nextNum = maxNum + 1;
    // return `EMP${String(nextNum).padStart(3, '0')}`;
    const existingMaxNum = 2; // 実際の実装では、既存の従業員から最大の番号を取得
    const nextNum = existingMaxNum + 1;
    return `EMP${String(nextNum).padStart(3, '0')}`;
  };

  useEffect(() => {
    const loadEmployeeData = async () => {
      if (isEditing && id) {
        // 編集モードの場合、APIから既存データを取得
        try {
          const employee = await getEmployee(id);
          setFormData({
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            employmentType: employee.employmentType,
            email: employee.email,
            joinDate: employee.joinDate,
            leaveDate: employee.leaveDate,
            allowances: employee.allowances,
            isAdmin: employee.isAdmin,
            baseSalary: employee.baseSalary,
            defaultBreakTime: employee.defaultBreakTime,
            paidLeaves: employee.paidLeaves
          });
        } catch (error) {
          logError('Failed to load employee data:', error);
          setSnackbar({ message: '従業員情報の取得に失敗しました', type: 'error' });
          setTimeout(() => {
            navigate('/admin/employees');
          }, 2000);
        }
      }
    };

    loadEmployeeData();
  }, [id, isEditing, navigate]);

  // 手当マスタを読み込む（localStorageから読み込み、なければAPIから取得）
  useEffect(() => {
    const loadAllowances = async () => {
      setIsLoadingAllowances(true);
      try {
        // localStorageから手当マスタを読み込む
        const storedAllowances = localStorage.getItem('allowances');
        if (storedAllowances) {
          try {
            const parsedAllowances = JSON.parse(storedAllowances);
            setAllowances(parsedAllowances);
            setIsLoadingAllowances(false);
            return;
          } catch (parseError) {
            // パースエラー時はAPIから取得する（ログは不要）
            // パースエラー時はAPIから取得する
          }
        }
        
        // localStorageにデータがない場合はAPIから取得
        const allowanceResponse = await getAllowances();
        const fetchedAllowances: Allowance[] = allowanceResponse.allowances.map(allowance => ({
          id: allowance.id,
          name: allowance.name,
          color: allowance.color,
          includeInOvertime: allowance.includeInOvertime
        }));
        setAllowances(fetchedAllowances);
        
        // localStorageに保存（次回以降の読み込みを高速化）
        try {
          localStorage.setItem('allowances', JSON.stringify(fetchedAllowances));
        } catch (storageError) {
          // 保存エラーは無視（ログは不要）
        }
      } catch (error: any) {
        logError('Failed to load allowances:', error);
        const errorMessage = translateApiError(error);
        setSnackbar({ message: `手当マスタの取得に失敗しました: ${errorMessage}`, type: 'error' });
        // エラー時は空配列を設定（手当選択不可）
        setAllowances([]);
      } finally {
        setIsLoadingAllowances(false);
      }
    };

    loadAllowances();
  }, []);

  // 給与計算（正社員の場合）
  const calculateDailySalary = (baseSalary: number): number => {
    return Math.round(baseSalary / 20.5);
  };

  const calculateHourlySalary = (baseSalary: number, employmentType: 'FULL_TIME' | 'PART_TIME'): number => {
    if (employmentType === 'FULL_TIME') {
      const dailySalary = calculateDailySalary(baseSalary);
      return Math.round(dailySalary / 7.5);
    }
    return baseSalary; // パートの場合は時給がbaseSalary
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.joinDate) {
      setSnackbar({ message: '必須項目を入力してください', type: 'error' });
      return;
    }
    if (formData.baseSalary <= 0) {
      setSnackbar({ message: '給与を入力してください', type: 'error' });
      return;
    }

    try {
      const payload: CreateEmployeeRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        employmentType: formData.employmentType,
        email: formData.email,
        joinDate: formData.joinDate,
        leaveDate: formData.leaveDate || null,
        allowances: formData.allowances,
        isAdmin: formData.isAdmin,
        baseSalary: formData.baseSalary,
        defaultBreakTime: formData.defaultBreakTime,
        paidLeaves: formData.paidLeaves
      };

      if (isEditing && id) {
        // 更新
        await updateEmployee(id, payload);
        setSnackbar({ message: '従業員情報を更新しました', type: 'success' });
      } else {
        // 登録
        await createEmployee(payload);
        setSnackbar({ message: '従業員を登録しました', type: 'success' });
      }
      
      setTimeout(() => {
        navigate('/admin/employees');
      }, 1500);
    } catch (error) {
      logError('Failed to save employee:', error);
      const errorMessage = error instanceof Error ? error.message : '従業員の保存に失敗しました';
      setSnackbar({ message: errorMessage, type: 'error' });
    }
  };

  const handleAllowanceToggle = (allowanceId: string) => {
    setFormData(prev => ({
      ...prev,
      allowances: prev.allowances.includes(allowanceId)
        ? prev.allowances.filter(id => id !== allowanceId)
        : [...prev.allowances, allowanceId]
    }));
  };

  // 有給情報の追加
  const handleAddPaidLeave = () => {
    setFormData(prev => ({
      ...prev,
      paidLeaves: [
        ...prev.paidLeaves,
        { grantDate: new Date().toISOString().split('T')[0], days: 0 } // デフォルトで今日の日付を設定
      ]
    }));
  };

  // 有給情報の更新
  const handleUpdatePaidLeave = (index: number, field: 'grantDate' | 'days', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      paidLeaves: prev.paidLeaves.map((paidLeave, i) => 
        i === index ? { ...paidLeave, [field]: value } : paidLeave
      )
    }));
  };

  // 有給情報の削除
  const handleRemovePaidLeave = (index: number) => {
    setFormData(prev => ({
      ...prev,
      paidLeaves: prev.paidLeaves.filter((_, i) => i !== index)
    }));
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
        {isEditing ? '従業員編集' : '従業員登録'}
      </h2>
      <div style={{ 
        maxWidth: isMobile ? '100%' : '800px',
        margin: '0 auto'
      }}>
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f9fafb',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              従業員ID {isEditing ? '*' : '(自動採番)'}
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={true}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: fontSizes.input,
                boxSizing: 'border-box',
                backgroundColor: '#f3f4f6',
                color: '#6b7280'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              氏名 *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                  姓
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  maxLength={50}
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
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                  名
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  maxLength={50}
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
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              雇用形態 *
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {employmentTypes.map((type) => (
                <label key={type.code} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  backgroundColor: formData.employmentType === type.code ? '#dbeafe' : 'transparent',
                  border: `2px solid ${formData.employmentType === type.code ? '#2563eb' : '#d1d5db'}`,
                  flex: 1
                }}>
                  <input
                    type="radio"
                    checked={formData.employmentType === type.code}
                        onChange={() => setFormData({ ...formData, employmentType: type.code as 'FULL_TIME' | 'PART_TIME' })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              給与 *
            </label>
            {formData.employmentType === 'FULL_TIME' ? (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                    基本給（月給）
                  </label>
                  <input
                    type="number"
                    value={formData.baseSalary || ''}
                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                    min="0"
                    step="1000"
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
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>日給: </span>
                    <span style={{ fontWeight: 'bold' }}>
                      {formatCurrency(calculateDailySalary(formData.baseSalary))}円
                    </span>
                    <span style={{ fontSize: fontSizes.medium, color: '#6b7280', marginLeft: '0.5rem' }}>
                      （基本給 ÷ 20.5）
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>時給: </span>
                    <span style={{ fontWeight: 'bold' }}>
                      {formatCurrency(calculateHourlySalary(formData.baseSalary, 'FULL_TIME'))}円
                    </span>
                    <span style={{ fontSize: fontSizes.medium, color: '#6b7280', marginLeft: '0.5rem' }}>
                      （日給 ÷ 7.5）
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                  時給
                </label>
                <input
                  type="number"
                  value={formData.baseSalary || ''}
                  onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                  min="0"
                  step="10"
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
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              メールアドレス *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              入社日 *
            </label>
            <input
              type="date"
              value={formData.joinDate}
              onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
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

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              退社日
            </label>
            <input
              type="date"
              value={formData.leaveDate || ''}
              onChange={(e) => setFormData({ ...formData, leaveDate: e.target.value || null })}
              min={formData.joinDate}
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              手当（複数選択可能）
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '1rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              minHeight: '80px'
            }}>
              {isLoadingAllowances ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                  手当マスタを読み込み中...
                </div>
              ) : allowances.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: fontSizes.medium }}>
                  手当マスタで手当を登録してください
                </p>
              ) : (
                allowances.map((allowance) => {
                  const isSelected = formData.allowances.includes(allowance.id);
                  return (
                    <button
                      key={allowance.id}
                      type="button"
                      onClick={() => handleAllowanceToggle(allowance.id)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '16px',
                        background: isSelected ? allowance.color + '20' : 'white',
                        backgroundColor: isSelected ? allowance.color + '20' : 'white',
                        color: isSelected ? allowance.color : '#6b7280',
                        border: isSelected ? `1px solid ${allowance.color}40` : '1px solid #d1d5db',
                        fontSize: fontSizes.badge,
                        fontWeight: isSelected ? 'bold' : 'normal',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: 'none',
                        minHeight: 'auto',
                        minWidth: 'auto'
                      }}
                    >
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: allowance.color
                      }} />
                      {allowance.name}
                    </button>
                  );
                })
              )}
            </div>
            {formData.allowances.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                選択中: {formData.allowances.length}件
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              管理者
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '0.75rem',
              borderRadius: '4px',
              backgroundColor: formData.isAdmin ? '#dbeafe' : 'transparent',
              border: `2px solid ${formData.isAdmin ? '#2563eb' : '#d1d5db'}`,
              width: 'fit-content'
            }}>
              <input
                type="checkbox"
                checked={formData.isAdmin}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                style={{ marginRight: '0.5rem' }}
              />
              管理者権限を付与する
            </label>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold' }}>
                有給情報
              </label>
              <Button
                variant="primary"
                type="button"
                onClick={handleAddPaidLeave}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: fontSizes.button,
                  boxShadow: 'none',
                  minHeight: 'auto',
                  minWidth: 'auto'
                }}
              >
                + 追加
              </Button>
            </div>
            <div style={{
              padding: '1rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              minHeight: '80px'
            }}>
              {formData.paidLeaves.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: fontSizes.medium, textAlign: 'center', padding: '1rem' }}>
                  有給情報がありません。「+ 追加」ボタンで追加してください。
                </p>
              ) : (
                formData.paidLeaves.map((paidLeave, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      marginBottom: index < formData.paidLeaves.length - 1 ? '0.75rem' : 0,
                      borderBottom: index < formData.paidLeaves.length - 1 ? '1px solid #e5e7eb' : 'none',
                      alignItems: 'end'
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                        付与日
                      </label>
                      <input
                        type="date"
                        value={paidLeave.grantDate}
                        onChange={(e) => handleUpdatePaidLeave(index, 'grantDate', e.target.value)}
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
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                        日数
                      </label>
                      <input
                        type="number"
                        value={paidLeave.days !== undefined && paidLeave.days !== null ? paidLeave.days : ''}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // 空文字の場合は0に設定
                          const numValue = inputValue === '' ? 0 : Number(inputValue);
                          handleUpdatePaidLeave(index, 'days', numValue);
                        }}
                        min="0"
                        step="1"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: fontSizes.input,
                          boxSizing: 'border-box'
                        }}
                        placeholder="例: 10"
                      />
                    </div>
                    <div>
                      <Button
                        variant="icon-delete"
                        type="button"
                        onClick={() => handleRemovePaidLeave(index)}
                        title="削除"
                        style={{
                          boxShadow: 'none',
                          minHeight: 'auto',
                          minWidth: 'auto'
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              基本休憩時間（分）
            </label>
            <input
              type="number"
              value={formData.defaultBreakTime || ''}
              onChange={(e) => setFormData({ ...formData, defaultBreakTime: Number(e.target.value) })}
              min="0"
              step="15"
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

          <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
            <CancelButton
              fullWidth
              type="button"
              onClick={() => navigate('/admin/employees')}
            />
            <Button
              variant="primary"
              fullWidth
              type="submit"
            >
              {isEditing ? '更新' : '登録'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
