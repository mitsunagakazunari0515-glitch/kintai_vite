/**
 * japaneseEncoder のユニットテスト
 * 設計書: attendance-workspace/docs/api/README.md 4章「日本語文字列のHTTPヘッダー送信ルール」
 * （UTF-8 → Base64 で常にエンコードし、デコード失敗時は元の値を返す）を検証する。
 */
import { describe, it, expect } from 'vitest';
import {
  isIso88591Only,
  encodeJapaneseString,
  decodeJapaneseString,
  encodeForHttpHeader,
  decodeFromHttpHeader,
} from './japaneseEncoder';

describe('isIso88591Only', () => {
  it('ASCII文字列は true を返す', () => {
    expect(isIso88591Only('Employee')).toBe(true);
  });

  it('日本語を含む文字列は false を返す', () => {
    expect(isIso88591Only('従業員')).toBe(false);
  });
});

describe('encodeJapaneseString / decodeJapaneseString（往復変換）', () => {
  it('日本語文字列をBase64エンコードし、デコードすると元に戻る', () => {
    const original = '光永 和功';
    const encoded = encodeJapaneseString(original);
    expect(encoded).not.toBe(original);
    expect(decodeJapaneseString(encoded)).toBe(original);
  });

  it('ASCII文字列でも常にBase64エンコードされる（フラグ不要方式）', () => {
    const original = 'Employee';
    const encoded = encodeJapaneseString(original);
    // Base64化されるため、平文とは異なる表現になる
    expect(encoded).toBe('RW1wbG95ZWU=');
    expect(decodeJapaneseString(encoded)).toBe(original);
  });

  it('空文字列は空文字列のまま返す', () => {
    expect(encodeJapaneseString('')).toBe('');
    expect(decodeJapaneseString('')).toBe('');
  });
});

describe('encodeForHttpHeader（後方互換API）', () => {
  it('常に isEncoded: true でBase64エンコードした値を返す', () => {
    const result = encodeForHttpHeader('田中 太郎');
    expect(result.isEncoded).toBe(true);
    expect(decodeJapaneseString(result.encodedValue)).toBe('田中 太郎');
  });

  it('空文字列の場合は isEncoded: false を返す', () => {
    expect(encodeForHttpHeader('')).toEqual({ encodedValue: '', isEncoded: false });
  });
});

describe('decodeFromHttpHeader（デコード失敗時は元の値にフォールバック）', () => {
  it('正しくBase64エンコードされた値はデコードして返す', () => {
    const encoded = encodeJapaneseString('山田 花子');
    expect(decodeFromHttpHeader(encoded)).toBe('山田 花子');
  });

  it('Base64として不正な値はデコードに失敗し、元の値をそのまま返す', () => {
    const invalidBase64 = 'これはBase64ではありません';
    expect(decodeFromHttpHeader(invalidBase64)).toBe(invalidBase64);
  });

  it('空文字列は空文字列のまま返す', () => {
    expect(decodeFromHttpHeader('')).toBe('');
  });
});
