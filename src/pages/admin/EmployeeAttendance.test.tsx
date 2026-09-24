/**
 * 管理者用出勤簿画面の「勤怠を追加」（休憩欄）と「勤怠の編集」のテスト。
 * 設計書: attendance-workspace/docs/frontend/UI_SPECIFICATION.md「7-A. 出勤簿画面」
 * API はモックし、PUT /api/v1/attendance（updateAttendance）に渡る内容を検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EmployeeAttendance } from './EmployeeAttendance';
import { getPayrollClosingYearMonthFromDate, getPayrollPeriodBounds } from '../../utils/payrollPeriod';
import type { AttendanceLog, AttendanceMyRecordsResponse } from '../../utils/attendanceApi';

const { getAttendanceMyRecords, updateAttendance } = vi.hoisted(() => ({
  getAttendanceMyRecords: vi.fn(),
  updateAttendance: vi.fn()
}));

vi.mock('../../utils/attendanceApi', async importOriginal => ({
  ...(await importOriginal<typeof import('../../utils/attendanceApi')>()),
  getAttendanceMyRecords,
  updateAttendance
}));
vi.mock('../../utils/employeeApi', () => ({
  getEmployees: vi.fn().mockResolvedValue([{ id: '7', firstName: '山田', lastName: '太郎' }])
}));
vi.mock('../../utils/paidLeaveApi', () => ({
  getPaidLeaveBalance: vi.fn().mockResolvedValue(null)
}));

// 表示中の給与期間（今日を含む期間）の初日を、打刻済みの日として使う。
const ym = getPayrollClosingYearMonthFromDate(new Date());
const workDate = getPayrollPeriodBounds(ym.year, ym.month).startDate;

const recordedLog: AttendanceLog = {
  attendanceId: 'a1',
  employeeId: '7',
  workDate,
  clockIn: `${workDate} 08:00:00`,
  clockOut: `${workDate} 17:00:00`,
  breaks: [{ id: 'b1', start: `${workDate} 12:00:00`, end: `${workDate} 13:00:00` }] as AttendanceLog['breaks'],
  status: 'completed',
  dayTypeOverride: null,
  updatedAt: `${workDate} 17:00:00`
};

const response = (logs: AttendanceLog[]): AttendanceMyRecordsResponse => ({
  summary: {
    yearMonth: '',
    employeeName: '山田 太郎',
    scheduledWorkDays: 0,
    actualWorkHours: 0,
    actualOvertimeHours: 0,
    actualWorkDays: 0,
    weekdayWorkDays: 0,
    holidayWorkDays: 0,
    absenceDays: 0,
    annualPaidLeaveDays: 0,
    usedPaidLeaveDays: 0,
    remainingPaidLeaveDays: 0,
    paidLeaveExpirationDate: ''
  },
  logs,
  total: logs.length
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/employees/attendance?employeeId=7']}>
      <EmployeeAttendance />
    </MemoryRouter>
  );

const setTime = async (input: HTMLElement, value: string) => {
  const user = userEvent.setup();
  await user.clear(input);
  await user.type(input, value);
};

describe('EmployeeAttendance: 勤怠を追加・勤怠の編集', () => {
  beforeEach(() => {
    getAttendanceMyRecords.mockReset().mockResolvedValue(response([recordedLog]));
    updateAttendance.mockReset().mockResolvedValue(recordedLog);
  });

  it('勤怠を追加: 入力した休憩が breaks として送られる（#1）', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '＋ 勤怠を追加' }));
    const dialog = screen.getByRole('heading', { name: '勤怠を追加（打刻忘れの後入力）' }).parentElement!;

    const dateInput = dialog.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, '2026-09-10');
    const [clockIn, clockOut] = dialog.querySelectorAll('input[type="time"]');
    await setTime(clockIn as HTMLElement, '08:00');
    await setTime(clockOut as HTMLElement, '17:00');
    await user.click(within(dialog).getByRole('button', { name: '＋ 休憩を追加' }));
    await setTime(within(dialog).getByLabelText('休憩1の開始時刻'), '12:00');
    await setTime(within(dialog).getByLabelText('休憩1の終了時刻'), '13:00');
    await user.click(within(dialog).getByRole('button', { name: '追加' }));

    expect(updateAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: '7',
        workDate: '2026-09-10',
        breaks: [{ start: '2026-09-10 12:00:00', end: '2026-09-10 13:00:00' }]
      })
    );
  });

  it('勤怠を追加: 休憩未入力なら breaks を送らない（既存の休憩を消さない）', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '＋ 勤怠を追加' }));
    const dialog = screen.getByRole('heading', { name: '勤怠を追加（打刻忘れの後入力）' }).parentElement!;
    await user.type(dialog.querySelector('input[type="date"]') as HTMLInputElement, '2026-09-10');
    await setTime(dialog.querySelectorAll('input[type="time"]')[0] as HTMLElement, '08:00');
    await user.click(within(dialog).getByRole('button', { name: '追加' }));

    expect(updateAttendance).toHaveBeenCalledTimes(1);
    expect(updateAttendance.mock.calls[0][0]).not.toHaveProperty('breaks');
  });

  it('勤怠を追加: 終了が開始より前の休憩は保存しない', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '＋ 勤怠を追加' }));
    const dialog = screen.getByRole('heading', { name: '勤怠を追加（打刻忘れの後入力）' }).parentElement!;
    await user.type(dialog.querySelector('input[type="date"]') as HTMLInputElement, '2026-09-10');
    await setTime(dialog.querySelectorAll('input[type="time"]')[0] as HTMLElement, '08:00');
    await user.click(within(dialog).getByRole('button', { name: '＋ 休憩を追加' }));
    await setTime(within(dialog).getByLabelText('休憩1の開始時刻'), '13:00');
    await setTime(within(dialog).getByLabelText('休憩1の終了時刻'), '12:00');
    await user.click(within(dialog).getByRole('button', { name: '追加' }));

    expect(updateAttendance).not.toHaveBeenCalled();
    expect(await screen.findByText('休憩1の終了時刻は開始時刻より後にしてください')).toBeInTheDocument();
  });

  it('勤怠の編集: 打刻済みの日を選ぶと現在値が入り、勤務区分を通常出勤に変えて保存できる（#2）', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '勤怠の編集' }));
    const dialog = screen.getByRole('heading', { name: '勤怠の編集' }).parentElement!;

    const [dateSelect, dayTypeSelect] = within(dialog).getAllByRole('combobox');
    await user.selectOptions(dateSelect, workDate);
    const times = dialog.querySelectorAll('input[type="time"]');
    expect((times[0] as HTMLInputElement).value).toBe('08:00');
    expect((times[1] as HTMLInputElement).value).toBe('17:00');
    expect(within(dialog).getByLabelText<HTMLInputElement>('休憩1の開始時刻').value).toBe('12:00');

    await user.selectOptions(dayTypeSelect, 'weekday');
    await user.click(within(dialog).getByRole('button', { name: '更新' }));

    expect(updateAttendance).toHaveBeenCalledWith({
      employeeId: '7',
      workDate,
      clockIn: `${workDate} 08:00:00`,
      clockOut: `${workDate} 17:00:00`,
      dayTypeOverride: 'weekday',
      breaks: [{ start: `${workDate} 12:00:00`, end: `${workDate} 13:00:00` }]
    });
  });

  it('勤怠の編集: 休憩を削除すると breaks: [] で送る（全件置換）', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '勤怠の編集' }));
    const dialog = screen.getByRole('heading', { name: '勤怠の編集' }).parentElement!;
    await user.selectOptions(within(dialog).getAllByRole('combobox')[0], workDate);
    await user.click(within(dialog).getByRole('button', { name: '削除' }));
    await user.click(within(dialog).getByRole('button', { name: '更新' }));

    expect(updateAttendance).toHaveBeenCalledWith(expect.objectContaining({ breaks: [] }));
  });
});
