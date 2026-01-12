/**
 * ファイル名: DeductionMaster.tsx
 * 画面名: 控除マスタ画面
 * 説明: 給与明細で使用する控除項目のマスタデータを管理する画面
 * 機能:
 *   - 控除項目の新規登録
 *   - 控除項目の編集・削除
 *   - 控除名の設定
 *   - 登録済み控除一覧の表示
 */

import { useState, useEffect } from 'react';
import { Snackbar } from '../../components/Snackbar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { RegisterButton, UpdateButton, CancelButton, EditButton, DeleteButton } from '../../components/Button';
import { fontSizes } from '../../config/fontSizes';
import { getDeductions, createDeduction, updateDeduction, deleteDeduction } from '../../utils/deductionApi';
import { error as logError } from '../../utils/logger';

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
 * 控除マスタ画面コンポーネント。
 * 給与明細で使用する控除項目のマスタデータを管理します。
 * 控除項目の新規登録、編集、削除機能を提供します。
 *
 * @returns {JSX.Element} 控除マスタ画面コンポーネント。
 */
export const DeductionMaster: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState<Omit<Deduction, 'id'>>({
    name: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 控除マスタ一覧をAPIから取得
  useEffect(() => {
    const fetchDeductions = async () => {
      setIsLoading(true);
      try {
        const response = await getDeductions();
        setDeductions(response.deductions);
      } catch (error) {
        logError('Failed to fetch deductions:', error);
        setSnackbar({ message: '控除マスタの取得に失敗しました', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeductions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setSnackbar({ message: '控除名を入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }

    try {
      if (editingId) {
        // 編集モード
        const updated = await updateDeduction(editingId, {
          name: formData.name
        });
        setDeductions(deductions.map(d => 
          d.id === editingId ? updated : d
        ));
        setSnackbar({ message: '控除項目を更新しました', type: 'success' });
      } else {
        // 新規登録
        const newDeduction = await createDeduction({
          name: formData.name
        });
        setDeductions([...deductions, newDeduction]);
        setSnackbar({ message: '控除項目を登録しました', type: 'success' });
      }

      setFormData({ name: '' });
      setEditingId(null);
      setTimeout(() => setSnackbar(null), 3000);
    } catch (error) {
      logError('Failed to save deduction:', error);
      const errorMessage = error instanceof Error ? error.message : '控除項目の保存に失敗しました';
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const handleEdit = (deduction: Deduction) => {
    setFormData({ name: deduction.name });
    setEditingId(deduction.id);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  } | null>(null);

  const handleDelete = (id: string) => {
    const deduction = deductions.find(d => d.id === id);
    if (deduction) {
      setConfirmModal({ isOpen: true, id, name: deduction.name });
    }
  };

  const confirmDelete = async () => {
    if (confirmModal) {
      try {
        await deleteDeduction(confirmModal.id);
        setDeductions(deductions.filter(d => d.id !== confirmModal.id));
        setSnackbar({ message: '控除項目を削除しました', type: 'success' });
        setTimeout(() => setSnackbar(null), 3000);
        setConfirmModal(null);
      } catch (error) {
        logError('Failed to delete deduction:', error);
        const errorMessage = error instanceof Error ? error.message : '控除項目の削除に失敗しました';
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '' });
    setEditingId(null);
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
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={`${confirmModal.name}削除確認`}
          message="この控除項目を削除しますか？"
          confirmText="削除"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmModal(null)}
          isMobile={isMobile}
        />
      )}
      <h2 style={{ 
        marginBottom: isMobile ? '1rem' : '1.4rem', 
        marginTop: isMobile ? '0.5rem' : '0.75rem',
        fontSize: isMobile ? '1.25rem' : '1.05rem' 
      }}>
        控除マスタ
      </h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
        gap: isMobile ? '1.5rem' : '2rem' 
      }}>
        <div>
          <h3 style={{ marginBottom: '0.7rem', fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop }}>
            {editingId ? '控除項目編集' : '新規登録'}
          </h3>
          <form onSubmit={handleSubmit} style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                控除名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 社会保険、厚生年金"
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
              {editingId && (
                <CancelButton
                  fullWidth
                  type="button"
                  onClick={handleCancel}
                />
              )}
              {editingId ? (
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
        <div>
          <h3 style={{ marginBottom: '0.7rem', fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop }}>
            登録済み控除一覧
          </h3>
          <div style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            maxHeight: isMobile ? '400px' : '600px',
            overflowY: 'auto'
          }}>
            {deductions.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>登録された控除項目がありません</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deductions.map((deduction) => (
                  <div
                    key={deduction.id}
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
                        {deduction.name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <EditButton
                        onClick={() => handleEdit(deduction)}
                      />
                      <DeleteButton
                        onClick={() => handleDelete(deduction.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
