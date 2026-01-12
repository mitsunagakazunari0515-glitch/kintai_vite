/**
 * ファイル名: AllowanceMaster.tsx
 * 画面名: 手当マスタ画面
 * 説明: 従業員に付与する手当のマスタデータを管理する画面
 * 機能:
 *   - 手当の新規登録
 *   - 手当の編集・削除
 *   - 手当名と色の設定
 *   - 登録済み手当一覧の表示
 */

import { useState, useEffect } from 'react';
import { Snackbar } from '../../components/Snackbar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { RegisterButton, UpdateButton, CancelButton, EditButton, DeleteButton } from '../../components/Button';
import { fontSizes } from '../../config/fontSizes';
import { getAllowances, createAllowance, updateAllowance, deleteAllowance } from '../../utils/allowanceApi';
import { error as logError } from '../../utils/logger';

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
 * デフォルトの手当カラー一覧。
 */
const defaultColors = [
  { code: '#3b82f6', name: '青' },
  { code: '#10b981', name: '緑' },
  { code: '#f59e0b', name: 'オレンジ' },
  { code: '#ef4444', name: '赤' },
  { code: '#8b5cf6', name: '紫' },
  { code: '#06b6d4', name: 'シアン' },
  { code: '#ec4899', name: 'ピンク' },
  { code: '#84cc16', name: 'ライム' },
];

/**
 * カラーコードから色名を取得する関数。
 */
const getColorName = (colorCode: string): string => {
  const color = defaultColors.find(c => c.code.toLowerCase() === colorCode.toLowerCase());
  return color ? color.name : 'カスタム';
};

/**
 * 手当マスタ画面コンポーネント。
 * 従業員に付与する手当のマスタデータを管理します。
 * 手当の新規登録、編集、削除機能を提供します。
 *
 * @returns {JSX.Element} 手当マスタ画面コンポーネント。
 */
export const AllowanceMaster: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [_isLoading, setIsLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState<Omit<Allowance, 'id'>>({
    name: '',
    color: defaultColors[0].code,
    includeInOvertime: false
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

  // 手当マスタ一覧をAPIから取得
  useEffect(() => {
    const fetchAllowances = async () => {
      setIsLoading(true);
      try {
        const response = await getAllowances();
        setAllowances(response.allowances);
      } catch (error) {
        logError('Failed to fetch allowances:', error);
        setSnackbar({ message: '手当マスタの取得に失敗しました', type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllowances();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setSnackbar({ message: '手当名を入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }

    try {
      if (editingId) {
        // 編集モード
        const updated = await updateAllowance(editingId, {
          name: formData.name,
          color: formData.color,
          includeInOvertime: formData.includeInOvertime
        });
        setAllowances(allowances.map(a => 
          a.id === editingId ? updated : a
        ));
        setSnackbar({ message: '手当を更新しました', type: 'success' });
      } else {
        // 新規登録
        const newAllowance = await createAllowance({
          name: formData.name,
          color: formData.color,
          includeInOvertime: formData.includeInOvertime
        });
        setAllowances([...allowances, newAllowance]);
        setSnackbar({ message: '手当を登録しました', type: 'success' });
      }

      setFormData({ name: '', color: defaultColors[0].code, includeInOvertime: false });
      setEditingId(null);
      setTimeout(() => setSnackbar(null), 3000);
    } catch (error) {
      logError('Failed to save allowance:', error);
      const errorMessage = error instanceof Error ? error.message : '手当の保存に失敗しました';
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const handleEdit = (allowance: Allowance) => {
    setFormData({ name: allowance.name, color: allowance.color, includeInOvertime: allowance.includeInOvertime });
    setEditingId(allowance.id);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  } | null>(null);

  const handleDelete = (id: string) => {
    const allowance = allowances.find(a => a.id === id);
    if (allowance) {
      setConfirmModal({ isOpen: true, id, name: allowance.name });
    }
  };

  const confirmDelete = async () => {
    if (confirmModal) {
      try {
        await deleteAllowance(confirmModal.id);
        setAllowances(allowances.filter(a => a.id !== confirmModal.id));
        setSnackbar({ message: '手当を削除しました', type: 'success' });
        setTimeout(() => setSnackbar(null), 3000);
        setConfirmModal(null);
      } catch (error) {
        logError('Failed to delete allowance:', error);
        const errorMessage = error instanceof Error ? error.message : '手当の削除に失敗しました';
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', color: defaultColors[0].code, includeInOvertime: false });
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
          message="この手当を削除しますか？"
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
        手当マスタ
      </h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
        gap: isMobile ? '1.5rem' : '1.25rem' 
      }}>
        <div>
          <h3 style={{ marginBottom: '0.4rem', fontSize: isMobile ? '1.125rem' : '0.95rem' }}>
            {editingId ? '手当編集' : '新規登録'}
          </h3>
          <form onSubmit={handleSubmit} style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '0.6rem',
            borderRadius: '8px'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                手当名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 交通費、住宅手当"
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                色 *
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                {defaultColors.map((colorItem) => (
                  <button
                    key={colorItem.code}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: colorItem.code })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: formData.color === colorItem.code ? '#dbeafe' : 'white',
                      border: formData.color === colorItem.code ? '2px solid #2563eb' : '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      boxShadow: 'none',
                      minHeight: 'auto',
                      width: '100%'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: colorItem.code,
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                        {colorItem.name}
                      </div>
                      <div style={{ fontSize: fontSizes.small, color: '#6b7280' }}>
                        {colorItem.code}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #d1d5db'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: formData.color,
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                    カスタム
                  </div>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{
                      width: '100%',
                      fontSize: fontSizes.small,
                      color: '#6b7280',
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      marginTop: '0.125rem'
                    }}
                    placeholder="#3b82f6"
                  />
                </div>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: fontSizes.label
              }}>
                <input
                  type="checkbox"
                  checked={formData.includeInOvertime}
                  onChange={(e) => setFormData({ ...formData, includeInOvertime: e.target.checked })}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontWeight: 'bold' }}>残業代に含む</span>
              </label>
              <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginTop: '0.25rem', marginLeft: '26px' }}>
                チェックを入れると、この手当は残業代計算に含まれます
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              {editingId && (
                <CancelButton
                  size="small"
                  fullWidth
                  type="button"
                  onClick={handleCancel}
                />
              )}
              {editingId ? (
                <UpdateButton
                  size="small"
                  fullWidth
                  type="submit"
                />
              ) : (
                <RegisterButton
                  size="small"
                  fullWidth
                  type="submit"
                />
              )}
            </div>
          </form>
        </div>
        <div>
          <h3 style={{ marginBottom: '0.4rem', fontSize: isMobile ? '1.125rem' : '0.95rem' }}>
            登録済み手当一覧
          </h3>
          <div style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '0.6rem',
            borderRadius: '8px',
            maxHeight: isMobile ? '400px' : '600px',
            overflowY: 'auto'
          }}>
            {allowances.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>登録された手当がありません</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allowances.map((allowance) => (
                  <div
                    key={allowance.id}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: allowance.color,
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {allowance.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: allowance.color,
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            flexShrink: 0
                          }} />
                          <span style={{ fontSize: fontSizes.medium, fontWeight: 'bold' }}>
                            {getColorName(allowance.color)}
                          </span>
                          <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>
                            {allowance.color}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {allowance.includeInOvertime ? (
                            <span style={{ 
                              fontSize: fontSizes.badge, 
                              color: '#059669',
                              fontWeight: 'bold',
                              padding: '0.125rem 0.5rem',
                              backgroundColor: '#d1fae5',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              残業代に含む
                            </span>
                          ) : (
                            <span style={{ 
                              fontSize: fontSizes.badge, 
                              color: '#6b7280',
                              padding: '0.125rem 0.5rem',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              残業代に含まない
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <EditButton
                        onClick={() => handleEdit(allowance)}
                      />
                      <DeleteButton
                        onClick={() => handleDelete(allowance.id)}
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

