import { useNavigate } from 'react-router-dom'

type ButtonVariant = 'primary' | 'secondary' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'
type ButtonPosition = 'inline' | 'fixed'

interface AddFormulaButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  position?: ButtonPosition
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  to?: string
  className?: string
  showIcon?: boolean
  iconOnly?: boolean
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2.5',
}

const fixedSizeClasses: Record<ButtonSize, string> = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
}

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/30',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-lg',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30',
}

export default function AddFormulaButton({
  variant = 'primary',
  size = 'md',
  position = 'inline',
  loading = false,
  disabled = false,
  onClick,
  to,
  className = '',
  showIcon = true,
  iconOnly = false,
}: AddFormulaButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (loading || disabled) return

    if (onClick) {
      onClick()
    } else if (to) {
      navigate(to)
    } else {
      navigate('/admin')
    }
  }

  // 图标组件
  const Icon = () => (
    <svg
      className={`${iconSizes[size]} ${loading ? 'animate-spin' : ''} flex-shrink-0`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {loading ? (
        // 加载动画：圆圈
        <>
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </>
      ) : (
        // 默认 + 图标
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      )}
    </svg>
  )

  // 固定定位按钮（右下角悬浮）
  if (position === 'fixed') {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`
          fixed bottom-6 right-6 z-50
          ${fixedSizeClasses[size]}
          rounded-full
          ${variantClasses[variant]}
          flex items-center justify-center
          transition-all duration-200 ease-out
          active:scale-95
          hover:scale-105
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          focus:outline-none focus:ring-4 focus:ring-primary-500/30
          ${className}
        `}
        title={iconOnly ? '录入新公式' : undefined}
        aria-label="录入新公式"
      >
        {showIcon && <Icon />}
      </button>
    )
  }

  // 内联按钮
  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        ${sizeClasses[size]}
        rounded-lg
        font-medium
        ${variantClasses[variant]}
        transition-all duration-200 ease-out
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
        ${className}
      `}
    >
      {showIcon && <Icon />}
      {!iconOnly && (
        <span className="whitespace-nowrap">
          {loading ? '加载中...' : '录入公式'}
        </span>
      )}
    </button>
  )
}

// 预设快捷组件
export function AddFormulaFixedButton(props: Omit<AddFormulaButtonProps, 'position'>) {
  return <AddFormulaButton {...props} position="fixed" />
}

export function AddFormulaInlineButton(props: Omit<AddFormulaButtonProps, 'position'>) {
  return <AddFormulaButton {...props} position="inline" />
}
