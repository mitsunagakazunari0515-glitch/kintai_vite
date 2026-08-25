/**
 * 共通ボタン（全社共通・単一ソース）。実体は @a1int/ui に集約。
 * デザイン（色・形・ホバー）は勤怠を正典として @a1int/ui に取り込んだため見た目は不変。
 * 既存の import パス（'../components/Button' 等）は互換のため維持する。
 */
export {
  Button, type ButtonProps, type ButtonVariant,
  RegisterButton, UpdateButton, SaveButton, CancelButton, EditButton, DeleteButton,
  ApplyButton, ViewButton, NewRegisterButton, PdfExportButton, ApproveButton,
  BulkApproveButton, RejectButton, CancelApprovalButton, SelectAllButton,
  SearchButton, ClearButton, BackButton,
} from '@a1int/ui';
