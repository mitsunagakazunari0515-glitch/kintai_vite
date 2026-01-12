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

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar } from '../../components/Snackbar';
import { Button, NewRegisterButton, CancelButton, RegisterButton, UpdateButton, EditButton } from '../../components/Button';
import { ViewIcon } from '../../components/Icons';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { getEmploymentTypes, getEmploymentTypeLabel } from '../../config/masterData';
import { dummyAllowances } from '../../data/dummyData';
import { useSort } from '../../hooks/useSort';
import { ChevronDownIcon, ChevronUpIcon } from '../../components/Icons';
import { createEmployee, updateEmployee, getEmployees, CreateEmployeeRequest } from '../../utils/employeeApi';
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
  /** 管理者フラグ。 */
  isAdmin: boolean;
  /** 基本給（時給）。 */
  baseSalary: number;
  /** 基本休憩時間（分）。 */
  defaultBreakTime: number;
  /** 有給情報の配列。 */
  paidLeaves: Array<{
    grantDate: string;  // 有給付与日（YYYY-MM-DD）
    days: number;       // 付与された有給日数
  }>;
  /** 更新日時。 */
  updatedAt?: string;
  /** 更新者。 */
  updatedBy?: string;
}

/**
 * 従業員一覧画面コンポーネント。
 * 従業員の一覧表示、検索、編集、給与明細へのアクセスを提供します。
 *
 * @returns {JSX.Element} 従業員一覧画面コンポーネント。
 */
export const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const employmentTypes = getEmploymentTypes();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [allowances, setAllowances] = useState<Allowance[]>(dummyAllowances);
  const [filterEmploymentTypes, setFilterEmploymentTypes] = useState<string[]>(employmentTypes.map(t => t.code));
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const hasFetchedRef = useRef<boolean>(false); // 既にAPI呼び出しを行ったかどうかのフラグ
  const isMountedRef = useRef<boolean>(true); // コンポーネントがマウントされているかどうかのフラグ
  const cleanupCalledRef = useRef<boolean>(false); // クリーンアップ関数が呼ばれたかどうかのフラグ

  // 従業員一覧をAPIから取得
  useEffect(() => {
    // 既にAPI呼び出しを行った場合は、再実行しない
    // React Strict Modeによる2回目の実行を防ぐ
    if (hasFetchedRef.current) {
      console.log('EmployeeList: hasFetchedRef is true, skipping API call');
      return;
    }

    // 即座にフラグを設定して、2回目の実行（React Strict Mode）を防ぐ
    // これにより、fetchEmployees()が非同期でも、useEffectの2回目の実行時には既にtrueになっている
    hasFetchedRef.current = true;
    isMountedRef.current = true;
    cleanupCalledRef.current = false; // クリーンアップフラグをリセット
    console.log('EmployeeList: Starting fetchEmployees, hasFetchedRef set to true');

    const fetchEmployees = async () => {
      // マウント状態をチェック（コンポーネントがアンマウントされた場合は処理をスキップ）
      if (!isMountedRef.current) {
        console.warn('EmployeeList: Component unmounted before fetchEmployees');
        return;
      }

      console.log('EmployeeList: fetchEmployees started, isMountedRef.current:', isMountedRef.current);
      setIsLoadingEmployees(true);
      
      try {
        console.log('EmployeeList: About to call getEmployees()');
        const fetchedEmployees = await getEmployees();
        console.log('EmployeeList: getEmployees() completed');
        console.log('EmployeeList: Fetched employees:', fetchedEmployees);
        console.log('EmployeeList: fetchedEmployees is array?', Array.isArray(fetchedEmployees));
        console.log('EmployeeList: Number of employees:', fetchedEmployees?.length || 0);
        console.log('EmployeeList: isMountedRef.current after fetch:', isMountedRef.current);
        console.log('EmployeeList: cleanupCalledRef.current after fetch:', cleanupCalledRef.current);
        
        // 従業員データをマッピング（データが取得できた場合は、クリーンアップが呼ばれていても状態を更新する）
        // React Strict Modeでは、再マウント/アンマウントサイクルが発生するが、
        // 実際にコンポーネントが再マウントされる場合は、新しいインスタンスが作成されるため、
        // 状態を更新しても問題ない
        console.log('EmployeeList: Starting to map employees...');
        const mappedEmployees = fetchedEmployees.map(emp => {
          console.log('EmployeeList: Mapping employee:', emp.id, emp.firstName, emp.lastName);
          return {
            ...emp,
            employmentType: emp.employmentType as 'FULL_TIME' | 'PART_TIME'
          };
        });
        console.log('EmployeeList: Mapped employees:', mappedEmployees);
        console.log('EmployeeList: Mapped employees length:', mappedEmployees.length);
        console.log('EmployeeList: Current employees state before setEmployees:', employees.length);
        console.log('EmployeeList: cleanupCalledRef.current before setEmployees:', cleanupCalledRef.current);
        console.log('EmployeeList: isMountedRef.current before setEmployees:', isMountedRef.current);
        
        // クリーンアップが呼ばれていない場合、またはクリーンアップが呼ばれていてもデータが取得できた場合は状態を更新
        // React Strict Modeでは、クリーンアップが先に実行されることがあるが、
        // データが取得できた場合は状態を更新する（再マウント時に正しく表示される）
        if (!cleanupCalledRef.current || (cleanupCalledRef.current && mappedEmployees.length > 0)) {
          console.log('EmployeeList: Calling setEmployees with', mappedEmployees.length, 'items');
          console.log('EmployeeList: mappedEmployees data:', JSON.stringify(mappedEmployees, null, 2));
          setEmployees(mappedEmployees);
          console.log('EmployeeList: setEmployees called successfully');
        } else {
          console.warn('EmployeeList: Cleanup called and no data, skipping state update');
        }
        
        // 従業員一覧API取得成功後、手当マスタAPIを呼び出す
        try {
          console.log('EmployeeList: About to call getAllowances()');
          const allowanceResponse = await getAllowances();
          console.log('EmployeeList: getAllowances() completed');
          console.log('EmployeeList: Fetched allowances:', allowanceResponse);
          
          // 手当マスタを状態に設定
          const fetchedAllowances: Allowance[] = allowanceResponse.allowances.map(allowance => ({
            id: allowance.id,
            name: allowance.name,
            color: allowance.color,
            includeInOvertime: allowance.includeInOvertime
          }));
          
          if (isMountedRef.current) {
            console.log('EmployeeList: Setting allowances:', fetchedAllowances.length, 'items');
            setAllowances(fetchedAllowances);
            
            // localStorageに手当マスタを保存（従業員登録・更新画面で使用）
            try {
              localStorage.setItem('allowances', JSON.stringify(fetchedAllowances));
              console.log('EmployeeList: Allowances saved to localStorage');
            } catch (storageError) {
              console.warn('EmployeeList: Failed to save allowances to localStorage:', storageError);
            }
          }
        } catch (allowanceError: any) {
          // 手当マスタ取得エラーは警告として記録するが、従業員一覧の表示は続行する
          console.warn('EmployeeList: Failed to fetch allowances:', allowanceError);
          logError('Failed to fetch allowances:', allowanceError);
          // エラー時はダミーデータを使用する（既に初期値として設定済み）
        }
      } catch (error: any) {
        // エラーログを出力
        console.error('EmployeeList: Error in fetchEmployees:', error);
        logError('Failed to fetch employees:', error);
        const errorMessage = translateApiError(error);
        
        // すべてのエラー（403エラーを含む）をスナックバーで表示
        // 注意: roleがadminの場合でも、既存のLambda関数（別リポジトリ）が403を返す可能性がある
        // これはAPI側の権限チェックロジックの問題の可能性があるため、エラーメッセージを表示して画面に留まる
        // リダイレクトしない（roleがadminの場合、権限エラーではないため）
        
        // コンポーネントがマウントされている場合のみ状態を更新
        if (isMountedRef.current) {
          setSnackbar({ message: errorMessage, type: 'error' });
          
          // エラー時は空配列を設定
          setEmployees([]);
          
          // エラー時はhasFetchedRefをリセットして、次回のマウント時に再取得できるようにする
          // ただし、これは無限ループを引き起こす可能性があるため、慎重に実装する
          // 現在は、エラー時もリセットしない（ユーザーが手動で再読み込みするか、ページを再読み込みする必要がある）
          // hasFetchedRef.current = false; // コメントアウト: 無限ループを防ぐため
          
          // 5秒後にスナックバーを閉じる
          setTimeout(() => {
            if (isMountedRef.current) {
              setSnackbar(null);
            }
          }, 5000); // 5秒間表示
        }
      } finally {
        // コンポーネントがマウントされている場合のみ状態を更新
        console.log('EmployeeList: finally block, isMountedRef.current:', isMountedRef.current);
        if (isMountedRef.current) {
          setIsLoadingEmployees(false);
          console.log('EmployeeList: setIsLoadingEmployees(false) called');
        } else {
          console.warn('EmployeeList: Component unmounted in finally block, skipping setIsLoadingEmployees');
        }
      }
    };

    // fetchEmployeesを実行
    console.log('EmployeeList: About to call fetchEmployees()');
    const fetchPromise = fetchEmployees();
    
    // クリーンアップ関数: コンポーネントがアンマウントされた場合、クリーンアップフラグを設定
    // 注意: React Strict Modeでは、再マウント/アンマウントサイクルが発生するため、
    // isMountedRefを即座にfalseに設定せず、cleanupCalledRefでクリーンアップが呼ばれたことを記録する
    // これにより、非同期処理中にクリーンアップが呼ばれても、データが取得できた場合は状態を更新できる
    return () => {
      console.log('EmployeeList: useEffect cleanup called');
      console.log('EmployeeList: cleanup - hasFetchedRef.current:', hasFetchedRef.current);
      console.log('EmployeeList: cleanup - isMountedRef.current before:', isMountedRef.current);
      console.log('EmployeeList: cleanup - cleanupCalledRef.current before:', cleanupCalledRef.current);
      
      // クリーンアップフラグを設定（isMountedRefは後で設定）
      cleanupCalledRef.current = true;
      
      // 注意: isMountedRefを即座にfalseに設定しない
      // React Strict Modeでは、再マウントが発生する可能性があるため、
      // クリーンアップが呼ばれたことを記録するだけで、isMountedRefは後で設定する
      // 非同期処理が完了するまで待つため、少し遅延させてからisMountedRefをfalseに設定
      
      // クリーンアップが呼ばれた後、非同期処理が完了するまで少し待ってからisMountedRefをfalseに設定
      // これにより、非同期処理中にクリーンアップが呼ばれても、データが取得できた場合は状態を更新できる
      // 500ms待ってからisMountedRefをfalseに設定（API呼び出しが完了するまでの時間を考慮）
      setTimeout(() => {
        if (cleanupCalledRef.current) {
          isMountedRef.current = false;
          console.log('EmployeeList: cleanup - isMountedRef.current set to false after delay');
        }
      }, 500); // 500ms待ってからisMountedRefをfalseに設定
      
      console.log('EmployeeList: cleanup - cleanupCalledRef.current after:', cleanupCalledRef.current);
      
      // 注意: hasFetchedRefはリセットしない（コンポーネントが再マウントされた場合でも、API呼び出しを1回のみ実行するため）
      // コンポーネントが完全にアンマウントされ、再マウントされた場合は、新しいコンポーネントインスタンスが作成されるため、hasFetchedRefは自動的にリセットされる
      
      // fetchPromiseがまだ実行中の場合は、エラーハンドリングを追加
      fetchPromise.catch((error) => {
        console.error('EmployeeList: Unhandled error in fetchEmployees (cleanup):', error);
        logError('Unhandled error in fetchEmployees (cleanup):', error);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして、マウント時のみ実行（React Strict Modeによる2回目の実行はhasFetchedRefで防ぐ）
  
  // デバッグログ: employeesステートの変更を監視
  useEffect(() => {
    console.log('EmployeeList: employees state changed:', employees.length, 'items');
    if (employees.length > 0) {
      console.log('EmployeeList: First employee:', employees[0]);
    }
  }, [employees]);
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false); // モバイル時の検索条件の展開状態
  const [formData, setFormData] = useState<Employee>({
    id: '',
    firstName: '',
    lastName: '',
    employmentType: (employmentTypes[0]?.code || 'FULL_TIME') as 'FULL_TIME' | 'PART_TIME',
    email: '',
    joinDate: '',
    leaveDate: null,
    allowances: [],
    isAdmin: false,
    baseSalary: 0,
    defaultBreakTime: 60,
    paidLeaves: [],
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


  // デバッグログ: employeesステートの変更を監視
  console.log('EmployeeList: employees state:', employees.length, 'items');
  console.log('EmployeeList: filterEmploymentTypes:', filterEmploymentTypes);
  console.log('EmployeeList: showActiveOnly:', showActiveOnly);
  
  const filteredEmployees = employees.filter(emp => {
    const matchType = filterEmploymentTypes.length === 0 || filterEmploymentTypes.includes(emp.employmentType);
    const matchActive = !showActiveOnly || !emp.leaveDate;
    const result = matchType && matchActive;
    
    // デバッグログ: すべての従業員についてフィルター結果を確認
    console.log('EmployeeList: Filtering employee:', {
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`, // 姓・名の順序で表示（firstName = 苗字/姓, lastName = 名前/名）
      employmentType: emp.employmentType,
      leaveDate: emp.leaveDate,
      matchType,
      matchActive,
      result,
      filterEmploymentTypes,
      showActiveOnly
    });
    
    return result;
  });
  
  console.log('EmployeeList: Filtered employees:', filteredEmployees.length, 'out of', employees.length);

  // ソート機能を共通フックから取得
  const { handleSort, getSortIcon, sortedData: sortedEmployees } = useSort<Employee>(
    filteredEmployees
  );


  const handleNewEmployee = () => {
    setFormData({
      id: '', // 登録時はIDは空（サーバー側で自動採番）
      firstName: '',
      lastName: '',
      employmentType: (employmentTypes[0]?.code || 'FULL_TIME') as 'FULL_TIME' | 'PART_TIME',
      email: '',
      joinDate: '',
      leaveDate: null,
      allowances: [],
      isAdmin: false,
      baseSalary: 0,
      defaultBreakTime: 60,
      paidLeaves: []
    });
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({ ...employee });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.joinDate) {
      setSnackbar({ message: '必須項目を入力してください', type: 'error' });
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

      if (editingEmployee) {
        // 更新
        await updateEmployee(editingEmployee.id, payload);
        setSnackbar({ message: '従業員情報を更新しました', type: 'success' });
      } else {
        // 新規登録
        await createEmployee(payload);
        setSnackbar({ message: '従業員を登録しました', type: 'success' });
      }

      // 一覧を再取得
      const updatedEmployees = await getEmployees();
      setEmployees(updatedEmployees.map(emp => ({
        ...emp,
        employmentType: emp.employmentType as 'FULL_TIME' | 'PART_TIME'
      })));

      setShowModal(false);
      setEditingEmployee(null);
    } catch (error) {
      logError('Failed to save employee:', error);
      const errorMessage = translateApiError(error);
      setSnackbar({ message: errorMessage, type: 'error' });
    }
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
        alignItems: 'flex-start',
        marginBottom: isMobile ? '1rem' : '1.4rem',
        marginTop: isMobile ? '0.5rem' : '0.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.05rem' }}>
          従業員一覧
        </h2>
        <NewRegisterButton
          onClick={handleNewEmployee}
        />
      </div>

      {/* 検索・フィルター */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: isMobile ? '0' : '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        {isMobile ? (
          <>
            {/* モバイル時：折りたたみ可能な検索ヘッダー */}
            <button
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderTop: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: 'none',
                minHeight: 'auto',
                minWidth: 'auto'
              }}
            >
              <span style={{ 
                fontSize: fontSizes.label, 
                fontWeight: 'bold', 
                color: '#1f2937' 
              }}>
                絞り込み検索
              </span>
              {isSearchExpanded ? (
                <ChevronUpIcon size={20} color="#6b7280" />
              ) : (
                <ChevronDownIcon size={20} color="#6b7280" />
              )}
            </button>
            {/* モバイル時：展開された検索条件 */}
            {isSearchExpanded && (
              <div style={{
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ 
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
                  minWidth: '100%'
                }}>
                  検索結果: {filteredEmployees.length}件
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '1rem',
            alignItems: 'flex-end',
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
        )}
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
                        {isMobile && emp.isAdmin ? `${emp.firstName} ${emp.lastName}(管理者)` : `${emp.firstName} ${emp.lastName}`}
                      </span>
                      {!isMobile && emp.isAdmin && (
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
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => navigate(`/admin/employees/${emp.id}/payroll`)}
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
                      明細
                    </Button>
                    {isMobile ? (
                      <EditButton
                        onClick={() => handleEdit(emp)}
                        size="small"
                      />
                    ) : (
                      <Button
                        variant="icon-edit"
                        onClick={() => handleEdit(emp)}
                        title="編集"
                      />
                    )}
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
                    <span style={{ fontWeight: 'bold' }}>{getEmploymentTypeLabel(emp.employmentType)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>基本給:</span>{' '}
                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(emp.baseSalary)}{emp.employmentType === 'FULL_TIME' ? '/月' : '/時'}</span>
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
                    <span style={{ fontWeight: 'bold' }}>{emp.paidLeaves.reduce((sum, pl) => sum + pl.days, 0)}日</span>
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
                    onClick={() => handleSort('firstName')}
                  >
                    {getSortIcon('firstName')} 氏名
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
                    onClick={() => {}}
                  >
                    有給合計日数
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>手当</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>更新者</th>
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
                        <span style={{ fontWeight: 'bold' }}>{emp.firstName} {emp.lastName}</span>
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
                        {getEmploymentTypeLabel(emp.employmentType)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      {formatCurrency(emp.baseSalary)}{emp.employmentType === 'FULL_TIME' ? '/月' : '/時'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{emp.email}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatDate(emp.joinDate)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {emp.leaveDate ? formatDate(emp.leaveDate) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      {emp.paidLeaves.reduce((sum, pl) => sum + pl.days, 0)}日
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
                      {emp.updatedBy || '-'}
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
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => navigate(`/admin/employees/${emp.id}/payroll`)}
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
                          onClick={() => handleEdit(emp)}
                          size="small"
                        />
                      ) : (
                        <Button
                          variant="icon-edit"
                          onClick={() => handleEdit(emp)}
                          title="編集"
                        />
                      )}
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
                          {formatCurrency(Math.round(formData.baseSalary / 20.5))}円
                        </span>
                        <span style={{ fontSize: fontSizes.medium, color: '#6b7280', marginLeft: '0.5rem' }}>
                          （基本給 ÷ 20.5）
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>時給: </span>
                        <span style={{ fontWeight: 'bold' }}>
                          {formatCurrency(Math.round((formData.baseSalary / 20.5) / 7.5))}円
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
                  基本休憩時間
                </label>
                <select
                  value={formData.defaultBreakTime}
                  onChange={(e) => setFormData({ ...formData, defaultBreakTime: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: fontSizes.input,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value={0}>なし</option>
                  <option value={30}>30分</option>
                  <option value={60}>60分</option>
                  <option value={90}>90分</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  有給情報
                </label>
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db'
                }}>
                  {formData.paidLeaves.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: fontSizes.medium, margin: 0 }}>
                      有給情報が登録されていません
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {formData.paidLeaves.map((paidLeave, index) => (
                        <div key={index} style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto',
                          gap: '0.75rem',
                          alignItems: 'end',
                          padding: '0.75rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '4px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                              有給付与日
                            </label>
                            <input
                              type="date"
                              value={paidLeave.grantDate}
                              onChange={(e) => {
                                const newPaidLeaves = [...formData.paidLeaves];
                                newPaidLeaves[index] = { ...paidLeave, grantDate: e.target.value };
                                setFormData({ ...formData, paidLeaves: newPaidLeaves });
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
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                              日数
                            </label>
                            <input
                              type="number"
                              value={paidLeave.days}
                              onChange={(e) => {
                                const newPaidLeaves = [...formData.paidLeaves];
                                newPaidLeaves[index] = { ...paidLeave, days: Number(e.target.value) };
                                setFormData({ ...formData, paidLeaves: newPaidLeaves });
                              }}
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
                              required
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newPaidLeaves = formData.paidLeaves.filter((_, i) => i !== index);
                              setFormData({ ...formData, paidLeaves: newPaidLeaves });
                            }}
                            style={{
                              padding: '0.75rem 1rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: fontSizes.button,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              boxShadow: 'none',
                              minHeight: 'auto',
                              minWidth: 'auto'
                            }}
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        paidLeaves: [...formData.paidLeaves, { grantDate: '', days: 0 }]
                      });
                    }}
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: fontSizes.button,
                      cursor: 'pointer',
                      width: '100%',
                      boxShadow: 'none',
                      minHeight: 'auto',
                      minWidth: 'auto'
                    }}
                  >
                    + 有給情報を追加
                  </button>
                  <div style={{ marginTop: '0.5rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                    合計: {formData.paidLeaves.reduce((sum, pl) => sum + pl.days, 0)}日
                  </div>
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

              <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
                <CancelButton
                  fullWidth
                  type="button"
                  onClick={handleCancel}
                />
                {editingEmployee ? (
                  <UpdateButton
                    fullWidth
                    type="submit"
                  />
                ) : (
                  <RegisterButton
                    fullWidth
                    type="submit"
                  />
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
