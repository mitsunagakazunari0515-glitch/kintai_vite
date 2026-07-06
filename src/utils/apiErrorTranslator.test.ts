/**
 * apiErrorTranslator のユニットテスト
 * 設計書: attendance-workspace/docs/api/ERROR_CODES.md に定義されたエラーコード→日本語メッセージの
 * 対応関係が実装と一致していることを検証する。
 */
import { describe, it, expect } from 'vitest';
import { translateApiError, extractApiError, type ApiErrorResponse } from './apiErrorTranslator';

const buildApiError = (
  code: string,
  overrides: Partial<ApiErrorResponse> = {}
): ApiErrorResponse => ({
  statusCode: overrides.statusCode ?? 400,
  message: overrides.message,
  error: {
    code,
    message: overrides.error?.message,
    details: overrides.error?.details,
  },
});

describe('translateApiError', () => {
  describe('400 Bad Request 系（docs/api/ERROR_CODES.md 準拠）', () => {
    it('INVALID_EMPLOYEE_ID を日本語化する', () => {
      expect(translateApiError(buildApiError('INVALID_EMPLOYEE_ID'))).toBe(
        '従業員IDが正しくありません'
      );
    });

    it('INSUFFICIENT_PAID_LEAVE_BALANCE は残日数・申請日数を本文から抽出して日本語化する', () => {
      const error = buildApiError('INSUFFICIENT_PAID_LEAVE_BALANCE', {
        error: {
          code: 'INSUFFICIENT_PAID_LEAVE_BALANCE',
          message: 'Insufficient paid leave balance (remaining: 3.5 days, requested: 5 days)',
        },
      });
      expect(translateApiError(error)).toBe(
        '有給残日数が不足しています（残り: 3.5日、申請: 5日）'
      );
    });

    it('該当メッセージがない場合は日数を含まない汎用メッセージを返す', () => {
      expect(translateApiError(buildApiError('INSUFFICIENT_PAID_LEAVE_BALANCE'))).toBe(
        '有給残日数が不足しています'
      );
    });
  });

  describe('401 / 403 / 404 / 409 系', () => {
    it('AUTHENTICATION_REQUIRED を日本語化する', () => {
      expect(
        translateApiError(buildApiError('AUTHENTICATION_REQUIRED', { statusCode: 401 }))
      ).toBe('認証が必要です。ログインしてください');
    });

    it('ADMIN_PRIVILEGES_REQUIRED を日本語化する', () => {
      expect(
        translateApiError(buildApiError('ADMIN_PRIVILEGES_REQUIRED', { statusCode: 403 }))
      ).toBe('この操作には管理者権限が必要です');
    });

    it('EMPLOYEE_WITH_ID_NOT_FOUND は本文からIDを抽出して日本語化する', () => {
      const error = buildApiError('EMPLOYEE_WITH_ID_NOT_FOUND', {
        statusCode: 404,
        error: {
          code: 'EMPLOYEE_WITH_ID_NOT_FOUND',
          message: 'Employee with ID 42 not found',
        },
      });
      expect(translateApiError(error)).toBe('従業員ID 42 が見つかりません');
    });

    it('CLOCK_IN_ALREADY_RECORDED を日本語化する', () => {
      expect(
        translateApiError(buildApiError('CLOCK_IN_ALREADY_RECORDED', { statusCode: 409 }))
      ).toBe('この日付の出勤打刻は既に記録されています');
    });

    it('ATTENDANCE_LOCATION_ACCURACY_TOO_LOW を日本語化する（位置精度不足）', () => {
      expect(
        translateApiError(buildApiError('ATTENDANCE_LOCATION_ACCURACY_TOO_LOW', { statusCode: 400 }))
      ).toBe('位置情報の精度が低いため打刻できません。屋外や窓際などGPSの精度が高い場所で再度お試しください');
    });
  });

  describe('未知のエラーコード（statusCodeへのフォールバック）', () => {
    it('未定義のコードでも statusCode:403 なら権限エラーメッセージを返す', () => {
      expect(
        translateApiError(buildApiError('SOME_UNDOCUMENTED_CODE', { statusCode: 403 }))
      ).toBe('アクセス権限がありません。');
    });

    it('statusCodeが500以上ならサーバーエラーメッセージを返す', () => {
      expect(
        translateApiError(buildApiError('SOME_UNDOCUMENTED_CODE', { statusCode: 503 }))
      ).toBe('サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。');
    });
  });

  describe('Error インスタンスを渡した場合', () => {
    it('CORSエラーはネットワークエラーメッセージに変換する', () => {
      expect(translateApiError(new Error('Failed to fetch'))).toBe(
        'サーバーとの通信に失敗しました。ネットワーク接続を確認してください。'
      );
    });

    it('401を含むメッセージは認証エラーに変換する', () => {
      expect(translateApiError(new Error('Request failed with status 401'))).toBe(
        '認証に失敗しました。再度ログインしてください。'
      );
    });

    it('既に日本語のメッセージはそのまま返す', () => {
      expect(translateApiError(new Error('入力内容にエラーがあります'))).toBe(
        '入力内容にエラーがあります'
      );
    });
  });

  describe('VALIDATION_ERROR', () => {
    it('有給残日数不足メッセージを含む場合は専用メッセージに変換する', () => {
      const error = buildApiError('VALIDATION_ERROR', {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Insufficient paid leave balance remaining: 1 days, requested: 2 days',
        },
      });
      expect(translateApiError(error)).toBe(
        '有給残日数が不足しています（残り: 1日、申請: 2日）'
      );
    });

    it('details のみ存在する場合は先頭のバリデーションメッセージを返す', () => {
      const error = buildApiError('VALIDATION_ERROR', {
        error: {
          code: 'VALIDATION_ERROR',
          details: { email: ['メールアドレスが不正です'] },
        },
      });
      expect(translateApiError(error)).toBe('メールアドレスが不正です');
    });
  });

  describe('その他の入力', () => {
    it('null や未対応の値は汎用メッセージを返す', () => {
      expect(translateApiError(null)).toBe(
        'エラーが発生しました。しばらく時間をおいて再度お試しください。'
      );
    });
  });
});

describe('extractApiError', () => {
  it('JSONレスポンスから statusCode/message/error を抽出する', async () => {
    const response = new Response(
      JSON.stringify({ message: 'failure', error: { code: 'VALIDATION_ERROR', message: 'bad' } }),
      { status: 400 }
    );
    const result = await extractApiError(response);
    expect(result).toEqual({
      statusCode: 400,
      message: 'failure',
      error: { code: 'VALIDATION_ERROR', message: 'bad' },
    });
  });

  it('JSONパースに失敗した場合はstatusCodeのみのフォールバックを返す', async () => {
    const response = new Response('not json', { status: 500 });
    const result = await extractApiError(response);
    expect(result).toEqual({
      statusCode: 500,
      message: 'HTTP error! status: 500',
    });
  });
});
