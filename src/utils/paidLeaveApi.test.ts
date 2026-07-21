/**
 * paidLeaveApi のユニットテスト。
 *
 * 対象: getPaidLeaveBalance / syncPaidLeaveGrants / syncAllPaidLeaveGrants
 * 設計書: attendance-workspace/docs/api/ENDPOINTS.md 2-A章
 *
 * apiRequest（config/apiConfig）をモックし、正しいエンドポイント・メソッドを叩き、
 * レスポンスの data フィールドをアンラップして返すことを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from '../config/apiConfig';
import { getPaidLeaveBalance, syncPaidLeaveGrants, syncAllPaidLeaveGrants } from './paidLeaveApi';

// apiConfig.apiRequest をモック化（実ネットワークを避ける）。
vi.mock('../config/apiConfig', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

/** fetch の Response 風モックを作る。 */
const okResponse = (body: unknown) =>
  ({ ok: true, json: async () => body } as unknown as Response);

describe('paidLeaveApi', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('getPaidLeaveBalance は GET /api/v1/paid-leave/:id を叩き data をアンラップする', async () => {
    const balance = {
      employeeId: 3,
      grants: [
        { grantLedgerId: 'AUTO-3-1', grantDate: '2024-07-01', grantDays: 10, expirationDate: '2026-07-01', remainingDays: 4 },
      ],
      totalRemaining: 4,
      nextExpiration: '2026-07-01',
    };
    mockedApiRequest.mockResolvedValue(okResponse({ statusCode: 200, message: 'success', data: balance }));

    const result = await getPaidLeaveBalance('3');

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/paid-leave/3', { method: 'GET' });
    expect(result).toEqual(balance);
    expect(result.totalRemaining).toBe(4);
  });

  it('syncPaidLeaveGrants は POST /api/v1/paid-leave/:id/sync を叩く', async () => {
    mockedApiRequest.mockResolvedValue(okResponse({ statusCode: 200, message: 'success', data: { employeeId: 5, created: 2 } }));

    const result = await syncPaidLeaveGrants('5');

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/paid-leave/5/sync', { method: 'POST' });
    expect(result).toEqual({ employeeId: 5, created: 2 });
  });

  it('syncAllPaidLeaveGrants は POST /api/v1/paid-leave/sync を叩く', async () => {
    mockedApiRequest.mockResolvedValue(okResponse({ statusCode: 200, message: 'success', data: { totalCreated: 7, results: [] } }));

    const result = await syncAllPaidLeaveGrants();

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/paid-leave/sync', { method: 'POST' });
    expect(result.totalCreated).toBe(7);
  });

  it('レスポンスが ok でない場合はエラーを投げる', async () => {
    mockedApiRequest.mockResolvedValue({ ok: false, status: 403, json: async () => ({ statusCode: 403, message: 'Forbidden' }) } as unknown as Response);

    await expect(getPaidLeaveBalance('9')).rejects.toBeTruthy();
  });
});
