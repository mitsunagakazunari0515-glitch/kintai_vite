import { useState, useMemo } from 'react';

/**
 * ソート順を表す型。
 */
export type SortOrder = 'asc' | 'desc';

/**
 * ソート設定を表すインターフェース。
 *
 * @template T - ソート対象のデータ型
 */
export interface SortConfig<T> {
  /** ソート対象のキー。nullの場合はソートなし。 */
  key: keyof T | null;
  /** ソート順（昇順または降順）。 */
  order: SortOrder;
}

/**
 * useSortフックの戻り値を表すインターフェース。
 *
 * @template T - ソート対象のデータ型
 */
export interface UseSortReturn<T> {
  /** 現在のソートキー。nullの場合はソートなし。 */
  sortKey: keyof T | null;
  /** 現在のソート順。 */
  sortOrder: SortOrder;
  /** ソートキーを変更する関数。 */
  handleSort: (key: keyof T) => void;
  /** ソートアイコンを取得する関数。 */
  getSortIcon: (key: keyof T) => string | null;
  /** ソート済みのデータ配列。 */
  sortedData: T[];
}

/**
 * テーブルのソート機能を提供するカスタムフック。
 * データ配列を指定されたキーでソートし、ソート状態と操作関数を返します。
 *
 * @param {T[]} data - ソート対象のデータ配列。
 * @param {keyof T | null} initialSortKey - 初期ソートキー。デフォルトはnull（ソートなし）。
 * @param {SortOrder} initialSortOrder - 初期ソート順。デフォルトは'asc'（昇順）。
 * @returns {UseSortReturn<T>} ソート関連の状態と関数を含むオブジェクト。
 * @template T - ソート対象のデータ型（Record<string, any>を継承）
 * @example
 * ```typescript
 * const { sortedData, handleSort, getSortIcon } = useSort(employees, 'name', 'asc');
 * ```
 */
export function useSort<T extends Record<string, any>>(
  data: T[],
  initialSortKey: keyof T | null = null,
  initialSortOrder: SortOrder = 'asc'
): UseSortReturn<T> {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      // 同じキーをクリックした場合は昇順→降順→昇順と循環
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいキーをクリックした場合は昇順から開始
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (key: keyof T): string | null => {
    if (sortKey !== key) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      let aValue: any = a[sortKey];
      let bValue: any = b[sortKey];

      // null/undefinedの処理
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // 日付の場合は文字列として比較
      const dateKeys = ['date', 'joinDate', 'leaveDate', 'updatedAt', 'createdAt', 'requestedAt'];
      if (dateKeys.includes(String(sortKey))) {
        return sortOrder === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      }

      // 数値の場合は数値として比較
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // 文字列の場合は文字列として比較
      return sortOrder === 'asc'
        ? String(aValue).localeCompare(String(bValue), 'ja')
        : String(bValue).localeCompare(String(aValue), 'ja');
    });
  }, [data, sortKey, sortOrder]);

  return {
    sortKey,
    sortOrder,
    handleSort,
    getSortIcon,
    sortedData
  };
}

