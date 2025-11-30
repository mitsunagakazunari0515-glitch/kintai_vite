/**
 * ファイル名: LeaveRequest.tsx
 * 画面名: 有給申請画面
 * 説明: 従業員の有給申請、有給残日数確認、過去の取得履歴確認を行う画面
 * 機能:
 *   - 有給申請（全休暇/半休の選択可能）
 *   - 有給残日数の確認（有給期限表示）
 *   - 過去の有給取得履歴の確認
 *   - 申請履歴の表示
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Snackbar } from '../../components/Snackbar';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';
import { fontSizes } from '../../config/fontSizes';

interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  type: '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他';
  reason: string;
  status: '申請中' | '承認' | '削除済み';
  isHalfDay?: boolean; // 半休かどうか
}

type ViewMode = 'apply' | 'history';

export const LeaveRequest: React.FC = () => {
  const { userId } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([
    {
      id: '1',
      employeeId: userId || '',
      startDate: '2024-01-10',
      endDate: '2024-01-10',
      days: 1,
      type: '有給',
      reason: '私用のため',
      status: '承認',
      isHalfDay: false
    },
    {
      id: '2',
      employeeId: userId || '',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      days: 0.5,
      type: '有給',
      reason: '午前中のみ',
      status: '承認',
      isHalfDay: true
    },
    // 2025年度のダミーデータ
    {
      id: '3',
      employeeId: userId || '',
      startDate: '2025-04-15',
      endDate: '2025-04-15',
      days: 1,
      type: '有給',
      reason: '私用のため',
      status: '承認',
      isHalfDay: false
    },
    {
      id: '4',
      employeeId: userId || '',
      startDate: '2025-05-20',
      endDate: '2025-05-20',
      days: 0.5,
      type: '有給',
      reason: '午前中のみ',
      status: '承認',
      isHalfDay: true
    },
    {
      id: '5',
      employeeId: userId || '',
      startDate: '2025-06-10',
      endDate: '2025-06-12',
      days: 3,
      type: '有給',
      reason: '旅行のため',
      status: '承認',
      isHalfDay: false
    },
    {
      id: '6',
      employeeId: userId || '',
      startDate: '2025-07-05',
      endDate: '2025-07-05',
      days: 1,
      type: '特別休暇',
      reason: '慶弔のため',
      status: '承認',
      isHalfDay: false
    },
    {
      id: '7',
      employeeId: userId || '',
      startDate: '2025-08-15',
      endDate: '2025-08-15',
      days: 1,
      type: '欠勤',
      reason: '体調不良のため',
      status: '申請中',
      isHalfDay: false
    },
    {
      id: '8',
      employeeId: userId || '',
      startDate: '2025-09-20',
      endDate: '2025-09-20',
      days: 1,
      type: '病気休暇',
      reason: '病院受診のため',
      status: '承認',
      isHalfDay: false
    },
    {
      id: '9',
      employeeId: userId || '',
      startDate: '2025-10-10',
      endDate: '2025-10-10',
      days: 0.5,
      type: '有給',
      reason: '午後のみ',
      status: '承認',
      isHalfDay: true
    },
    {
      id: '10',
      employeeId: userId || '',
      startDate: '2025-11-15',
      endDate: '2025-11-15',
      days: 1,
      type: '欠勤',
      reason: '私用のため',
      status: '削除済み',
      isHalfDay: false
    },
    {
      id: '11',
      employeeId: userId || '',
      startDate: '2025-12-25',
      endDate: '2025-12-25',
      days: 1,
      type: '有給',
      reason: 'クリスマスのため',
      status: '承認',
      isHalfDay: false
    },
    {
      id: '12',
      employeeId: userId || '',
      startDate: '2026-01-10',
      endDate: '2026-01-10',
      days: 1,
      type: '有給',
      reason: '私用のため',
      status: '承認',
      isHalfDay: false
    },
    {
      id: '13',
      employeeId: userId || '',
      startDate: '2026-02-20',
      endDate: '2026-02-20',
      days: 0.5,
      type: '有給',
      reason: '午前中のみ',
      status: '申請中',
      isHalfDay: true
    },
    {
      id: '14',
      employeeId: userId || '',
      startDate: '2026-03-15',
      endDate: '2026-03-15',
      days: 1,
      type: '特別休暇',
      reason: '慶弔のため',
      status: '承認',
      isHalfDay: false
    }
  ]);
  const [formData, setFormData] = useState<Omit<LeaveRequest, 'id' | 'status'>>({
    employeeId: userId || '',
    startDate: '',
    endDate: '',
    days: 0,
    type: '有給',
    reason: '',
    isHalfDay: false
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState<ViewMode>('apply');
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [searchFiscalYear, setSearchFiscalYear] = useState<number>(getCurrentFiscalYear());
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 全休暇の場合、開始日と終了日から日数を自動計算
  useEffect(() => {
    if (!formData.isHalfDay && formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      setFormData(prev => {
        if (prev.days !== diffDays) {
          return { ...prev, days: diffDays };
        }
        return prev;
      });
    } else if (formData.isHalfDay && formData.startDate) {
      // 半休の場合は0.5日で固定
      setFormData(prev => {
        if (prev.days !== 0.5 || prev.endDate !== formData.startDate) {
          return { ...prev, days: 0.5, endDate: formData.startDate };
        }
        return prev;
      });
    }
  }, [formData.startDate, formData.endDate, formData.isHalfDay]);

  // 有給残日数の計算（申請時のバリデーション用）
  const totalPaidLeaveDays = 20; // 年間有給日数
  const usedPaidLeaveDays = requests
    .filter(req => req.type === '有給' && req.status === '承認')
    .reduce((sum, req) => sum + req.days, 0);
  const remainingPaidLeaveDays = totalPaidLeaveDays - usedPaidLeaveDays;

  // 申請履歴を年度でフィルタリング
  const filteredRequests = requests.filter(req => {
    const requestDate = new Date(req.startDate);
    const requestYear = requestDate.getFullYear();
    const requestMonth = requestDate.getMonth() + 1;
    // 年度の範囲をチェック: searchFiscalYear年度 = searchFiscalYear年4月 〜 searchFiscalYear+1年3月
    if (requestYear === searchFiscalYear && requestMonth >= 4) return true;
    if (requestYear === searchFiscalYear + 1 && requestMonth <= 3) return true;
    return false;
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 半休の場合は終了日を開始日と同じにする
    const finalEndDate = formData.isHalfDay ? formData.startDate : formData.endDate;
    
    if (!formData.startDate || !formData.reason) {
      setSnackbar({ message: '必須項目を入力してください', type: 'error' });
      return;
    }

    if (!formData.isHalfDay && !formData.endDate) {
      setSnackbar({ message: '終了日を入力してください', type: 'error' });
      return;
    }

    // 有給の場合、残日数をチェック
    if (formData.type === '有給') {
      if (remainingPaidLeaveDays < formData.days) {
        setSnackbar({ message: `有給残日数が不足しています。残り: ${remainingPaidLeaveDays}日`, type: 'error' });
        return;
      }
    }

    const newRequest: LeaveRequest = {
      id: Date.now().toString(),
      ...formData,
      endDate: finalEndDate,
      status: '申請中'
    };
    setRequests([newRequest, ...requests]);
    setFormData({
      employeeId: userId || '',
      startDate: '',
      endDate: '',
      days: 0,
      type: '有給',
      reason: '',
      isHalfDay: false
    });
    setSnackbar({ message: '有給申請を提出しました', type: 'success' });
    setViewMode('history');
  };

  const handleCancelRequest = (requestId: string) => {
    if (window.confirm('申請を取消しますか？')) {
      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, status: '削除済み' as const } : req
      ));
      setSnackbar({ message: '申請を取消しました', type: 'success' });
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
        休暇申請
      </h2>

      {/* タブナビゲーション */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: isMobile ? '1rem' : '1.5rem',
        borderBottom: '2px solid rgba(255, 255, 255, 0.25)',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setViewMode('apply')}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: viewMode === 'apply' ? '#2563eb' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderBottom: viewMode === 'apply' ? '3px solid #ffffff' : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: viewMode === 'apply' ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            opacity: viewMode === 'apply' ? 1 : 0.7,
            textShadow: viewMode === 'apply'
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : '0 1px 2px rgba(0,0,0,0.25)'
          }}
        >
          申請
        </button>
        <button
          onClick={() => setViewMode('history')}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: viewMode === 'history' ? '#2563eb' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderBottom: viewMode === 'history' ? '3px solid #ffffff' : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: viewMode === 'history' ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            opacity: viewMode === 'history' ? 1 : 0.7,
            textShadow: viewMode === 'history'
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : '0 1px 2px rgba(0,0,0,0.25)'
          }}
        >
          申請履歴
        </button>
      </div>

      {/* 申請画面 */}
      {viewMode === 'apply' && (
        <div>
          <h3 style={{ marginBottom: '0.7rem', fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop }}>新規申請</h3>
          <form onSubmit={handleSubmit} style={{
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '8px',
            maxWidth: isMobile ? '100%' : '600px'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                休暇種別 *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveRequest['type'] })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: fontSizes.select
                }}
              >
                <option value="有給">有給</option>
                <option value="特別休暇">特別休暇</option>
                <option value="病気休暇">病気休暇</option>
                <option value="欠勤">欠勤</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                休暇区分 *
              </label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  backgroundColor: !formData.isHalfDay ? '#dbeafe' : 'transparent',
                  border: `2px solid ${!formData.isHalfDay ? '#2563eb' : '#d1d5db'}`,
                  fontSize: fontSizes.label
                }}>
                  <input
                    type="radio"
                    checked={!formData.isHalfDay}
                    onChange={() => {
                      setFormData({ ...formData, isHalfDay: false });
                    }}
                    style={{ marginRight: '0.5rem' }}
                  />
                  全休暇
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  backgroundColor: formData.isHalfDay ? '#dbeafe' : 'transparent',
                  border: `2px solid ${formData.isHalfDay ? '#2563eb' : '#d1d5db'}`,
                  fontSize: fontSizes.label
                }}>
                  <input
                    type="radio"
                    checked={formData.isHalfDay}
                    onChange={() => {
                      setFormData({ ...formData, isHalfDay: true, days: 0.5, endDate: formData.startDate });
                    }}
                    style={{ marginRight: '0.5rem' }}
                  />
                  半休（0.5日）
                </label>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                開始日 *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  setFormData({ ...formData, startDate: e.target.value });
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: fontSizes.button,
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            {!formData.isHalfDay && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                  終了日 *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value });
                  }}
                  min={formData.startDate}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: fontSizes.input,
                    boxSizing: 'border-box'
                  }}
                  required={!formData.isHalfDay}
                />
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                日数
              </label>
              <input
                type="text"
                value={formData.days > 0 ? `${formData.days}日${formData.days === 0.5 ? '（半休）' : ''}` : ''}
                readOnly
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: '#f3f4f6',
                  fontSize: fontSizes.input,
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                理由 *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  fontSize: fontSizes.textarea,
                  resize: 'vertical'
                }}
                placeholder="申請理由を入力してください"
                required
              />
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
              申請する
            </button>
          </form>
        </div>
      )}

      {/* 申請履歴画面 */}
      {viewMode === 'history' && (
        <div>
          <h3 style={{ marginBottom: '0.7rem', fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop }}>申請履歴</h3>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              年度:
              <input
                type="number"
                value={searchFiscalYear}
                onChange={(e) => setSearchFiscalYear(parseInt(e.target.value) || getCurrentFiscalYear())}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: fontSizes.input,
                  width: '100px',
                  boxSizing: 'border-box'
                }}
              />
            </label>
            <span style={{ fontSize: fontSizes.medium, color: '#6b7280' }}>
              ({searchFiscalYear}年4月 〜 {searchFiscalYear + 1}年3月)
            </span>
            <button
              type="button"
              onClick={() => setSearchFiscalYear(getCurrentFiscalYear())}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: fontSizes.button,
                cursor: 'pointer',
                boxShadow: 'none',
                minHeight: 'auto',
                minWidth: 'auto'
              }}
            >
              今年度に戻す
            </button>
          </div>
          <div style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            maxHeight: isMobile ? '400px' : '600px',
            overflowY: 'auto'
          }}>
            {filteredRequests.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>申請履歴がありません</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    style={{
                      backgroundColor: request.status === '削除済み' ? '#f3f4f6' : 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      opacity: request.status === '削除済み' ? 0.7 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: request.status === '削除済み' ? '#9ca3af' : '#1f2937'
                      }}>
                        {request.type}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: fontSizes.badge,
                          backgroundColor: request.status === '承認' ? '#d1fae5' :
                                           request.status === '削除済み' ? '#e5e7eb' : '#fef3c7',
                          color: request.status === '承認' ? '#065f46' :
                                 request.status === '削除済み' ? '#6b7280' : '#92400e'
                        }}>
                          {request.status}
                        </span>
                        {request.status === '申請中' && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(request.id)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#dc2626',
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
                            取消
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: fontSizes.medium, 
                      color: request.status === '削除済み' ? '#9ca3af' : '#6b7280', 
                      marginBottom: '0.5rem' 
                    }}>
                      {request.startDate} {request.startDate !== request.endDate ? `～ ${request.endDate}` : ''} 
                      ({request.days}日{request.isHalfDay ? '（半休）' : ''})
                    </div>
                    <div style={{ 
                      fontSize: fontSizes.medium,
                      color: request.status === '削除済み' ? '#9ca3af' : '#1f2937'
                    }}>
                      {request.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

