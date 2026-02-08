/**
 * ファイル名: WorkLocationMaster.tsx
 * 画面名: 勤務拠点マスタ画面
 * 説明: 打刻を許可する勤務地（オフィス等）を管理する画面
 * 機能:
 *   - 勤務拠点の新規登録・編集・削除
 *   - 拠点名、緯度、経度、許容半径、表示順の設定
 */

import { useState, useEffect } from 'react';
import { Snackbar } from '../../components/Snackbar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { RegisterButton, UpdateButton, CancelButton, EditButton, DeleteButton } from '../../components/Button';
import { GoogleMapLocationPicker } from '../../components/GoogleMapLocationPicker';
import { fontSizes } from '../../config/fontSizes';
import {
  getWorkLocations,
  createWorkLocation,
  updateWorkLocation,
  deleteWorkLocation,
  type WorkLocation,
  type CreateWorkLocationRequest
} from '../../utils/workLocationApi';
import { error as logError } from '../../utils/logger';

/**
 * フォームデータの型
 */
interface WorkLocationFormData {
  name: string;
  latitude: number;
  longitude: number;
  allowedRadius: number;
  displayOrder: number;
}

const initialFormData: WorkLocationFormData = {
  name: '',
  latitude: 0,
  longitude: 0,
  allowedRadius: 100,
  displayOrder: 1
};

const getNextDisplayOrder = (locations: WorkLocation[]): number =>
  locations.length === 0 ? 1 : Math.max(...locations.map((w) => w.displayOrder), 0) + 1;

/**
 * 勤務拠点マスタ画面コンポーネント
 */
export const WorkLocationMaster: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<WorkLocationFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchWorkLocations = async (): Promise<WorkLocation[]> => {
    setIsLoading(true);
    try {
      const response = await getWorkLocations(includeInactive);
      setWorkLocations(response.workLocations);
      return response.workLocations;
    } catch (error) {
      logError('Failed to fetch work locations:', error);
      setSnackbar({ message: '勤務拠点の取得に失敗しました', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkLocations();
  }, [includeInactive]);

  useEffect(() => {
    if (!editingId && !isLoading && !formData.name.trim()) {
      const next = getNextDisplayOrder(workLocations);
      setFormData((prev) => ({ ...prev, displayOrder: next }));
    }
  }, [workLocations, editingId, isLoading, formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setSnackbar({ message: '拠点名を入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }
    if (formData.latitude === 0 && formData.longitude === 0) {
      setSnackbar({ message: '住所を検索して位置を選択するか、緯度・経度を入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }
    if (formData.latitude < -90 || formData.latitude > 90) {
      setSnackbar({ message: '緯度は -90〜90 の範囲で入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }
    if (formData.longitude < -180 || formData.longitude > 180) {
      setSnackbar({ message: '経度は -180〜180 の範囲で入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }
    if (formData.allowedRadius < 0) {
      setSnackbar({ message: '許容半径は 0 以上の値を入力してください', type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
      return;
    }

    try {
      if (editingId) {
        await updateWorkLocation(editingId, {
          name: formData.name,
          latitude: formData.latitude,
          longitude: formData.longitude,
          allowedRadius: formData.allowedRadius,
          displayOrder: formData.displayOrder
        });
        const locations = await fetchWorkLocations();
        setSnackbar({ message: '勤務拠点を更新しました', type: 'success' });
        setFormData({ ...initialFormData, displayOrder: getNextDisplayOrder(locations) });
      } else {
        const payload: CreateWorkLocationRequest = {
          name: formData.name,
          latitude: formData.latitude,
          longitude: formData.longitude,
          allowedRadius: formData.allowedRadius,
          displayOrder: formData.displayOrder
        };
        await createWorkLocation(payload);
        const locations = await fetchWorkLocations();
        setSnackbar({ message: '勤務拠点を登録しました', type: 'success' });
        setFormData({ ...initialFormData, displayOrder: getNextDisplayOrder(locations) });
      }
      setEditingId(null);
      setTimeout(() => setSnackbar(null), 3000);
    } catch (error) {
      logError('Failed to save work location:', error);
      const errorMessage = error instanceof Error ? error.message : '勤務拠点の保存に失敗しました';
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const handleEdit = (workLocation: WorkLocation) => {
    setFormData({
      name: workLocation.name,
      latitude: workLocation.latitude,
      longitude: workLocation.longitude,
      allowedRadius: workLocation.allowedRadius,
      displayOrder: workLocation.displayOrder
    });
    setEditingId(workLocation.id);
  };

  const handleDelete = (workLocation: WorkLocation) => {
    setConfirmModal({ isOpen: true, id: workLocation.id, name: workLocation.name });
  };

  const confirmDelete = async () => {
    if (confirmModal) {
      try {
        await deleteWorkLocation(confirmModal.id);
        await fetchWorkLocations();
        setSnackbar({ message: '勤務拠点を削除しました', type: 'success' });
        setConfirmModal(null);
        setTimeout(() => setSnackbar(null), 3000);
      } catch (error) {
        logError('Failed to delete work location:', error);
        const errorMessage = error instanceof Error ? error.message : '勤務拠点の削除に失敗しました';
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => setSnackbar(null), 3000);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ ...initialFormData, displayOrder: getNextDisplayOrder(workLocations) });
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
          title={`${confirmModal.name} 削除確認`}
          message="この勤務拠点を削除しますか？従業員に割り当てられている場合は削除できません。"
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
        勤務拠点マスタ
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? '1.5rem' : '1.25rem'
      }}>
        <div>
          <h3 style={{ marginBottom: '0.4rem', fontSize: isMobile ? '1.125rem' : '0.95rem' }}>
            {editingId ? '勤務拠点編集' : '新規登録'}
          </h3>
          <form onSubmit={handleSubmit} style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '0.6rem',
            borderRadius: '8px'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                拠点名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 本社、東京支店"
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
                住所検索（Google Maps） *
              </label>
              <GoogleMapLocationPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLocationChange={(result) => {
                  setFormData((prev) => {
                    const next = {
                      ...prev,
                      latitude: result.latitude,
                      longitude: result.longitude
                    };
                    if (result.address && !prev.name.trim()) {
                      next.name = result.address;
                    }
                    return next;
                  });
                }}
                placeholder="住所を検索して選択（例: 東京都渋谷区道玄坂）"
                isMobile={isMobile}
                mapHeight={isMobile ? 250 : 320}
              />
              <div style={{ marginTop: '0.5rem', fontSize: fontSizes.small, color: '#6b7280' }}>
                緯度・経度を手動で入力する場合：
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                <div>
                  <label style={{ fontSize: fontSizes.small, color: '#6b7280' }}>緯度</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    placeholder="35.6812"
                    style={{
                      width: '100%',
                      padding: '0.35rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: fontSizes.small, color: '#6b7280' }}>経度</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    placeholder="139.7671"
                    style={{
                      width: '100%',
                      padding: '0.35rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                許容半径 (m) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.allowedRadius}
                onChange={(e) => setFormData({ ...formData, allowedRadius: parseInt(e.target.value, 10) || 0 })}
                placeholder="例: 100"
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
              <div style={{ fontSize: fontSizes.small, color: '#6b7280', marginTop: '0.25rem' }}>
                オフィス中心からの距離（メートル）。50m以上を推奨
              </div>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                表示順
              </label>
              <input
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 1 })}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              {editingId && (
                <CancelButton size="small" fullWidth type="button" onClick={handleCancel} />
              )}
              {editingId ? (
                <UpdateButton size="small" fullWidth type="submit" />
              ) : (
                <RegisterButton size="small" fullWidth type="submit" />
              )}
            </div>
          </form>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? '1.125rem' : '0.95rem' }}>
              登録済み勤務拠点一覧
            </h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: fontSizes.small, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              削除済みも表示
            </label>
          </div>
          <div style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '0.6rem',
            borderRadius: '8px',
            maxHeight: isMobile ? '400px' : '600px',
            overflowY: 'auto'
          }}>
            {isLoading ? (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>読み込み中...</p>
            ) : workLocations.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>登録された勤務拠点がありません</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {workLocations.map((wl) => (
                  <div
                    key={wl.id}
                    style={{
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: wl.isActive ? 1 : 0.6
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        {wl.name}
                        {!wl.isActive && (
                          <span style={{ marginLeft: '0.5rem', fontSize: fontSizes.badge, color: '#6b7280' }}>
                            （削除済み）
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                        緯度: {wl.latitude.toFixed(4)}, 経度: {wl.longitude.toFixed(4)}
                      </div>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>
                        許容半径: {wl.allowedRadius}m, 表示順: {wl.displayOrder}
                      </div>
                    </div>
                    {wl.isActive && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <EditButton onClick={() => handleEdit(wl)} />
                        <DeleteButton onClick={() => handleDelete(wl)} />
                      </div>
                    )}
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
