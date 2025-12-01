/**
 * ファイル名: AttendanceList.tsx
 * 画面名: 勤怠情報一覧画面
 * 説明: 管理者が全従業員の勤怠情報を一覧表示する画面
 * 機能:
 *   - 全従業員の勤怠情報一覧表示
 *   - 日付範囲でのフィルタリング
 *   - 従業員名・IDでの検索
 *   - 勤怠情報の詳細表示
 *   - ソート機能
 */

import { useState, useEffect } from 'react';
import { formatTime, formatDate } from '../../utils/formatters';
import { fontSizes } from '../../config/fontSizes';
import { Button, RegisterButton, CancelButton, EditButton } from '../../components/Button';
import { Snackbar } from '../../components/Snackbar';
import { dummyAttendanceLogs } from '../../data/dummyData';
import { useSort } from '../../hooks/useSort';
import { ChevronDownIcon, ChevronUpIcon } from '../../components/Icons';

/**
 * 休憩時間を表すインターフェース。
 */
interface Break {
  /** 休憩開始時刻。 */
  start: string;
  /** 休憩終了時刻。nullの場合は休憩中。 */
  end: string | null;
}

/**
 * 勤怠ログを表すインターフェース。
 */
interface AttendanceLog {
  /** 勤怠ログID。 */
  id: string;
  /** 従業員ID。 */
  employeeId?: string;
  /** 従業員名。 */
  employeeName?: string;
  /** 出勤日。 */
  date: string;
  /** 出勤時刻。nullの場合は未出勤。 */
  clockIn: string | null;
  /** 退勤時刻。nullの場合は未退勤。 */
  clockOut: string | null;
  /** 休憩時間の配列。 */
  breaks: Break[];
  /** 勤怠ステータス。 */
  status: '未出勤' | '出勤中' | '休憩中' | '退勤済み';
  /** メモ。 */
  memo?: string | null;
}

/**
 * 勤怠情報一覧画面コンポーネント。
 * 管理者が全従業員の勤怠情報を一覧表示します。
 * 日付範囲でのフィルタリング、ソート、メモ編集機能を提供します。
 *
 * @returns {JSX.Element} 勤怠情報一覧画面コンポーネント。
 */
export const AttendanceList: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(
    dummyAttendanceLogs.map(log => ({
      ...log,
      employeeId: log.employeeId || '',
      employeeName: log.employeeName || '',
      status: log.status as '未出勤' | '出勤中' | '休憩中' | '退勤済み',
      memo: log.memo || ''
    }))
  );
  // 今週の開始日（月曜日）と終了日（日曜日）を計算
  const getThisWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = 日曜日, 1 = 月曜日, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 月曜日までのオフセット
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const thisWeek = getThisWeekDates();
  const [startDate, setStartDate] = useState(thisWeek.start);
  const [endDate, setEndDate] = useState(thisWeek.end);
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [memo, setMemo] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false); // モバイル時の検索条件の展開状態

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredLogs = attendanceLogs.filter(log => {
    const matchesStartDate = !startDate || log.date >= startDate;
    const matchesEndDate = !endDate || log.date <= endDate;
    return matchesStartDate && matchesEndDate;
  });

  // ソート機能を共通フックから取得
  const { handleSort, getSortIcon, sortedData: sortedLogs } = useSort<AttendanceLog>(
    filteredLogs
  );

  // 労働時間、残業時間、深夜時間、休憩時間を計算
  const calculateWorkTimes = (log: AttendanceLog) => {
    if (!log.clockIn || !log.clockOut) {
      return {
        workTime: '-',
        overtime: '-',
        lateNight: '-',
        breakTime: '-'
      };
    }
    
    const [inHour, inMinute] = log.clockIn.split(':').map(Number);
    const [outHour, outMinute] = log.clockOut.split(':').map(Number);
    const inMinutes = inHour * 60 + inMinute;
    const outMinutes = outHour * 60 + outMinute;
    
    // 休憩時間計算
    let breakMinutes = 0;
    if (log.breaks && log.breaks.length > 0) {
      log.breaks.forEach(breakItem => {
        if (breakItem.start && breakItem.end) {
          const [bStartHour, bStartMinute] = breakItem.start.split(':').map(Number);
          const [bEndHour, bEndMinute] = breakItem.end.split(':').map(Number);
          const bStartMinutes = bStartHour * 60 + bStartMinute;
          const bEndMinutes = bEndHour * 60 + bEndMinute;
          breakMinutes += Math.max(0, bEndMinutes - bStartMinutes);
        }
      });
    }
    const breakHours = Math.floor(breakMinutes / 60);
    const breakMins = breakMinutes % 60;
    const breakTime = `${String(breakHours).padStart(2, '0')}:${String(breakMins).padStart(2, '0')}`;
    
    // 労働時間
    const workMinutes = outMinutes - inMinutes - breakMinutes;
    const workHours = Math.floor(workMinutes / 60);
    const workMins = workMinutes % 60;
    const workTime = `${String(workHours).padStart(2, '0')}:${String(workMins).padStart(2, '0')}`;
    
    // 残業時間（8時間を超える分）
    const standardWorkMinutes = 8 * 60;
    let overtime = '00:00';
    if (workMinutes > standardWorkMinutes) {
      const overtimeMinutes = workMinutes - standardWorkMinutes;
      const overtimeHours = Math.floor(overtimeMinutes / 60);
      const overtimeMins = overtimeMinutes % 60;
      overtime = `${String(overtimeHours).padStart(2, '0')}:${String(overtimeMins).padStart(2, '0')}`;
    }
    
    // 深夜時間（22時以降の労働時間、簡易的に0:00と表示）
    const lateNight = '00:00';
    
    return {
      workTime,
      overtime,
      lateNight,
      breakTime
    };
  };

  // 編集ボタンクリック時の処理
  const handleEdit = (log: AttendanceLog) => {
    setEditingLog(log);
    setMemo(log.memo || '');
    setShowModal(true);
  };

  // モーダルを閉じる
  const handleCancel = () => {
    setShowModal(false);
    setEditingLog(null);
    setMemo('');
  };

  // メモを保存
  const handleSave = () => {
    if (!editingLog) return;
    
    setAttendanceLogs(prevLogs =>
      prevLogs.map(log =>
        log.id === editingLog.id ? { ...log, memo } : log
      )
    );
    
    setShowModal(false);
    setEditingLog(null);
    setMemo('');
    setSnackbar({ message: 'メモを保存しました', type: 'success' });
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
        勤怠情報一覧
      </h2>

      {/* 検索条件 */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: isMobile ? '0' : '0.75rem',
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
                <div style={{ flex: '1', minWidth: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                    開始日
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
                    }}
                  />
                </div>
                <div style={{ flex: '1', minWidth: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                    終了日
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
                    }}
                  />
                </div>
                <div style={{ 
                  fontSize: fontSizes.medium, 
                  color: '#6b7280',
                  minWidth: '100%'
                }}>
                  検索結果: {filteredLogs.length}件
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
          <div style={{ flex: isMobile ? '1' : '0 0 auto', minWidth: isMobile ? '100%' : '170px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: isMobile ? '100%' : '170px',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
              }}
            />
          </div>
          <div style={{ flex: isMobile ? '1' : '0 0 auto', minWidth: isMobile ? '100%' : '170px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              style={{
                width: isMobile ? '100%' : '170px',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                height: 'calc(0.5rem * 2 + 0.875rem + 2px)'
              }}
            />
          </div>
          <div style={{ 
            fontSize: fontSizes.medium, 
            color: '#6b7280',
            flex: isMobile ? '1' : '0 0 auto',
            alignSelf: isMobile ? 'flex-start' : 'flex-end',
            paddingBottom: isMobile ? '0' : '0.25rem',
            minWidth: isMobile ? '100%' : 'auto'
          }}>
            検索結果: {filteredLogs.length}件
          </div>
          </div>
        )}
      </div>

      {/* 勤怠情報一覧 */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: isMobile ? '1rem' : '0rem',
        borderRadius: '8px'
      }}>
        {sortedLogs.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            勤怠情報が見つかりません
          </p>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sortedLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  backgroundColor: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: fontSizes.large, marginBottom: '0.5rem' }}>
                  {log.employeeId} - {log.employeeName}
                </div>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  出勤日: {formatDate(log.date)}
                </div>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  出勤時刻: {log.clockIn ? formatTime(log.clockIn) : '-'}
                </div>
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  退勤時刻: {log.clockOut ? formatTime(log.clockOut) : '-'}
                </div>
                {(() => {
                  const times = calculateWorkTimes(log);
                  return (
                    <>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                        労働時間: {times.workTime}
                      </div>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                        残業時間: {times.overtime}
                      </div>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                        深夜時間: {times.lateNight}
                      </div>
                      <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                        休憩時間: {times.breakTime}
                      </div>
                    </>
                  );
                })()}
                <div style={{ fontSize: fontSizes.medium, color: '#6b7280', marginBottom: '0.25rem' }}>
                  メモ: {log.memo || '-'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <EditButton
                    onClick={() => handleEdit(log)}
                    size="small"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            overflowX: 'auto',
            maxHeight: isMobile ? '400px' : 'calc(100vh - 350px)',
            overflowY: 'auto',
            flex: 1
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate', 
              borderSpacing: 0, 
              minWidth: '1000px', 
              border: '2px solid #e5e7eb' 
            }}>
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
                    onClick={() => handleSort('date')}
                  >
                    {getSortIcon('date')} 出勤日
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('employeeId')}
                  >
                    {getSortIcon('employeeId')} 従業員ID
                  </th>
                  <th 
                    style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('employeeName')}
                  >
                    {getSortIcon('employeeName')} 従業員名
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>出勤時刻</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>退勤時刻</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>労働時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>残業時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>深夜時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>休憩時間</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>メモ</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>編集</th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map((log) => {
                  const times = calculateWorkTimes(log);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem' }}>{formatDate(log.date)}</td>
                      <td style={{ padding: '0.75rem' }}>{log.employeeId}</td>
                      <td style={{ padding: '0.75rem' }}>{log.employeeName}</td>
                      <td style={{ padding: '0.75rem' }}>{log.clockIn ? formatTime(log.clockIn) : '-'}</td>
                      <td style={{ padding: '0.75rem' }}>{log.clockOut ? formatTime(log.clockOut) : '-'}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{times.workTime}</td>
                      <td style={{ padding: '0.75rem' }}>{times.overtime}</td>
                      <td style={{ padding: '0.75rem' }}>{times.lateNight}</td>
                      <td style={{ padding: '0.75rem' }}>{times.breakTime}</td>
                      <td style={{ padding: '0.75rem', maxWidth: '200px' }}>
                        <div style={{ 
                          fontSize: fontSizes.medium, 
                          color: '#6b7280',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {log.memo || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {isMobile ? (
                          <EditButton
                            onClick={() => handleEdit(log)}
                            size="small"
                          />
                        ) : (
                          <Button
                            variant="icon-edit"
                            onClick={() => handleEdit(log)}
                            title="編集"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* メモ編集モーダル */}
      {showModal && editingLog && (
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
            <h3 style={{ marginBottom: '1.05rem', fontSize: isMobile ? fontSizes.h3.mobile : fontSizes.h3.desktop }}>
              メモ編集
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                <strong>従業員:</strong> {editingLog.employeeName} ({editingLog.employeeId})
              </div>
              <div style={{ marginBottom: '0.5rem', fontSize: fontSizes.medium, color: '#6b7280' }}>
                <strong>日付:</strong> {formatDate(editingLog.date)}
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: fontSizes.label }}>
                メモ
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="メモを入力してください"
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: fontSizes.textarea,
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
              <CancelButton
                fullWidth
                type="button"
                onClick={handleCancel}
              />
              <RegisterButton
                fullWidth
                type="button"
                onClick={handleSave}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
