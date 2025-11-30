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
import { dummyAllowances } from '../../data/dummyData';

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
 * デフォルトの手当カラー一覧。
 */
const defaultColors = [
  '#3b82f6', // 青
  '#10b981', // 緑
  '#f59e0b', // オレンジ
  '#ef4444', // 赤
  '#8b5cf6', // 紫
  '#06b6d4', // シアン
  '#ec4899', // ピンク
  '#84cc16', // ライム
];

/**
 * 手当マスタ画面コンポーネント。
 * 従業員に付与する手当のマスタデータを管理します。
 * 手当の新規登録、編集、削除機能を提供します。
 *
 * @returns {JSX.Element} 手当マスタ画面コンポーネント。
 */
export const AllowanceMaster: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [allowances, setAllowances] = useState<Allowance[]>(dummyAllowances);
  const [formData, setFormData] = useState<Omit<Allowance, 'id'>>({
    name: '',
    color: defaultColors[0]
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setSnackbar({ message: '手当名を入力してください', type: 'error' });
      return;
    }

    if (editingId) {
      // 編集モード
      setAllowances(allowances.map(a => 
        a.id === editingId ? { ...a, name: formData.name, color: formData.color } : a
      ));
      setSnackbar({ message: '手当を更新しました', type: 'success' });
    } else {
      // 新規登録
      // 同じ名前が既に存在するかチェック
      const duplicate = allowances.find(a => a.name === formData.name);
      if (duplicate) {
        setSnackbar({ message: '同じ名前の手当が既に登録されています', type: 'error' });
        return;
      }
      const newAllowance: Allowance = {
        id: `allowance${Date.now()}`,
        ...formData
      };
      setAllowances([...allowances, newAllowance]);
      setSnackbar({ message: '手当を登録しました', type: 'success' });
    }

    setFormData({ name: '', color: defaultColors[0] });
    setEditingId(null);
  };

  const handleEdit = (allowance: Allowance) => {
    setFormData({ name: allowance.name, color: allowance.color });
    setEditingId(allowance.id);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
  } | null>(null);

  const handleDelete = (id: string) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = () => {
    if (confirmModal) {
      setAllowances(allowances.filter(a => a.id !== confirmModal.id));
      setSnackbar({ message: '手当を削除しました', type: 'success' });
      setConfirmModal(null);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', color: defaultColors[0] });
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
          title="手当の削除"
          message="この手当を削除しますか？"
          confirmText="削除"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmModal(null)}
          isMobile={isMobile}
        />
      )}
      <h2 style={{ marginBottom: isMobile ? '1rem' : '0.525rem', fontSize: isMobile ? '1.25rem' : '1.05rem' }}>
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
                gap: '0.15rem',
                marginBottom: '0.3rem'
              }}>
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      background: color,
                      backgroundColor: color,
                      border: formData.color === color ? '2px solid #1f2937' : '1px solid #d1d5db',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      boxShadow: 'none',
                      minHeight: 'auto',
                      minWidth: 'auto',
                      padding: 0
                    }}
                    title={color}
                  />
                ))}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem',
                backgroundColor: 'white',
                borderRadius: '3px',
                border: '1px solid #d1d5db'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: formData.color,
                  borderRadius: '2px',
                  border: '1px solid #d1d5db',
                  flexShrink: 0
                }} />
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  style={{
                    flex: 1,
                    height: '20px',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexDirection: isMobile ? 'column' : 'row' }}>
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
                        border: '1px solid #d1d5db'
                      }} />
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {allowance.name}
                        </div>
                        <div style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>
                          {allowance.color}
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

