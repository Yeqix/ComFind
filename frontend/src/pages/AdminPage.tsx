import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AddFormula from '../components/AddFormula'
import ChangeFormula from '../components/ChangeFormula'
import FormulaPreview from '../components/FormulaPreview'
import AIConfigListPage from './AIConfigListPage'
import OperationsPanel from './OperationsPanel'
import BatchAdd from '../components/BatchAdd'
import { reviewFormula } from '../services/api'
import type { Formula } from '../services/api'

export default function AdminPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<'add' | 'list' | 'edit' | 'ai' | 'batch' | 'ops'>('add')
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    formulas.forEach((formula) => {
      counts.set(formula.category, (counts.get(formula.category) || 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [formulas])

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    formulas.forEach((formula) => {
      formula.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40)
  }, [formulas])

  const filteredFormulas = useMemo(() => {
    return formulas.filter((formula) => {
      const categoryMatched = !selectedCategory || formula.category === selectedCategory
      const tagMatched = !selectedTag || formula.tags.includes(selectedTag)
      return categoryMatched && tagMatched
    })
  }, [formulas, selectedCategory, selectedTag])

  const handleReview = async (formulaId: string, reviewStatus: 'approved' | 'rejected') => {
    const updated = await reviewFormula(formulaId, reviewStatus)
    setFormulas((items) => items.map((item) => (item.id === formulaId ? updated : item)))
  }

  // 加载公式列表
  const loadFormulas = async () => {
    setLoading(true)
    setError('')
    try {
      // 从后端获取公式列表
      const response = await fetch('/api/admin/formulas')
      console.log('Formula list response:', response.status, response.statusText)
      if (response.ok) {
        const data = await response.json()
        console.log('Formula data:', data)
        setFormulas(data)
      } else {
        const errorText = await response.text()
        console.error('Failed to load formulas:', response.status, errorText)
        throw new Error(`加载失败: ${response.status} ${errorText}`)
      }
    } catch (err: any) {
      console.error('Error loading formulas:', err)
      setError(`加载公式列表失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'list') {
      loadFormulas()
    }
  }, [activeTab])

  // 处理从其他页面跳转来的编辑请求
  useEffect(() => {
    const state = location.state as {
      editFormulaId?: string
      editFormula?: Formula
      activeTab?: 'add' | 'list' | 'edit' | 'ai' | 'batch' | 'ops'
    } | null

    if (state?.editFormulaId && state?.editFormula) {
      setEditingFormula(state.editFormula)
      setActiveTab('edit')
      // 清除导航状态，避免刷新页面时重复处理
      navigate(location.pathname, { replace: true, state: {} })
    } else if (state?.activeTab) {
      setActiveTab(state.activeTab)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">公式管理后台</h1>
              <span className="text-sm text-gray-500">管理组合数学公式库</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              返回首页
            </button>
          </div>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'add'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              录入新公式
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              公式列表
              {formulas.length > 0 && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {formulas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'ai'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI配置
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'batch'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              批量添加
            </button>
            <button
              onClick={() => setActiveTab('ops')}
              className={`flex items-center gap-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'ops'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 15l3-3 3 2 5-7" />
              </svg>
              运行监控
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'add' && (
          <div className="max-w-3xl mx-auto">
            <AddFormula
              onSuccess={() => {
                // 可以切换到列表页或显示成功消息
                setTimeout(() => setActiveTab('list'), 500)
              }}
            />
          </div>
        )}

        {activeTab === 'edit' && editingFormula && (
          <div className="max-w-3xl mx-auto">
            <ChangeFormula
              formula={editingFormula}
              onSuccess={() => {
                // 保存成功后返回列表页并刷新数据
                setEditingFormula(null)
                setActiveTab('list')
                loadFormulas()
              }}
              onCancel={() => {
                setEditingFormula(null)
                setActiveTab('list')
              }}
            />
          </div>
        )}

        {activeTab === 'list' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="ml-3 text-gray-600">加载中...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
                <button
                  onClick={loadFormulas}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                >
                  重试
                </button>
              </div>
            ) : formulas.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无公式</h3>
                <p className="text-gray-500 mb-4">知识库中还没有公式，开始添加第一个吧！</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  添加公式
                </button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="h-fit rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">筛选</h3>
                    {(selectedCategory || selectedTag) && (
                      <button
                        onClick={() => {
                          setSelectedCategory('')
                          setSelectedTag('')
                        }}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        清空
                      </button>
                    )}
                  </div>

                  <div className="mb-5">
                    <p className="mb-2 text-xs font-medium text-gray-500">分类</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedCategory('')}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          selectedCategory === ''
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>全部分类</span>
                        <span className="text-xs text-gray-400">{formulas.length}</span>
                      </button>
                      {categoryCounts.map(([category, count]) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            selectedCategory === category
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate">{category}</span>
                          <span className="ml-2 text-xs text-gray-400">{count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium text-gray-500">标签</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedTag('')}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          selectedTag === ''
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>全部标签</span>
                        <span className="text-xs text-gray-400">{tagCounts.length}</span>
                      </button>
                      {tagCounts.map(([tag, count]) => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            selectedTag === tag
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate">{tag}</span>
                          <span className="ml-2 text-xs text-gray-400">{count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                    <span>
                      当前显示 {filteredFormulas.length} / {formulas.length} 条公式
                    </span>
                    {(selectedCategory || selectedTag) && (
                      <span className="text-xs text-gray-500">
                        {selectedCategory && `分类：${selectedCategory}`}
                        {selectedCategory && selectedTag && ' · '}
                        {selectedTag && `标签：${selectedTag}`}
                      </span>
                    )}
                  </div>

                  {filteredFormulas.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
                      当前筛选条件下暂无公式
                    </div>
                  ) : (
                    filteredFormulas.map((formula) => (
                      <div
                        key={formula.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {formula.title}
                              </h3>
                          <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full whitespace-nowrap">
                            {formula.category}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                              formula.review_status === 'pending'
                                ? 'bg-yellow-50 text-yellow-700'
                                : formula.review_status === 'rejected'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {formula.review_status === 'pending'
                              ? '待审核'
                              : formula.review_status === 'rejected'
                                ? '已驳回'
                                : '已通过'}
                          </span>
                        </div>

                            {/* 公式预览 */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                              <FormulaPreview formula={formula.latex} />
                            </div>

                            {/* 标签 */}
                            {formula.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {formula.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* 描述 */}
                            {formula.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {formula.description}
                              </p>
                            )}

                            {/* 条件 */}
                            {formula.conditions && (
                              <p className="text-xs text-gray-500">
                                条件: {formula.conditions}
                              </p>
                            )}
                          </div>

                          {/* ID 标识和操作按钮 */}
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xs text-gray-400 font-mono">
                              #{formula.id}
                            </div>
                            <button
                              onClick={() => {
                                setEditingFormula(formula)
                                setActiveTab('edit')
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              编辑
                            </button>
                            {formula.review_status === 'pending' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleReview(formula.id, 'approved')}
                                  className="px-2 py-1 text-xs text-green-700 hover:bg-green-50 rounded transition-colors"
                                >
                                  通过
                                </button>
                                <button
                                  onClick={() => handleReview(formula.id, 'rejected')}
                                  className="px-2 py-1 text-xs text-red-700 hover:bg-red-50 rounded transition-colors"
                                >
                                  驳回
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && <AIConfigListPage />}

        {activeTab === 'batch' && (
          <div className="max-w-4xl mx-auto">
            <BatchAdd
              onSuccess={() => {
                setActiveTab('list')
                loadFormulas()
              }}
              onCancel={() => setActiveTab('add')}
            />
          </div>
        )}

        {activeTab === 'ops' && <OperationsPanel />}
      </div>
    </div>
  )
}
