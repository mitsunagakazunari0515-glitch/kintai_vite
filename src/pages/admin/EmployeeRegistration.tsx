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
import { fontSizes } from '../../config/fontSizes';
import { getEmploymentTypes } from '../../config/masterData';

interface Allowance {
  id: string;
  name: string;
  color: string;
}

interface Employee {
  id: string;
  name: string;
  employmentType: '正社員' | 'パート';
  email: string;
  joinDate: string;
  leaveDate: string | null;
  allowances: string[]; // 手当IDの配列
}

export const EmployeeRegistration: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isEditing] = useState(!!id);
  const employmentTypes = getEmploymentTypes();
  
  // 手当マスタ（実際の実装では共有状態管理やAPIから取得）
  const [allowances] = useState<Allowance[]>([
    { id: 'allowance1', name: '交通費', color: '#3b82f6' },
    { id: 'allowance2', name: '住宅手当', color: '#10b981' },
    { id: 'allowance3', name: '家族手当', color: '#f59e0b' }
  ]);

  const [formData, setFormData] = useState<Employee>({
    id: '',
    name: '',
    employmentType: (employmentTypes[0]?.code || '正社員') as '正社員' | 'パート',
    email: '',
    joinDate: '',
    leaveDate: null,
    allowances: []
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
    if (isEditing && id) {
      // 編集モードの場合、既存データを読み込む（実際の実装ではAPIから取得）
      // ここではダミーデータを使用
      const existingEmployee: Employee = {
        id: id,
        name: '山田太郎',
        employmentType: (employmentTypes[0]?.code || '正社員') as '正社員' | 'パート',
        email: 'yamada@example.com',
        joinDate: '2020-04-01',
        leaveDate: null,
        allowances: ['allowance1', 'allowance2']
      };
      setFormData(existingEmployee);
    } else if (!isEditing) {
      // 新規登録モードの場合、IDを自動採番
      setFormData(prev => ({
        ...prev,
        id: generateEmployeeId()
      }));
    }
  }, [id, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name || !formData.email || !formData.joinDate) {
      setSnackbar({ message: '必須項目を入力してください', type: 'error' });
      return;
    }

    if (isEditing) {
      setSnackbar({ message: '従業員情報を更新しました', type: 'success' });
    } else {
      setSnackbar({ message: '従業員を登録しました', type: 'success' });
    }
    
    // 実際の実装ではAPIに送信
    setTimeout(() => {
      navigate('/admin/employees');
    }, 1500);
  };

  const handleAllowanceToggle = (allowanceId: string) => {
    setFormData(prev => ({
      ...prev,
      allowances: prev.allowances.includes(allowanceId)
        ? prev.allowances.filter(id => id !== allowanceId)
        : [...prev.allowances, allowanceId]
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
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    onChange={() => setFormData({ ...formData, employmentType: type.code as '正社員' | 'パート' })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  {type.label}
                </label>
              ))}
            </div>
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
              {allowances.length === 0 ? (
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

          <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isEditing ? '更新' : '登録'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/employees')}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
