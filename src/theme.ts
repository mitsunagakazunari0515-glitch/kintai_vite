import { DEFAULT_HEADER_GRADIENT, type SystemTheme } from '@a1int/ui';

/**
 * 勤怠管理システムのシステム識別テーマ（UI ルール §6〜§9）。
 * 共通コンポーネント（AppShell のヘッダー・ナビ、Button の編集色など）が useSystemTheme() で参照する。
 * 勤怠は全システムの見た目の正典なので、値は従来の配色と同じにする。
 */
export const KINTAI_THEME: SystemTheme = {
  name: 'A・1勤怠管理システム',
  headerGradient: DEFAULT_HEADER_GRADIENT,
  accent: '#8b5a2b',
  accentDark: '#4b3b2b',
  accentSoft: '#f9f3eb',
  onHeader: '#fff',
};
