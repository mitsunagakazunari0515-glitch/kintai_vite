import React from 'react';
import { fontSizes } from '../config/fontSizes';

/**
 * テーブルのカラム定義を表すインターフェース。
 *
 * @template T - テーブル行のデータ型
 */
export interface TableColumn<T> {
  /** カラムのキー（データのプロパティ名またはカスタムキー）。 */
  key: keyof T | string;
  /** カラムの表示ラベル。 */
  label: string;
  /** ソート可能かどうか。デフォルトはtrue。 */
  sortable?: boolean;
  /** カスタムレンダリング関数。 */
  render?: (value: any, row: T) => React.ReactNode;
  /** テキストの配置。デフォルトは'left'。 */
  align?: 'left' | 'center' | 'right';
  /** カラムの幅。 */
  width?: string;
  /** カラムの最小幅。 */
  minWidth?: string;
}

/**
 * テーブルコンポーネントのプロパティを表すインターフェース。
 *
 * @template T - テーブル行のデータ型
 */
export interface TableProps<T> {
  /** 表示するデータ配列。 */
  data: T[];
  /** カラム定義の配列。 */
  columns: TableColumn<T>[];
  /** ソート処理を行う関数。 */
  onSort?: (key: keyof T | string) => void;
  /** 現在のソートキー。 */
  sortKey?: keyof T | string | null;
  /** 現在のソート順。 */
  sortOrder?: 'asc' | 'desc';
  /** ソートアイコンを取得する関数。 */
  getSortIcon?: (key: keyof T | string) => string | null;
  /** データが空の場合に表示するメッセージ。 */
  emptyMessage?: string;
  /** モバイル表示かどうか。デフォルトはfalse。 */
  isMobile?: boolean;
  /** テーブルの最大高さ。 */
  maxHeight?: string;
  /** 各行のキーを取得する関数。 */
  rowKey?: (row: T) => string | number;
  /** 行クリック時の処理関数。 */
  onRowClick?: (row: T) => void;
}

/**
 * 共通テーブルコンポーネント。
 * ソート機能、レスポンシブ対応、カスタマイズ可能なカラムレンダリングを提供します。
 * モバイル表示ではカード形式、デスクトップ表示ではテーブル形式で表示されます。
 *
 * @param {TableProps<T>} props - テーブルのプロパティ。
 * @returns {JSX.Element} テーブルコンポーネント。
 * @template T - テーブル行のデータ型（Record<string, any>を継承）
 * @example
 * ```typescript
 * const columns: TableColumn<Employee>[] = [
 *   { key: 'id', label: 'ID', sortable: true },
 *   { key: 'name', label: '氏名', sortable: true },
 * ];
 * <Table data={employees} columns={columns} onSort={handleSort} />
 * ```
 */
export function Table<T extends Record<string, any>>({
  data,
  columns,
  onSort,
  sortKey: _sortKey,
  sortOrder: _sortOrder,
  getSortIcon,
  emptyMessage = 'データが見つかりません',
  isMobile = false,
  maxHeight,
  rowKey,
  onRowClick
}: TableProps<T>) {
  const getRowKey = (row: T, index: number): string | number => {
    if (rowKey) return rowKey(row);
    if ('id' in row && row.id) return String(row.id);
    return index;
  };

  if (data.length === 0) {
    return (
      <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
        {emptyMessage}
      </p>
    );
  }

  if (isMobile) {
    // モバイル表示: カード形式
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {data.map((row, index) => (
          <div
            key={getRowKey(row, index)}
            onClick={() => onRowClick?.(row)}
            style={{
              backgroundColor: 'white',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              cursor: onRowClick ? 'pointer' : 'default'
            }}
          >
            {columns.map((column) => {
              const value = column.key in row ? row[column.key as keyof T] : null;
              const renderedValue = column.render ? column.render(value, row) : value;
              
              return (
                <div
                  key={String(column.key)}
                  style={{
                    marginBottom: index < columns.length - 1 ? '0.75rem' : 0,
                    fontSize: fontSizes.medium,
                    color: '#6b7280'
                  }}
                >
                  <strong style={{ color: '#374151' }}>{column.label}:</strong>{' '}
                  <span>{renderedValue ?? '-'}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // デスクトップ表示: テーブル形式
  return (
    <div
      style={{
        overflowX: 'auto',
        maxHeight: maxHeight || 'calc(100vh - 350px)',
        overflowY: 'auto',
        flex: 1
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          minWidth: '1000px',
          border: '2px solid #e5e7eb'
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '2px solid #e5e7eb',
              backgroundColor: '#dbeafe',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            {columns.map((column) => {
              const isSortable = column.sortable !== false && onSort;
              const align = column.align || 'left';
              
              return (
                <th
                  key={String(column.key)}
                  style={{
                    padding: '0.75rem',
                    textAlign: align,
                    cursor: isSortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: column.width,
                    minWidth: column.minWidth
                  }}
                  onClick={() => isSortable && onSort(column.key)}
                >
                  {isSortable && getSortIcon && getSortIcon(column.key)}{' '}
                  {column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: '1px solid #e5e7eb',
                cursor: onRowClick ? 'pointer' : 'default'
              }}
            >
              {columns.map((column) => {
                const value = column.key in row ? row[column.key as keyof T] : null;
                const renderedValue = column.render ? column.render(value, row) : value;
                const align = column.align || 'left';
                
                return (
                  <td
                    key={String(column.key)}
                    style={{
                      padding: '0.75rem',
                      textAlign: align,
                      width: column.width,
                      minWidth: column.minWidth
                    }}
                  >
                    {renderedValue ?? '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

