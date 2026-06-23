import { useNavigate } from 'react-router-dom'

type ButtonVariant = 'primary' | 'secondary' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'
type ButtonStyle = 'default' | 'icon'

interface EditFormulaButtonProps {
  formulaId: string
  formula?: {
    id: string
    title: string
    latex: string
    category: string
    tags: string[]
    description?: string
    conditions?: string
    references: string[]
  }
  variant?: ButtonVariant
  size?: ButtonSize
  style?: ButtonStyle
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  to?: string
  className?: string
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2 text-xs gap-1',
  md: 'h-8 px-3 text-sm gap-1.5',
  lg: 'h-9 px-4 text-sm gap-2',
}

const iconOnlySizes: Record<ButtonSize, string> = {
  sm: 'w-7 h-7',
  md: 'w-8 h-8',
  lg: 'w-9 h-9',
}

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-4 h-4',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm',
  secondary: 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300',
  danger: 'bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300',
}

export default function EditFormulaButton({
  formulaId,
  formula,
  variant = 'secondary',
  size = 'sm',
  style = 'default',
  loading = false,
  disabled = false,
  onClick,
  to,
  className = '',
}: EditFormulaButtonProps) {
  const navigate = useNavigate()

  const handleClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (loading || disabled) return

    if (onClick) {
      onClick()
    } else {
      // 携带公式数据跳转，方便编辑页面预填充
      navigate(to || '/admin', {
        state: {
          editFormulaId: formulaId,
          editFormula: formula,
          activeTab: 'edit',
        },
      })
    }
  }

  // 编辑图标
  const EditIcon = () => (
    <svg
      className={`${iconSizes[size]} ${loading ? 'animate-spin' : ''} flex-shrink-0`}
      fill="none"
      viewBox="0 0 24 24"
    >
      {loading ? (
        <>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </>
      ) : (
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      )}
    </svg>
  )

  // 轻量图标按钮样式
  if (style === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        title="修改公式"
        className={`
          ${iconOnlySizes[size]}
          rounded-lg
          flex items-center justify-center
          text-gray-400 hover:text-gray-600 hover:bg-gray-100
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent
          transition-all duration-150 ease-out
          ${className}
        `}
      >
        <EditIcon />
      </button>
    )
  }

  // 默认按钮样式
  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        rounded-lg font-medium
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        transition-all duration-150 ease-out
        ${className}
      `}
    >
      <EditIcon />
      <span className="whitespace-nowrap">{loading ? '加载中...' : '修改'}</span>
    </button>
  )
}

// 轻量图标按钮快捷导出
export function EditFormulaIconButton(props: Omit<EditFormulaButtonProps, 'style'>) {
  return <EditFormulaButton {...props} style="icon" />
}
