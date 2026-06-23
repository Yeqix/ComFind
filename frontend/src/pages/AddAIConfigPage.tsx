import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { createAIConfig, updateAIConfig, getAIConfig, testAIConfig, type AIProvider, type AIConfigFormData } from '../services/api'

const PROVIDERS: { value: AIProvider; label: string; models: string[] }[] = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
  { value: 'azure', label: 'Azure OpenAI', models: ['gpt-4', 'gpt-35-turbo'] },
  { value: 'gemini', label: 'Google Gemini', models: ['gemini-pro', 'gemini-ultra'] },
  { value: 'custom', label: '自定义', models: [] },
]

export default function AddAIConfigPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams() // 用于编辑模式
  const isEditMode = Boolean(id)
  
  // 获取返回路径：从state中获取，或使用浏览器返回
  const fromPath = (location.state as { from?: string })?.from
  const handleBack = () => {
    if (fromPath) {
      navigate(fromPath)
    } else {
      navigate(-1) // 浏览器返回
    }
  }

  const [formData, setFormData] = useState<AIConfigFormData>({
    name: '',
    provider: 'openai',
    api_key: '',
    api_url: '',
    model: 'gpt-4',
    remark: '',
    enabled: true,
  })

  const [originalApiKey, setOriginalApiKey] = useState('') // 用于编辑时保留原key
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof AIConfigFormData, string>>>({})

  // 如果是编辑模式，加载现有配置
  useEffect(() => {
    if (id) {
      loadAIConfig(id)
    }
  }, [id])

  const loadAIConfig = async (configId: string) => {
    try {
      const config = await getAIConfig(configId)
      setFormData({
        name: config.name,
        provider: config.provider,
        api_key: '', // 编辑时API Key为空，只有填写时才更新
        api_url: config.api_url || '',
        model: config.model,
        remark: config.remark || '',
        enabled: config.enabled,
      })
      setOriginalApiKey(config.api_key_masked)
    } catch (err) {
      setMessage({ type: 'error', text: '加载配置失败' })
    }
  }

  const handleChange = (field: keyof AIConfigFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AIConfigFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入AI名称'
    }

    if (!formData.api_key.trim() && !isEditMode) {
      newErrors.api_key = '请输入API Key'
    }

    if (!formData.model.trim()) {
      newErrors.model = '请输入模型名称'
    }

    // 自定义服务商必须填写API地址
    if (formData.provider === 'custom' && !formData.api_url.trim()) {
      newErrors.api_url = '自定义服务商需要填写API地址'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    setMessage(null)

    try {
      if (isEditMode && id) {
        // 编辑模式：只更新有值的字段
        const updateData: Partial<AIConfigFormData> = {}
        if (formData.name) updateData.name = formData.name
        if (formData.api_key) updateData.api_key = formData.api_key
        if (formData.api_url !== undefined) updateData.api_url = formData.api_url
        if (formData.model) updateData.model = formData.model
        if (formData.remark !== undefined) updateData.remark = formData.remark
        updateData.enabled = formData.enabled

        await updateAIConfig(id, updateData)
        setMessage({ type: 'success', text: 'AI配置更新成功！' })
      } else {
        // 新增模式
        console.log('=== 提交数据 ===')
        console.log('formData:', formData)
        console.log('JSON payload:', JSON.stringify(formData, null, 2))
        
        const result = await createAIConfig(formData)
        console.log('=== 响应数据 ===')
        console.log('result:', result)
        
        setMessage({ type: 'success', text: 'AI配置添加成功！' })
        // 可选：延迟后跳转
        setTimeout(() => navigate('/admin'), 1500)
      }
    } catch (err: any) {
      console.error('=== 错误详情 ===')
      console.error('Error object:', err)
      console.error('Error response:', err.response)
      console.error('Error data:', err.response?.data)
      console.error('Error status:', err.response?.status)
      
      const errorMsg = err.response?.data?.detail || err.message || '未知错误'
      setMessage({ type: 'error', text: `添加失败: ${errorMsg}` })
    } finally {
      setSubmitting(false)
    }
  }

  const handleTest = async () => {
    if (!id) {
      setTestResult({ success: false, message: '请先保存配置' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const result = await testAIConfig(id)
      setTestResult({ success: result.success, message: result.message })
    } catch (err) {
      setTestResult({ success: false, message: '测试连接失败' })
    } finally {
      setTesting(false)
    }
  }

  const currentProvider = PROVIDERS.find(p => p.value === formData.provider)
  const suggestedModels = currentProvider?.models || []

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? '编辑AI配置' : '添加AI配置'}
          </h1>
          <p className="mt-2 text-gray-600">
            {isEditMode ? '修改现有AI服务配置信息' : '配置新的AI服务接入信息，用于智能公式识别'}
          </p>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* 基础信息 */}
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">基础信息</h2>

            {/* AI名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI名称/别名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="例如：OpenAI GPT-4"
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                } focus:outline-none focus:ring-2`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              <p className="mt-1 text-xs text-gray-500">给这个AI配置起一个易识别的名称</p>
            </div>

            {/* 服务商类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                服务商类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.provider}
                onChange={e => {
                  const provider = e.target.value as AIProvider
                  handleChange('provider', provider)
                  // 自动切换到该服务商的默认模型
                  const p = PROVIDERS.find(p => p.value === provider)
                  if (p && p.models.length > 0) {
                    handleChange('model', p.models[0])
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={e => handleChange('enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">
                启用此AI配置
              </label>
            </div>
          </div>

          {/* API配置 */}
          <div className="p-6 space-y-6 border-t border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">API配置</h2>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key {isEditMode ? '' : <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={formData.api_key}
                onChange={e => handleChange('api_key', e.target.value)}
                placeholder={isEditMode ? `当前: ${originalApiKey} (留空则不修改)` : 'sk-...'}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.api_key ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                } focus:outline-none focus:ring-2 font-mono text-sm`}
              />
              {errors.api_key && <p className="mt-1 text-sm text-red-500">{errors.api_key}</p>}
              <p className="mt-1 text-xs text-gray-500">
                {isEditMode ? '如需修改API Key请重新填写，否则留空' : '您的API密钥将被安全存储'}
              </p>
            </div>

            {/* API地址（可选） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API地址 {formData.provider === 'custom' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="url"
                value={formData.api_url}
                onChange={e => handleChange('api_url', e.target.value)}
                placeholder={
                  formData.provider === 'custom'
                    ? 'https://api.example.com/v1'
                    : '留空使用默认地址（推荐）'
                }
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.api_url ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                } focus:outline-none focus:ring-2`}
              />
              {errors.api_url && <p className="mt-1 text-sm text-red-500">{errors.api_url}</p>}
              <p className="mt-1 text-xs text-gray-500">
                {formData.provider === 'custom'
                  ? '自定义服务商必须提供API地址'
                  : '仅在使用代理或自定义端点时需要填写'}
              </p>
            </div>

            {/* 模型名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模型名称 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.model}
                  onChange={e => handleChange('model', e.target.value)}
                  placeholder="gpt-4"
                  list="suggested-models"
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    errors.model ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  } focus:outline-none focus:ring-2`}
                />
              </div>
              <datalist id="suggested-models">
                {suggestedModels.map(model => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model}</p>}
              <p className="mt-1 text-xs text-gray-500">
                常用模型：{suggestedModels.join('、') || '请根据服务商文档填写'}
              </p>
            </div>
          </div>

          {/* 备注 */}
          <div className="p-6 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={formData.remark}
              onChange={e => handleChange('remark', e.target.value)}
              placeholder="添加关于此AI配置的说明..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 测试连接（仅编辑模式） */}
          {isEditMode && (
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">连接测试</h3>
                  <p className="text-xs text-gray-500 mt-1">验证AI服务是否可正常连接</p>
                </div>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {testing ? '测试中...' : '测试连接'}
                </button>
              </div>
              {testResult && (
                <div
                  className={`mt-3 p-3 rounded-lg text-sm ${
                    testResult.success
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {testResult.message}
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              返回
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitting ? (isEditMode ? '保存中...' : '添加中...') : (isEditMode ? '保存修改' : '添加配置')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
