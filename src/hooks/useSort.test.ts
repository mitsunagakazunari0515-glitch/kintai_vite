/**
 * useSort のユニットテスト
 * 設計書: attendance-workspace/docs/frontend/UI_SPECIFICATION.md
 * 「各カラムでのソート（昇順/降順）」の挙動（同じキー再クリックで昇順→降順、数値/日付/文字列の比較方法）を検証する。
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSort } from './useSort';

interface Employee {
  name: string;
  baseSalary: number;
  joinDate: string;
}

const employees: Employee[] = [
  { name: '山田', baseSalary: 300000, joinDate: '2024-04-01' },
  { name: '鈴木', baseSalary: 250000, joinDate: '2023-01-15' },
  { name: '田中', baseSalary: 280000, joinDate: '2025-06-01' },
];

describe('useSort', () => {
  it('初期状態ではソートされず、元の順序のまま返す', () => {
    const { result } = renderHook(() => useSort(employees));
    expect(result.current.sortedData).toEqual(employees);
    expect(result.current.sortKey).toBeNull();
  });

  it('数値カラムを昇順→降順にソートできる', () => {
    const { result } = renderHook(() => useSort(employees));

    act(() => result.current.handleSort('baseSalary'));
    expect(result.current.sortOrder).toBe('asc');
    expect(result.current.sortedData.map((e) => e.baseSalary)).toEqual([
      250000, 280000, 300000,
    ]);

    // 同じキーを再度クリックすると降順に切り替わる
    act(() => result.current.handleSort('baseSalary'));
    expect(result.current.sortOrder).toBe('desc');
    expect(result.current.sortedData.map((e) => e.baseSalary)).toEqual([
      300000, 280000, 250000,
    ]);
  });

  it('日付カラム（joinDate）は文字列として日付順にソートされる', () => {
    const { result } = renderHook(() => useSort(employees));

    act(() => result.current.handleSort('joinDate'));
    expect(result.current.sortedData.map((e) => e.joinDate)).toEqual([
      '2023-01-15',
      '2024-04-01',
      '2025-06-01',
    ]);
  });

  it('異なるキーをクリックすると昇順から開始する', () => {
    const { result } = renderHook(() => useSort(employees));

    act(() => result.current.handleSort('baseSalary'));
    act(() => result.current.handleSort('baseSalary')); // desc にしておく
    expect(result.current.sortOrder).toBe('desc');

    act(() => result.current.handleSort('name'));
    expect(result.current.sortKey).toBe('name');
    expect(result.current.sortOrder).toBe('asc');
  });

  it('getSortIcon は現在のソートキーのみ矢印を返す', () => {
    const { result } = renderHook(() => useSort(employees));

    expect(result.current.getSortIcon('baseSalary')).toBeNull();

    act(() => result.current.handleSort('baseSalary'));
    expect(result.current.getSortIcon('baseSalary')).toBe('↑');
    expect(result.current.getSortIcon('name')).toBeNull();

    act(() => result.current.handleSort('baseSalary'));
    expect(result.current.getSortIcon('baseSalary')).toBe('↓');
  });

  it('初期ソートキー・順序を指定できる', () => {
    const { result } = renderHook(() => useSort(employees, 'baseSalary', 'desc'));
    expect(result.current.sortedData.map((e) => e.baseSalary)).toEqual([
      300000, 280000, 250000,
    ]);
  });
});
