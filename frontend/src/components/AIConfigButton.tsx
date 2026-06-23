import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Button from './Button'
import { checkAIStatus, type AIStatusResponse } from '../services/api'

interface AIConfigButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
  className?: string
  returnTo?: string // 配置完成后返回的路径，默认为上一页
}

export default function AIConfigButton({
  variant = 'primary',
  size = 'md',
  showStatus = true,
  className = '',
  returnTo,
}: AIConfigButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null)

  // 检查 AI 配置状态
  useEffect(() => {
    if (showStatus) {
      checkAIStatus()
        .then(status => setAiStatus(status))
        .catch(() => setAiStatus(null))
    }
  }, [showStatus])

  const handleClick = async () => {
    setLoading(true)
    
    // 确定返回路径：优先使用传入的returnTo，否则使用当前路径
    const backPath = returnTo || location.pathname
    
    // 可选：跳转前校验配置
    try {
      const status = await checkAIStatus()
      setAiStatus(status)
      
      if (status.available) {
        // AI 已配置，跳转到列表页，并传递返回路径
        navigate('/admin/ai', { state: { from: backPath } })
      } else {
        // AI 未配置，跳转到添加页，并传递返回路径
        navigate('/admin/ai/add', { state: { from: backPath } })
      }
    } catch (err) {
      // 出错也跳转到添加页
      navigate('/admin/ai/add', { state: { from: backPath } })
    } finally {
      setLoading(false)
    }
  }

  // 根据状态动态调整文案
  const getButtonText = () => {
    if (!showStatus || !aiStatus) {
      return '配置 AI'
    }
    if (aiStatus.available) {
      return `AI 已配置 (${aiStatus.configs_count})`
    }
    return '配置 AI'
  }

  // 根据状态调整图标
  const getIcon = () => {
    if (loading) return null // 显示 loading spinner
    
    if (aiStatus?.available) {
      // AI 已配置 - 显示机器人图标
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
    
    // 默认 - 显示闪电图标
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  }

  // 状态指示器
  const statusIndicator = showStatus && aiStatus && (
    <span
      className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
        aiStatus.available ? 'bg-green-500' : 'bg-yellow-500'
      }`}
      title={aiStatus.available ? 'AI 服务可用' : 'AI 未配置'}
    />
  )

  return (
    <div className={`relative inline-block ${className}`}>
      {statusIndicator}
      <Button
        variant={variant}
        size={size}
        loading={loading}
        icon={getIcon()}
        onClick={handleClick}
      >
        {getButtonText()}
      </Button>
    </div>
  )
}
