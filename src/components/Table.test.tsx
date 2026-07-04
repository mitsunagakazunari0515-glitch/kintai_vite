/**
 * Table コンポーネントのユニットテスト
 * 設計書: attendance-workspace/docs/frontend/UI_SPECIFICATION.md
 * 「デスクトップ: テーブル形式の一覧表示」「ソート可能な項目」「データが空の場合に表示するメッセージ」を検証する。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table, type TableColumn } from './Table';

interface Employee {
  id: string;
  name: string;
  baseSalary: number;
}

const columns: TableColumn<Employee>[] = [
  { key: 'name', label: '氏名' },
  { key: 'baseSalary', label: '基本給' },
];

const employees: Employee[] = [
  { id: '1', name: '山田太郎', baseSalary: 300000 },
  { id: '2', name: '鈴木花子', baseSalary: 250000 },
];

describe('Table', () => {
  it('データが空の場合はemptyMessageを表示する', () => {
    render(<Table data={[]} columns={columns} />);
    expect(screen.getByText('データが見つかりません')).toBeInTheDocument();
  });

  it('emptyMessageを指定した場合はそのメッセージを表示する', () => {
    render(<Table data={[]} columns={columns} emptyMessage="従業員が登録されていません" />);
    expect(screen.getByText('従業員が登録されていません')).toBeInTheDocument();
  });

  it('データ行とカラムラベルを表示する', () => {
    render(<Table data={employees} columns={columns} />);

    expect(screen.getByText('氏名')).toBeInTheDocument();
    expect(screen.getByText('基本給')).toBeInTheDocument();
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
    expect(screen.getByText('鈴木花子')).toBeInTheDocument();
    expect(screen.getByText('300000')).toBeInTheDocument();
  });

  it('列見出しクリックでonSortが呼ばれる（sortable指定時）', async () => {
    const user = userEvent.setup();
    const handleSort = vi.fn();
    render(<Table data={employees} columns={columns} onSort={handleSort} />);

    await user.click(screen.getByText('氏名'));
    expect(handleSort).toHaveBeenCalledWith('name');
  });

  it('行クリックでonRowClickが対象行データとともに呼ばれる', async () => {
    const user = userEvent.setup();
    const handleRowClick = vi.fn();
    render(<Table data={employees} columns={columns} onRowClick={handleRowClick} />);

    await user.click(screen.getByText('山田太郎'));
    expect(handleRowClick).toHaveBeenCalledWith(employees[0]);
  });

  it('モバイル表示ではカード形式でラベルと値を併記する', () => {
    render(<Table data={employees} columns={columns} isMobile />);
    // 各行カードに「氏名:」ラベルが1つずつ（2行分）表示される
    expect(screen.getAllByText('氏名:')).toHaveLength(employees.length);
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
  });
});
