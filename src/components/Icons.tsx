import React from 'react';

/**
 * アイコンコンポーネントのプロパティを表すインターフェース。
 */
interface IconProps {
  /** アイコンのサイズ（ピクセル）。デフォルトは20。 */
  size?: number;
  /** アイコンの色。デフォルトは'#6b7280'。 */
  color?: string;
}

/**
 * 編集アイコンコンポーネント。
 * 編集操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} 編集アイコンコンポーネント。
 */
export const EditIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 削除アイコンコンポーネント。
 * 削除操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} 削除アイコンコンポーネント。
 */
export const DeleteIcon: React.FC<IconProps> = ({ size = 20, color = '#ef4444' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M3 6h18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11v6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * プラスアイコンコンポーネント。
 * 登録操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} プラスアイコンコンポーネント。
 */
export const PlusIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * リフレッシュアイコンコンポーネント。
 * 更新操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} リフレッシュアイコンコンポーネント。
 */
export const RefreshIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3v5h-5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 21v-5h5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 保存アイコンコンポーネント。
 * 保存操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} 保存アイコンコンポーネント。
 */
export const SaveIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 21v-8H7v8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 3v5h8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * キャンセルアイコンコンポーネント。
 * キャンセル操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} キャンセルアイコンコンポーネント。
 */
export const CancelIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * アップロードアイコンコンポーネント。
 * 申請・アップロード操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} アップロードアイコンコンポーネント。
 */
export const UploadIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 8l-5-5-5 5M12 3v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 検索アイコンコンポーネント。
 * 閲覧・検索操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} 検索アイコンコンポーネント。
 */
export const SearchIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <circle
        cx="11"
        cy="11"
        r="8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m21 21-4.35-4.35"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 新規ファイルアイコンコンポーネント。
 * 新規登録操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} 新規ファイルアイコンコンポーネント。
 */
export const NewFileIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* ドキュメント本体 */}
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 角が折れた部分 */}
      <path
        d="M14 2v6h6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 左上の折り返し部分 */}
      <path
        d="M6 2v4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 2h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 左上の小さなプラス記号 */}
      <path
        d="M7 4h2M8 3v2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * PDFアイコンコンポーネント。
 * PDF出力操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} PDFアイコンコンポーネント。
 */
export const PdfIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 13H8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 17H8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 9H9H8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * チェックアイコンコンポーネント。
 * 確認・完了操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} チェックアイコンコンポーネント。
 */
export const CheckIcon: React.FC<IconProps> = ({ size = 20, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * バーガーメニューアイコンコンポーネント。
 * メニューを開く操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} バーガーメニューアイコンコンポーネント。
 */
export const MenuIcon: React.FC<IconProps> = ({ size = 24, color = '#ffffff' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M3 12h18M3 6h18M3 18h18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 閉じるアイコンコンポーネント。
 * メニューを閉じる操作を表すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} 閉じるアイコンコンポーネント。
 */
export const CloseIcon: React.FC<IconProps> = ({ size = 24, color = '#ffffff' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 下向き矢印アイコンコンポーネント。
 * 折りたたみ可能なセクションの展開を示すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} 下向き矢印アイコンコンポーネント。
 */
export const ChevronDownIcon: React.FC<IconProps> = ({ size = 24, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path d="M6 9L12 15L18 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/**
 * 上向き矢印アイコンコンポーネント。
 * 折りたたみ可能なセクションの折りたたみを示すアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} 上向き矢印アイコンコンポーネント。
 */
export const ChevronUpIcon: React.FC<IconProps> = ({ size = 24, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path d="M18 15L12 9L6 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/**
 * 閲覧アイコンコンポーネント。
 * ファイルと虫眼鏡アイコンが重なった形のアイコンを表示します。
 *
 * @param {IconProps} props - アイコンのプロパティ。
 * @returns {JSX.Element} 閲覧アイコンコンポーネント。
 */
export const ViewIcon: React.FC<IconProps> = ({ size = 24, color = '#6b7280' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* ファイルアイコン */}
      <path
        d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V8L14 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2V8H19"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 虫眼鏡アイコン（ファイルの上に重ねる） */}
      <circle
        cx="12"
        cy="13"
        r="3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 16L13 14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

