import React from 'react';
import { 
  EditIcon, 
  DeleteIcon, 
  CancelIcon as CancelIconComponent, 
  UploadIcon, 
  SearchIcon, 
  PdfIcon,
  CheckIcon,
  ViewIcon
} from './Icons';
import { fontSizes } from '../config/fontSizes';

/**
 * ボタンのバリアントを表す型。
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'icon-edit' | 'icon-delete';

/**
 * ボタンコンポーネントのプロパティを表すインターフェース。
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** ボタンのバリアント。 */
  variant?: ButtonVariant;
  /** ボタンのテキスト。アイコンボタンの場合は不要。 */
  children?: React.ReactNode;
  /** ボタンのサイズ。デフォルトは'medium'。 */
  size?: 'small' | 'medium' | 'large';
  /** フル幅かどうか。デフォルトはfalse。 */
  fullWidth?: boolean;
  /** アイコンサイズ（アイコンボタンの場合）。デフォルトは28。 */
  iconSize?: number;
}

/**
 * 共通ボタンコンポーネント。
 * システム全体で使用されるボタンのスタイルを統一します。
 *
 * @param {ButtonProps} props - ボタンのプロパティ。
 * @returns {JSX.Element} ボタンコンポーネント。
 * @example
 * ```typescript
 * // 登録ボタン
 * <Button variant="primary" onClick={handleRegister}>登録</Button>
 * 
 * // キャンセルボタン
 * <Button variant="secondary" onClick={handleCancel}>キャンセル</Button>
 * 
 * // 削除アイコンボタン
 * <Button variant="icon-delete" onClick={handleDelete} />
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  size = 'medium',
  fullWidth = false,
  iconSize = 28,
  style: propsStyleProp,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const getBaseStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      borderRadius: '4px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.2s, border-color 0.2s, color 0.2s, transform 0.2s',
      boxShadow: 'none',
      minHeight: 'auto',
      minWidth: 'auto',
      fontSize: fontSizes.button,
      ...(propsStyleProp || {})
    };

    // サイズに応じたパディング
    switch (size) {
      case 'small':
        baseStyle.padding = '0.4rem';
        break;
      case 'medium':
        baseStyle.padding = '0.75rem';
        break;
      case 'large':
        baseStyle.padding = '1rem';
        break;
    }

    // フル幅
    if (fullWidth) {
      baseStyle.width = '100%';
      baseStyle.flex = 1;
    }

    return baseStyle;
  };

  const getVariantStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'white',
          color: '#2563eb',
          border: '1px solid #2563eb'
        };
      case 'secondary':
        return {
          backgroundColor: 'white',
          color: '#2563eb',
          border: '1px solid #2563eb'
        };
      case 'danger':
        return {
          backgroundColor: 'white',
          color: '#dc2626',
          border: '1px solid #dc2626'
        };
      case 'icon-edit':
        return {
          padding: '0.5rem',
          background: 'transparent',
          backgroundColor: 'transparent',
          color: '#2563eb',
          border: 'none'
        };
      case 'icon-delete':
        return {
          padding: '0.75rem',
          background: 'transparent',
          backgroundColor: 'transparent',
          color: '#dc2626',
          border: 'none'
        };
      default:
        return {};
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    
    // props.styleで色が指定されている場合は、その色に基づいてホバー色を決定
    const currentColor = target.style.color || getComputedStyle(target).color;
    const currentBorderColor = target.style.borderColor || getComputedStyle(target).borderColor;
    
    // 緑色系（#16a34a, #15803dなど）の場合は緑のホバー色を適用
    if (currentColor.includes('rgb(22, 163, 74)') || currentColor.includes('#16a34a') || 
        currentBorderColor.includes('rgb(22, 163, 74)') || currentBorderColor.includes('#16a34a')) {
      target.style.backgroundColor = '#dcfce7';
      target.style.borderColor = '#15803d';
      target.style.color = '#15803d';
      target.style.transform = 'scale(1.02)';
    } else {
      // それ以外はvariantに基づいて処理
      switch (variant) {
        case 'primary':
          target.style.backgroundColor = '#eff6ff';
          target.style.borderColor = '#1d4ed8';
          target.style.color = '#1d4ed8';
          target.style.transform = 'scale(1.02)';
          break;
        case 'secondary':
          target.style.backgroundColor = '#eff6ff';
          target.style.borderColor = '#1d4ed8';
          target.style.color = '#1d4ed8';
          target.style.transform = 'scale(1.02)';
          break;
        case 'danger':
          target.style.backgroundColor = '#fee2e2';
          target.style.borderColor = '#b91c1c';
          target.style.color = '#b91c1c';
          target.style.transform = 'scale(1.02)';
          break;
        case 'icon-edit':
          target.style.backgroundColor = '#eff6ff';
          break;
        case 'icon-delete':
          target.style.backgroundColor = '#fee2e2';
          break;
      }
    }
    
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    
    // props.styleで色が指定されている場合は、その色に基づいて元の色を復元
    const initialColor = propsStyleProp?.color || target.getAttribute('data-initial-color');
    const initialBorderColor = propsStyleProp?.border?.toString().match(/solid\s+([^;]+)/)?.[1] || target.getAttribute('data-initial-border-color');
    
    // 緑色系の場合は緑の元の色を復元
    if (initialColor?.includes('#16a34a') || initialBorderColor?.includes('#16a34a')) {
      target.style.backgroundColor = 'white';
      target.style.borderColor = '#16a34a';
      target.style.color = '#16a34a';
      target.style.transform = 'scale(1)';
    } else {
      // それ以外はvariantに基づいて処理
      switch (variant) {
        case 'primary':
          target.style.backgroundColor = 'white';
          target.style.borderColor = '#2563eb';
          target.style.color = '#2563eb';
          target.style.transform = 'scale(1)';
          break;
        case 'secondary':
          target.style.backgroundColor = 'white';
          target.style.borderColor = '#2563eb';
          target.style.color = '#2563eb';
          target.style.transform = 'scale(1)';
          break;
        case 'danger':
          target.style.backgroundColor = 'white';
          target.style.borderColor = '#dc2626';
          target.style.color = '#dc2626';
          target.style.transform = 'scale(1)';
          break;
        case 'icon-edit':
          target.style.backgroundColor = 'transparent';
          break;
        case 'icon-delete':
          target.style.backgroundColor = 'transparent';
          break;
      }
    }
    
    onMouseLeave?.(e);
  };

  const baseStyle = getBaseStyle();
  const variantStyle = getVariantStyle();
  // props.styleを最後に適用して、variantStyleの重要なプロパティを確実に保持
  const { backgroundColor, border, color, ...restStyle } = baseStyle;
  const buttonStyle: React.CSSProperties = {
    ...restStyle,
    ...variantStyle,
    // variantStyleの重要なプロパティを確実に適用（props.styleで上書きされないように）
    backgroundColor: variantStyle.backgroundColor || 'white',
    border: variantStyle.border || border,
    color: variantStyle.color || color
  };

  // props.styleをbuttonStyleの後に適用して、variantStyleの重要なプロパティを保持
  // props.styleでbackgroundColor, border, colorが指定されている場合はそれを優先
  const finalStyle: React.CSSProperties = {
    ...buttonStyle,
    ...(propsStyleProp || {}),
    // props.styleで指定されていない場合のみvariantStyleを使用
    backgroundColor: propsStyleProp?.backgroundColor || variantStyle.backgroundColor || buttonStyle.backgroundColor,
    // アイコンのみのボタン（icon-edit, icon-delete）はボーダー無し、それ以外はボーダーあり
    border: (variant === 'icon-edit' || variant === 'icon-delete') 
      ? 'none' 
      : (propsStyleProp?.border || variantStyle.border || buttonStyle.border),
    color: propsStyleProp?.color || variantStyle.color || buttonStyle.color
  };
  
  // styleプロパティを除いたpropsを取得（propsには既にstyleが含まれていない）
  const restProps = props;

  // アイコンボタンの場合
  if (variant === 'icon-edit') {
    return (
      <button
        {...restProps}
        style={finalStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={props.title || '編集'}
      >
        <EditIcon size={iconSize} color="#2563eb" />
      </button>
    );
  }

  if (variant === 'icon-delete') {
    return (
      <button
        {...restProps}
        style={finalStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={props.title || '削除'}
      >
        <DeleteIcon size={iconSize} color="#dc2626" />
      </button>
    );
  }

  // 通常のボタン
  return (
    <button
      {...restProps}
      style={finalStyle}
      data-initial-color={propsStyleProp?.color || variantStyle.color}
      data-initial-border-color={propsStyleProp?.border?.toString().match(/solid\s+([^;]+)/)?.[1] || variantStyle.border?.toString().match(/solid\s+([^;]+)/)?.[1]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
};

/**
 * 登録ボタンコンポーネント。
 * 新規登録時に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 登録ボタンコンポーネント。
 */
export const RegisterButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 18, ...props }) => {
  const { onMouseEnter: propsOnMouseEnter, onMouseLeave: propsOnMouseLeave, style: propsStyle, ...restProps } = props;
  
  return (
    <Button 
      variant="primary" 
      {...restProps}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        backgroundColor: 'white',
        color: '#16a34a',
        border: '1px solid #16a34a',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...propsStyle 
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#dcfce7';
        e.currentTarget.style.borderColor = '#15803d';
        e.currentTarget.style.color = '#15803d';
        e.currentTarget.style.transform = 'scale(1.02)';
        propsOnMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderColor = '#16a34a';
        e.currentTarget.style.color = '#16a34a';
        e.currentTarget.style.transform = 'scale(1)';
        propsOnMouseLeave?.(e);
      }}
    >
      <CheckIcon size={iconSize} color="#16a34a" />
      登録
    </Button>
  );
};

/**
 * 更新ボタンコンポーネント。
 * 更新時に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 更新ボタンコンポーネント。
 */
export const UpdateButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 18, ...props }) => {
  const { onMouseEnter: propsOnMouseEnter, onMouseLeave: propsOnMouseLeave, style: propsStyle, ...restProps } = props;
  
  return (
    <Button 
      variant="primary" 
      {...restProps}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        backgroundColor: 'white',
        color: '#16a34a',
        border: '1px solid #16a34a',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...propsStyle 
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#dcfce7';
        e.currentTarget.style.borderColor = '#15803d';
        e.currentTarget.style.color = '#15803d';
        e.currentTarget.style.transform = 'scale(1.02)';
        propsOnMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderColor = '#16a34a';
        e.currentTarget.style.color = '#16a34a';
        e.currentTarget.style.transform = 'scale(1)';
        propsOnMouseLeave?.(e);
      }}
    >
      <CheckIcon size={iconSize} color="#16a34a" />
      更新
    </Button>
  );
};

/**
 * 保存ボタンコンポーネント。
 * 保存時に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 保存ボタンコンポーネント。
 */
export const SaveButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 18, ...props }) => {
  return (
    <Button 
      variant="primary" 
      {...props}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...props.style 
      }}
    >
      <CheckIcon size={iconSize} color="#2563eb" />
      保存
    </Button>
  );
};

/**
 * キャンセルボタンコンポーネント。
 * キャンセル時に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} キャンセルボタンコンポーネント。
 */
export const CancelButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 18, ...props }) => {
  return (
    <Button 
      variant="danger" 
      {...props}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...props.style 
      }}
    >
      <CancelIconComponent size={iconSize} color="#dc2626" />
      キャンセル
    </Button>
  );
};

/**
 * 編集ボタンコンポーネント。
 * 編集時に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 編集ボタンコンポーネント。
 */
export const EditButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 18, ...props }) => {
  return (
    <Button 
      variant="primary" 
      {...props}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...props.style 
      }}
    >
      <EditIcon size={iconSize} color="#2563eb" />
      編集
    </Button>
  );
};

/**
 * 削除ボタンコンポーネント。
 * 削除時に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 削除ボタンコンポーネント。
 */
export const DeleteButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 18, ...props }) => {
  return (
    <Button 
      variant="danger" 
      {...props}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...props.style 
      }}
    >
      <DeleteIcon size={iconSize} color="#dc2626" />
      削除
    </Button>
  );
};

/**
 * 申請ボタンコンポーネント。
 * 申請時に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 申請ボタンコンポーネント。
 */
export const ApplyButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 18, ...props }) => {
  return (
    <Button 
      variant="primary" 
      {...props}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...props.style 
      }}
    >
      <UploadIcon size={iconSize} color="#2563eb" />
      申請する
    </Button>
  );
};

/**
 * 閲覧ボタンコンポーネント。
 * 閲覧時に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 閲覧ボタンコンポーネント。
 */
export const ViewButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 16, ...props }) => {
  return (
    <Button 
      variant="primary" 
      size="small" 
      {...props}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...props.style 
      }}
    >
      <ViewIcon size={iconSize} color="#2563eb" />
      閲覧
    </Button>
  );
};

/**
 * 新規登録ボタンコンポーネント。
 * 新規登録時に使用するボタンです（「+新規登録」テキスト付き）。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 新規登録ボタンコンポーネント。
 */
export const NewRegisterButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 18, ...props }) => {
  return (
    <Button 
      variant="primary" 
      {...props}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...props.style 
      }}
    >
      + 新規登録
    </Button>
  );
};

/**
 * PDF出力ボタンコンポーネント。
 * PDF出力時に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} PDF出力ボタンコンポーネント。
 */
export const PdfExportButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 20, ...props }) => {
  return (
    <Button
      variant="danger" 
      {...props}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...props.style 
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#fee2e2';
        e.currentTarget.style.borderColor = '#b91c1c';
        e.currentTarget.style.color = '#b91c1c';
        props.onMouseEnter?.(e as any);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderColor = '#dc2626';
        e.currentTarget.style.color = '#dc2626';
        props.onMouseLeave?.(e as any);
      }}
    >
      <PdfIcon size={iconSize} color="#dc2626" />
      PDF出力
    </Button>
  );
};

/**
 * 承認ボタンコンポーネント。
 * 申請を承認する際に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'> & { isTableButton?: boolean }} props - ボタンのプロパティ。
 * @returns {JSX.Element} 承認ボタンコンポーネント。
 */
export const ApproveButton: React.FC<Omit<ButtonProps, 'variant'> & { isTableButton?: boolean }> = ({ iconSize = 18, isTableButton = false, ...props }) => {
  const { onMouseEnter: propsOnMouseEnter, onMouseLeave: propsOnMouseLeave, style: propsStyle, ...restProps } = props;

  return (
    <Button
      variant="primary"
      {...restProps}
      size={isTableButton ? 'small' : 'medium'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.05rem',
        backgroundColor: 'white',
        color: '#16a34a',
        border: '1px solid #16a34a',
        minWidth: isTableButton ? 'auto' : '100px',
        fontSize: isTableButton ? fontSizes.small : fontSizes.button,
        padding: isTableButton ? '0.25rem 0.5rem' : undefined,
        ...propsStyle
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#dcfce7';
        e.currentTarget.style.borderColor = '#15803d';
        e.currentTarget.style.color = '#15803d';
        e.currentTarget.style.transform = 'scale(1.02)';
        propsOnMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderColor = '#16a34a';
        e.currentTarget.style.color = '#16a34a';
        e.currentTarget.style.transform = 'scale(1)';
        propsOnMouseLeave?.(e);
      }}
    >
      <CheckIcon size={isTableButton ? 14 : iconSize} color="#16a34a" />
      承認
    </Button>
  );
};

/**
 * 一括承認ボタンコンポーネント。
 * 複数の申請を一括承認する際に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'> & { count?: number }} props - ボタンのプロパティ。
 * @returns {JSX.Element} 一括承認ボタンコンポーネント。
 */
export const BulkApproveButton: React.FC<Omit<ButtonProps, 'variant'> & { count?: number }> = ({ iconSize = 18, count = 0, ...props }) => {
  const { onMouseEnter: propsOnMouseEnter, onMouseLeave: propsOnMouseLeave, style: propsStyle, ...restProps } = props;

  return (
    <Button
      variant="primary"
      {...restProps}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.05rem',
        backgroundColor: count === 0 ? '#9ca3af' : 'white',
        color: count === 0 ? 'white' : '#16a34a',
        border: count === 0 ? '1px solid #9ca3af' : '1px solid #16a34a',
        minWidth: '100px',
        fontSize: fontSizes.button,
        opacity: count === 0 ? 0.5 : 1,
        cursor: count === 0 ? 'not-allowed' : 'pointer',
        ...propsStyle
      }}
      onMouseEnter={(e) => {
        if (count > 0 && !restProps.disabled) {
          e.currentTarget.style.backgroundColor = '#dcfce7';
          e.currentTarget.style.borderColor = '#15803d';
          e.currentTarget.style.color = '#15803d';
          e.currentTarget.style.transform = 'scale(1.02)';
          // アイコンの色も更新
          const icon = e.currentTarget.querySelector('svg');
          if (icon) {
            const paths = icon.querySelectorAll('path');
            paths.forEach(path => {
              path.setAttribute('stroke', '#15803d');
            });
          }
        }
        propsOnMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (count > 0 && !restProps.disabled) {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.borderColor = '#16a34a';
          e.currentTarget.style.color = '#16a34a';
          e.currentTarget.style.transform = 'scale(1)';
          // アイコンの色も更新
          const icon = e.currentTarget.querySelector('svg');
          if (icon) {
            const paths = icon.querySelectorAll('path');
            paths.forEach(path => {
              path.setAttribute('stroke', '#16a34a');
            });
          }
        } else if (count === 0 || restProps.disabled) {
          // disable時は元のスタイルに戻す
          e.currentTarget.style.backgroundColor = '#9ca3af';
          e.currentTarget.style.borderColor = '#9ca3af';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.transform = 'scale(1)';
          // アイコンの色も更新
          const icon = e.currentTarget.querySelector('svg');
          if (icon) {
            const paths = icon.querySelectorAll('path');
            paths.forEach(path => {
              path.setAttribute('stroke', 'white');
            });
          }
        }
        propsOnMouseLeave?.(e);
      }}
    >
      <CheckIcon size={iconSize} color={count === 0 ? 'white' : '#16a34a'} />
      一括承認 ({count}件)
    </Button>
  );
};

/**
 * 却下ボタンコンポーネント。
 * 申請を却下する際に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'> & { isTableButton?: boolean }} props - ボタンのプロパティ。
 * @returns {JSX.Element} 却下ボタンコンポーネント。
 */
export const RejectButton: React.FC<Omit<ButtonProps, 'variant'> & { isTableButton?: boolean }> = ({ isTableButton = false, ...props }) => {
  return (
    <Button
      variant="secondary"
      {...props}
      size={isTableButton ? 'small' : 'medium'}
      style={{
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        minWidth: isTableButton ? 'auto' : '100px',
        fontSize: isTableButton ? fontSizes.small : fontSizes.button,
        padding: isTableButton ? '0.25rem 0.5rem' : undefined,
        ...props.style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#4b5563';
        props.onMouseEnter?.(e as any);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#6b7280';
        props.onMouseLeave?.(e as any);
      }}
    >
      却下
    </Button>
  );
};

/**
 * 承認取消ボタンコンポーネント。
 * 承認を取り消す際に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'> & { isTableButton?: boolean }} props - ボタンのプロパティ。
 * @returns {JSX.Element} 承認取消ボタンコンポーネント。
 */
export const CancelApprovalButton: React.FC<Omit<ButtonProps, 'variant'> & { isTableButton?: boolean }> = ({ isTableButton = false, iconSize = 18, ...props }) => {
  const { onMouseEnter: propsOnMouseEnter, onMouseLeave: propsOnMouseLeave, style: propsStyle, ...restProps } = props;

  return (
    <Button
      variant="danger"
      {...restProps}
      size={isTableButton ? 'small' : 'medium'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.05rem',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        minWidth: isTableButton ? 'auto' : '100px',
        fontSize: isTableButton ? fontSizes.small : fontSizes.button,
        padding: isTableButton ? '0.25rem 0.5rem' : undefined,
        ...propsStyle
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#b91c1c';
        e.currentTarget.style.color = 'white';
        propsOnMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#dc2626';
        e.currentTarget.style.color = 'white';
        propsOnMouseLeave?.(e);
      }}
    >
      <CancelIconComponent size={isTableButton ? 14 : iconSize} color="white" />
      取消
    </Button>
  );
};

/**
 * 全選択/全解除ボタンコンポーネント。
 * 一括選択機能で使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'> & { isAllSelected: boolean }} props - ボタンのプロパティ。
 * @returns {JSX.Element} 全選択/全解除ボタンコンポーネント。
 */
export const SelectAllButton: React.FC<Omit<ButtonProps, 'variant'> & { isAllSelected: boolean }> = ({ isAllSelected, ...props }) => {
  const { onMouseEnter: propsOnMouseEnter, onMouseLeave: propsOnMouseLeave, style: propsStyle, ...restProps } = props;

  return (
    <Button
      variant="primary"
      {...restProps}
      style={{
        backgroundColor: 'white',
        color: '#2563eb',
        border: '1px solid #2563eb',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...propsStyle
      }}
      onMouseEnter={(e) => {
        if (!restProps.disabled) {
          e.currentTarget.style.backgroundColor = '#eff6ff';
          e.currentTarget.style.borderColor = '#1d4ed8';
          e.currentTarget.style.color = '#1d4ed8';
        }
        propsOnMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!restProps.disabled) {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.borderColor = '#2563eb';
          e.currentTarget.style.color = '#2563eb';
        }
        propsOnMouseLeave?.(e);
      }}
    >
      {isAllSelected ? '全解除' : '全選択'}
    </Button>
  );
};

/**
 * 検索ボタンコンポーネント。
 * 検索機能で使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 検索ボタンコンポーネント。
 */
export const SearchButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ iconSize = 18, ...props }) => {
  const { onMouseEnter: propsOnMouseEnter, onMouseLeave: propsOnMouseLeave, style: propsStyle, ...restProps } = props;

  return (
    <Button
      variant="primary"
      {...restProps}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.05rem',
        backgroundColor: 'white',
        color: '#2563eb',
        border: '1px solid #2563eb',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...propsStyle
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#eff6ff';
        e.currentTarget.style.borderColor = '#1d4ed8';
        e.currentTarget.style.color = '#1d4ed8';
        e.currentTarget.style.transform = 'scale(1.02)';
        // アイコンの色も更新
        const icon = e.currentTarget.querySelector('svg');
        if (icon) {
          const paths = icon.querySelectorAll('path, circle');
          paths.forEach(path => {
            path.setAttribute('stroke', '#1d4ed8');
          });
        }
        propsOnMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderColor = '#2563eb';
        e.currentTarget.style.color = '#2563eb';
        e.currentTarget.style.transform = 'scale(1)';
        // アイコンの色も更新
        const icon = e.currentTarget.querySelector('svg');
        if (icon) {
          const paths = icon.querySelectorAll('path, circle');
          paths.forEach(path => {
            path.setAttribute('stroke', '#2563eb');
          });
        }
        propsOnMouseLeave?.(e);
      }}
    >
      <SearchIcon size={iconSize} color="#2563eb" />
      検索
    </Button>
  );
};

/**
 * クリアボタンコンポーネント。
 * 検索条件をクリアする際に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} クリアボタンコンポーネント。
 */
export const ClearButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ ...props }) => {
  const { onMouseEnter: propsOnMouseEnter, onMouseLeave: propsOnMouseLeave, style: propsStyle, ...restProps } = props;

  return (
    <Button
      variant="secondary"
      {...restProps}
      style={{
        backgroundColor: 'white',
        color: '#6b7280',
        border: '1px solid #6b7280',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...propsStyle
      }}
      onMouseEnter={(e) => {
        if (!restProps.disabled) {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
          e.currentTarget.style.borderColor = '#4b5563';
          e.currentTarget.style.color = '#4b5563';
        }
        propsOnMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!restProps.disabled) {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.borderColor = '#6b7280';
          e.currentTarget.style.color = '#6b7280';
        }
        propsOnMouseLeave?.(e);
      }}
    >
      クリア
    </Button>
  );
};

/**
 * 戻るボタンコンポーネント。
 * 前の画面に戻る際に使用するボタンです。
 *
 * @param {Omit<ButtonProps, 'variant'>} props - ボタンのプロパティ。
 * @returns {JSX.Element} 戻るボタンコンポーネント。
 */
export const BackButton: React.FC<Omit<ButtonProps, 'variant'>> = ({ ...props }) => {
  const { onMouseEnter: propsOnMouseEnter, onMouseLeave: propsOnMouseLeave, style: propsStyle, ...restProps } = props;

  return (
    <Button
      variant="secondary"
      {...restProps}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.05rem',
        backgroundColor: 'white',
        color: '#6b7280',
        border: '1px solid #6b7280',
        minWidth: '100px',
        fontSize: fontSizes.button,
        ...propsStyle
      }}
      onMouseEnter={(e) => {
        if (!restProps.disabled) {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
          e.currentTarget.style.borderColor = '#4b5563';
          e.currentTarget.style.color = '#4b5563';
        }
        propsOnMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!restProps.disabled) {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.borderColor = '#6b7280';
          e.currentTarget.style.color = '#6b7280';
        }
        propsOnMouseLeave?.(e);
      }}
    >
      ← 戻る
    </Button>
  );
};

