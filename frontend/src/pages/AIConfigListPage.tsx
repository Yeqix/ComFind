import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { listAIConfigs, deleteAIConfig, type AIConfig } from '../services/api'
import AddAIButton from '../components/AddAIButton'

export default function AIConfigListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [configs, setConfigs] = useState<AIConfig[]>([])
  
  // 获取返回路径
  const fromPath = (location.state as { from?: string })?.from
  const handleBack = () => {
    if (fromPath) {
      navigate(fromPath)
    } else {
      navigate(-1)
    }
  }
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const data = await listAIConfigs()
      setConfigs(data)
    } catch (err) {
      console.error('加载AI配置失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (config: AIConfig) => {
    navigate(`/admin/ai/edit/${config.id}`)
  }

  const handleDelete = async (config: AIConfig) => {
    if (!confirm(`确定要删除 "${config.name}" 吗？`)) return

    try {
      setDeleteLoading(config.id)
      await deleteAIConfig(config.id)
      setConfigs(prev => prev.filter(c => c.id !== config.id))
    } catch (err) {
      alert('删除失败，请重试')
    } finally {
      setDeleteLoading(null)
    }
  }

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      azure: 'Azure',
      gemini: 'Gemini',
      custom: '自定义',
    }
    return labels[provider] || provider
  }

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      openai: 'bg-green-100 text-green-800',
      anthropic: 'bg-orange-100 text-orange-800',
      azure: 'bg-blue-100 text-blue-800',
      gemini: 'bg-purple-100 text-purple-800',
      custom: 'bg-gray-100 text-gray-800',
    }
    return colors[provider] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI配置管理</h2>
          <p className="mt-1 text-sm text-gray-500">管理AI服务接入配置，用于智能公式识别等功能</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors text-sm"
          >
            返回
          </button>
          <AddAIButton variant="primary" size="md" />
        </div>
      </div>

      {/* 配置列表 */}
      {loading ? (
        <div className="text-center py-12">
          <svg className="animate-spin w-8 h-8 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
          <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2a3 3 0 013 3v14a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 11h6" />
            <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <p className="mt-4 text-gray-500">暂无AI配置</p>
          <p className="mt-2 text-sm text-gray-400">点击下方按钮添加您的第一个AI配置</p>
          <div className="mt-6">
            <AddAIButton variant="primary" size="md" />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    配置信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    服务商
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    模型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configs.map(config => (
                  <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{config.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{config.api_key_masked}</div>
                          {config.remark && (
                            <div className="text-xs text-gray-400 mt-1 line-clamp-1">{config.remark}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProviderColor(config.provider)}`}>
                        {getProviderLabel(config.provider)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 font-mono">{config.model}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          config.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {config.enabled ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(config)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(config)}
                          disabled={deleteLoading === config.id}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="删除"
                        >
                          {deleteLoading === config.id ? (
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 底部添加按钮 */}
      {configs.length > 0 && (
        <div className="flex justify-center pt-4">
          <AddAIButton variant="secondary" size="sm" icon text="继续添加AI配置" />
        </div>
      )}
    </div>
  )
}
