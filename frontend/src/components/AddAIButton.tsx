import { useNavigate } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface AddAIButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  icon?: boolean
  text?: string
  className?: string
  onClick?: () => void
}

export default function AddAIButton({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = true,
  text = '添加AI',
  className = '',
  onClick,
}: AddAIButtonProps) {
  const navigate = useNavigate()

  // 基础样式
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    active:scale-95 transform
  `

  // 变体样式
  const variantStyles: Record<ButtonVariant, string> = {
    primary: `
      bg-gradient-to-r from-blue-600 to-indigo-600
      hover:from-blue-700 hover:to-indigo-700
      text-white shadow-md hover:shadow-lg
      focus:ring-blue-500
    `,
    secondary: `
      bg-white border border-gray-300
      hover:bg-gray-50 hover:border-gray-400
      text-gray-700 shadow-sm hover:shadow
      focus:ring-gray-400
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-pink-600
      hover:from-red-600 hover:to-pink-700
      text-white shadow-md hover:shadow-lg
      focus:ring-red-500
    `,
  }

  // 尺寸样式
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
    md: 'px-4 py-2 text-base rounded-lg gap-2',
    lg: 'px-6 py-3 text-lg rounded-xl gap-2.5',
  }

  // 状态样式
  const stateStyles = disabled || loading
    ? 'opacity-60 cursor-not-allowed active:scale-100 transform-none'
    : 'cursor-pointer'

  const handleClick = () => {
    if (!disabled && !loading) {
      if (onClick) {
        onClick()
      } else {
        navigate('/admin/ai/add')
      }
    }
  }

  // AI 图标
  const AIIcon = () => (
    <svg
      className={`${loading ? 'animate-spin' : ''} flex-shrink-0`}
      width={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
      height={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {loading ? (
        // 加载动画 - 旋转圆环
        <>
          <circle cx="12" cy="12" r="10" strokeOpacity={0.25} strokeWidth={4} fill="none" />
          <path
            d="M22 12a10 10 0 01-10 10A10 10 0 013.27 16.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={4}
          />
        </>
      ) : (
        // AI 大脑图标
        <>
          <path d="M12 2a3 3 0 013 3v14a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z" />
          <path d="M12 8v4" />
          <path d="M9 11h6" />
          <path d="M9 5h6" />
          <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
          <path d="M4.22 10.22a2 2 0 010-2.828l2.828-2.828a2 2 0 012.828 0 2 2 0 010 2.828L7.05 10.22a2 2 0 01-2.828 0z" />
          <path d="M19.78 10.22a2 2 0 010-2.828l-2.828-2.828a2 2 0 01-2.828 0 2 2 0 010 2.828l2.828 2.828a2 2 0 012.828 0z" />
        </>
      )}
    </svg>
  )

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${stateStyles}
        ${className}
      `}
      aria-label={text}
    >
      {icon && <AIIcon />}
      <span className="whitespace-nowrap">{loading ? '添加中...' : text}</span>
    </button>
  )
}

// 轻量版图标按钮（用于嵌入列表/卡片）
export function AddAIIconButton({
  onClick,
  className = '',
}: {
  onClick?: () => void
  className?: string
}) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => onClick ? onClick() : navigate('/admin/ai/add')}
      className={`
        p-2 rounded-lg text-gray-500 hover:text-blue-600
        hover:bg-blue-50 active:bg-blue-100
        transition-all duration-200 ease-out
        active:scale-95 transform
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${className}
      `}
      title="添加AI配置"
      aria-label="添加AI配置"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 013 3v14a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z" />
        <path d="M12 8v4" />
        <path d="M9 11h6" />
        <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
        <path d="M4.22 10.22a2 2 0 010-2.828l2.828-2.828a2 2 0 012.828 0 2 2 0 010 2.828L7.05 10.22a2 2 0 01-2.828 0z" />
        <path d="M19.78 10.22a2 2 0 010-2.828l-2.828-2.828a2 2 0 01-2.828 0 2 2 0 010 2.828l2.828 2.828a2 2 0 012.828 0z" />
      </svg>
    </button>
  )
}

// 带下拉菜单的变体（预留扩展）
export function AddAIDropdownButton({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}: Omit<AddAIButtonProps, 'onClick' | 'text'>) {
  // 这个组件可以扩展为带下拉菜单的按钮
  // 例如：快速选择 AI 服务商类型
  return (
    <div className={`relative inline-flex ${className}`}>
      <AddAIButton
        variant={variant}
        size={size}
        disabled={disabled}
        loading={loading}
        text="添加AI"
      />
    </div>
  )
}
