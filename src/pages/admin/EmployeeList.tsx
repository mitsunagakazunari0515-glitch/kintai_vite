/**
 * ファイル名: EmployeeList.tsx
 * 画面名: 従業員一覧画面
 * 説明: 従業員の一覧表示、検索、編集、給与明細へのアクセスを提供する画面
 * 機能:
 *   - 従業員一覧の表示
 *   - 検索・フィルター機能（雇用形態、在籍状況）
 *   - 従業員情報の登録・編集（モーダル）
 *   - 給与明細へのリンク
 *   - 管理者フラグ、基本給の管理
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar } from '../../components/Snackbar';
import { EditIcon } from '../../components/Icons';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { getEmploymentTypes } from '../../config/masterData';
import { dummyEmployees, dummyAllowances } from '../../data/dummyData';

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
  isAdmin: boolean; // 管理者フラグ
  baseSalary: number; // 基本給（時給）
  paidLeaveDays: number; // 有給日数
  updatedAt?: string; // 更新日時
}

export const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const employmentTypes = getEmploymentTypes();
  const [employees, setEmployees] = useState<Employee[]>(
    dummyEmployees.map(emp => ({
      ...emp,
      employmentType: emp.employmentType as '正社員' | 'パート'
    }))
  );
  const [allowances] = useState<Allowance[]>(dummyAllowances);
  const [filterEmploymentTypes, setFilterEmploymentTypes] = useState<string[]>(employmentTypes.map(t => t.code));
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState<Employee>({
    id: '',
    name: '',
    employmentType: (employmentTypes[0]?.code || '正社員') as '正社員' | 'パート',
    email: '',
    joinDate: '',
    leaveDate: null,
    allowances: [],
    isAdmin: false,
    baseSalary: 0,
    paidLeaveDays: 0,
    updatedAt: new Date().toISOString()
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getAllowanceById = (id: string) => {
    return allowances.find(a => a.id === id);
  };


  const filteredEmployees = employees.filter(emp => {
    const matchType = filterEmploymentTypes.length === 0 || filterEmploymentTypes.includes(emp.employmentType);
    const matchActive = !showActiveOnly || !emp.leaveDate;
    return matchType && matchActive;
  });

  // ソート処理
  const handleSort = (key: string) => {
    if (sortKey === key) {
      // 同じキーをクリックした場合は昇順→降順→昇順と循環
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいキーをクリックした場合は昇順から開始
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortKey) return 0;
    
    let aValue: any = a[sortKey as keyof Employee];
    let bValue: any = b[sortKey as keyof Employee];
    
    // 日付の場合は文字列として比較
    if (sortKey === 'joinDate' || sortKey === 'leaveDate' || sortKey === 'updatedAt') {
      aValue = aValue || '';
      bValue = bValue || '';
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    // 数値の場合は数値として比較
    if (sortKey === 'baseSalary' || sortKey === 'paidLeaveDays') {
      aValue = aValue || 0;
      bValue = bValue || 0;
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // 文字列の場合は文字列として比較
    aValue = String(aValue || '');
    bValue = String(bValue || '');
    return sortOrder === 'asc' 
      ? aValue.localeCompare(bValue, 'ja')
      : bValue.localeCompare(aValue, 'ja');
  });

  // ソートアイコンを取得
  const getSortIcon = (key: string) => {
    if (sortKey !== key) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // 従業員IDの自動採番関数
  const generateEmployeeId = (): string => {
    // 既存の従業員IDから最大の番号を取得
    const existingIds = employees
      .map(emp => {
        const match = emp.id.match(/^EMP(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);
    
    const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextNum = maxNum + 1;
    return `EMP${String(nextNum).padStart(3, '0')}`;
  };

  const handleNewEmployee = () => {
    setFormData({
      id: generateEmployeeId(),
      name: '',
      employmentType: (employmentTypes[0]?.code || '正社員') as '正社員' | 'パート',
      email: '',
      joinDate: '',
      leaveDate: null,
      allowances: [],
      isAdmin: false,
      baseSalary: 0,
      paidLeaveDays: 0
    });
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({ ...employee });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.id || !formData.name || !formData.email || !formData.joinDate) {
      setSnackbar({ message: '必須項目を入力してください', type: 'error' });
      return;
    }

    if (editingEmployee) {
      // 更新
      setEmployees(employees.map(emp =>
        emp.id === editingEmployee.id ? { ...formData, updatedAt: new Date().toISOString() } : emp
      ));
      setSnackbar({ message: '従業員情報を更新しました', type: 'success' });
    } else {
      // 新規登録
      // IDの重複チェック（念のため）
      if (employees.some(emp => emp.id === formData.id)) {
        // 重複している場合は新しいIDを生成
        const newId = generateEmployeeId();
        setFormData({ ...formData, id: newId });
        setEmployees([...employees, { ...formData, id: newId, updatedAt: new Date().toISOString() }]);
      } else {
        setEmployees([...employees, { ...formData, updatedAt: new Date().toISOString() }]);
      }
      setSnackbar({ message: '従業員を登録しました', type: 'success' });
    }

    setShowModal(false);
    setEditingEmployee(null);
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingEmployee(null);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%' }}>
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? '1rem' : '1.4rem',
        marginTop: isMobile ? '0.5rem' : '0.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.05rem' }}>
          従業員一覧
        </h2>
        <button
          onClick={handleNewEmployee}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: 'none',
            minHeight: 'auto',
            minWidth: 'auto'
          }}
        >
          + 新規登録
        </button>
      </div>

      {/* 検索・フィルター */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: isMobile ? '0.75rem' : '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '0.75rem' : '1rem',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            flex: isMobile ? '1' : '0 0 auto',
            minWidth: isMobile ? '100%' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              雇用形態
            </label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {employmentTypes.map((type) => (
                <label key={type.code} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  gap: '0.5rem'
                }}>
                  <input
                    type="checkbox"
                    checked={filterEmploymentTypes.includes(type.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilterEmploymentTypes([...filterEmploymentTypes, type.code]);
                      } else {
                        setFilterEmploymentTypes(filterEmploymentTypes.filter(t => t !== type.code));
                      }
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontSize: fontSizes.medium, whiteSpace: 'nowrap' }}>{type.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ 
            flex: isMobile ? '1' : '0 0 auto',
            minWidth: isMobile ? '100%' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              表示従業員
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              gap: '0.5rem'
            }}>
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />
              <span style={{ fontSize: fontSizes.medium, whiteSpace: 'nowrap' }}>
                在籍のみ
              </span>
            </label>
          </div>
          <div style={{ 
                          fontSize: fontSizes.badge,
            color: '#6b7280',
            flex: isMobile ? '1' : '0 0 auto',
            alignSelf: isMobile ? 'flex-start' : 'flex-end',
            paddingBottom: isMobile ? '0' : '0.25rem',
            minWidth: isMobile ? '100%' : 'auto'
          }}>
            検索結果: {filteredEmployees.length}件
          </div>
        </div>
      </div>

      {/* 従業員一覧 */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: isMobile ? '1rem' : '0rem',
        borderRadius: '8px'
      }}>
                {sortedEmployees.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            従業員が見つかりません
          </p>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sortedEmployees.map((emp) => (
              <div
                key={emp.id}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                        {emp.name}
                      </span>
                      {emp.isAdmin && (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          fontSize: fontSizes.input,
                          fontWeight: 'bold'
                        }}>
                          管理者
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>
                      {emp.id}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => navigate(`/admin/employees/${emp.id}/payroll`)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: 'none',
                        minHeight: 'auto',
                        minWidth: 'auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }}
                      title="給与明細を閲覧"
                    >
                      閲覧
                    </button>
                    <button
                      onClick={() => handleEdit(emp)}
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
                  </div>
                </div>
                <div style={{ 
                  marginBottom: '0.75rem',
                  fontSize: fontSizes.button
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>更新日時:</strong>{' '}
                    {emp.updatedAt ? new Date(emp.updatedAt).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </div>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  fontSize: fontSizes.button
                }}>
                  <div>
                    <span style={{ color: '#6b7280' }}>雇用形態:</span>{' '}
                    <span style={{ fontWeight: 'bold' }}>{emp.employmentType}</span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>基本給:</span>{' '}
                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(emp.baseSalary)}/時</span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>入社日:</span>{' '}
                    {formatDate(emp.joinDate)}
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>メール:</span>{' '}
                    {emp.email}
                  </div>
                  {emp.leaveDate && (
                    <div>
                      <span style={{ color: '#6b7280' }}>退社日:</span>{' '}
                      {formatDate(emp.leaveDate)}
                    </div>
                  )}
                  <div>
                    <span style={{ color: '#6b7280' }}>有給日数:</span>{' '}
                    <span style={{ fontWeight: 'bold' }}>{emp.paidLeaveDays}日</span>
                  </div>
                </div>
                {emp.allowances.length > 0 && (
                  <div>
                    <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.5rem' }}>
                      手当:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {emp.allowances.map((allowanceId) => {
                        const allowance = getAllowanceById(allowanceId);
                        if (!allowance) return null;
                        return (
                          <span
                            key={allowanceId}
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '16px',
                              backgroundColor: 'white',
                              color: allowance.color,
                              fontSize: fontSizes.input,
                              fontWeight: 'bold',
                              border: `1px solid ${allowance.color}40`
                            }}
                          >
                            {allowance.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            overflowX: 'auto',
            maxHeight: isMobile ? '400px' : 'calc(100vh - 330px)',
            overflowY: 'auto',
            flex: 1
          }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1000px', border: '2px solid #e5e7eb' }}>
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
                    onClick={() => handleSort('id')}
                  >
                    {getSortIcon('id')} ID
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('name')}
                  >
                    {getSortIcon('name')} 氏名
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('employmentType')}
                  >
                    {getSortIcon('employmentType')} 雇用形態
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('baseSalary')}
                  >
                    {getSortIcon('baseSalary')} 基本給
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('email')}
                  >
                    {getSortIcon('email')} メールアドレス
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('joinDate')}
                  >
                    {getSortIcon('joinDate')} 入社日
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('leaveDate')}
                  >
                    {getSortIcon('leaveDate')} 退社日
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('paidLeaveDays')}
                  >
                    {getSortIcon('paidLeaveDays')} 有給日数
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>手当</th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('updatedAt')}
                  >
                    {getSortIcon('updatedAt')} 更新日時
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>給与明細</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>編集</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem' }}>{emp.id}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold' }}>{emp.name}</span>
                        {emp.isAdmin && (
                          <span style={{
                            padding: '0.125rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            管理者
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: emp.employmentType === employmentTypes[0].code ? '#dbeafe' : '#fef3c7',
                        color: emp.employmentType === employmentTypes[0].code ? '#1e40af' : '#92400e',
                        fontSize: fontSizes.input,
                        fontWeight: 'bold'
                      }}>
                        {emp.employmentType}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      {formatCurrency(emp.baseSalary)}/時
                    </td>
                    <td style={{ padding: '0.75rem' }}>{emp.email}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatDate(emp.joinDate)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {emp.leaveDate ? formatDate(emp.leaveDate) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      {emp.paidLeaveDays}日
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {emp.allowances.map((allowanceId) => {
                          const allowance = getAllowanceById(allowanceId);
                          if (!allowance) return null;
                          return (
                            <span
                              key={allowanceId}
                              style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '16px',
                                backgroundColor: allowance.color + '20',
                                color: allowance.color,
                                fontSize: fontSizes.input,
                                fontWeight: 'bold',
                                border: `1px solid ${allowance.color}40`
                              }}
                            >
                              {allowance.name}
                            </span>
                          );
                        })}
                        {emp.allowances.length === 0 && <span style={{ color: '#9ca3af' }}>-</span>}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {emp.updatedAt ? new Date(emp.updatedAt).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/admin/employees/${emp.id}/payroll`)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: fontSizes.input,
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: 'none',
                          minHeight: 'auto',
                          minWidth: 'auto'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#1d4ed8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                        }}
                        title="給与明細を閲覧"
                      >
                        閲覧
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(emp)}
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

      {/* モーダル */}
      {showModal && (
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
            <h3 style={{ marginBottom: '1.05rem', fontSize: isMobile ? '1.125rem' : '0.875rem' }}>
              {editingEmployee ? '従業員編集' : '新規登録'}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  従業員ID {editingEmployee !== null ? '*' : '(自動採番)'}
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
                  基本給（時給） *
                </label>
                <input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                  min="0"
                  step="100"
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
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginTop: '0.25rem' }}>
                  現在の値: {formatCurrency(formData.baseSalary)}/時
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  有給日数
                </label>
                <input
                  type="number"
                  value={formData.paidLeaveDays}
                  onChange={(e) => setFormData({ ...formData, paidLeaveDays: Number(e.target.value) })}
                  min="0"
                  step="0.5"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: fontSizes.input,
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginTop: '0.25rem' }}>
                  現在の値: {formData.paidLeaveDays}日
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.isAdmin}
                    onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 'bold' }}>管理者フラグ</span>
                </label>
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

              <div style={{ marginBottom: '1rem' }}>
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
                            fontSize: fontSizes.input,
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
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: 'none',
                    minHeight: 'auto',
                    minWidth: 'auto'
                  }}
                >
                  キャンセル
                </button>
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
                    cursor: 'pointer',
                    boxShadow: 'none',
                    minHeight: 'auto',
                    minWidth: 'auto'
                  }}
                >
                  {editingEmployee ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
