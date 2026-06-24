import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import FormulaInput from '../components/FormulaInput'
import FormulaPreview from '../components/FormulaPreview'
import ResultCard from '../components/ResultCard'
import {
  addFavorite,
  aiEnhancedSearch,
  clearSearchHistory,
  listFavorites,
  listSearchHistory,
  removeFavorite,
  type AISearchResponse,
  type AISearchResult,
  type SearchFilters,
  type SearchHistoryItem,
} from '../services/api'

const STRUCTURE_OPTIONS = [
  { value: '', label: '全部结构' },
  { value: '求和结构', label: '求和结构' },
  { value: '递推关系', label: '递推关系' },
  { value: '生成函数', label: '生成函数' },
  { value: '二项式系数', label: '二项式系数' },
]

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [formula, setFormula] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<AISearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchInfo, setSearchInfo] = useState<AISearchResponse | null>(null)
  const [useAI, setUseAI] = useState(true)
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<SearchFilters>({
    review_status: 'approved',
    category: '',
    tags: [],
    difficulty: '',
    source: '',
    structure: '',
  })
  const [tagInput, setTagInput] = useState('')

  const normalizedFilters = useMemo<SearchFilters>(() => {
    return {
      review_status: filters.review_status || undefined,
      category: filters.category || undefined,
      tags: tagInput.split(',').map((tag) => tag.trim()).filter(Boolean),
      difficulty: filters.difficulty || undefined,
      source: filters.source || undefined,
      structure: filters.structure || undefined,
    }
  }, [filters, tagInput])

  useEffect(() => {
    refreshSideData()
  }, [])

  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      setFormula(query)
      performSearch(query)
    }
  }, [searchParams, useAI, normalizedFilters])

  const refreshSideData = async () => {
    try {
      const [historyData, favoriteData] = await Promise.all([
        listSearchHistory(12),
        listFavorites(),
      ])
      setHistory(historyData)
      setFavoriteIds(new Set(favoriteData.formulas.map((item) => item.id)))
    } catch {
      // Side data should not block searching.
    }
  }

  const performSearch = async (query: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await aiEnhancedSearch(query, useAI, 10, undefined, normalizedFilters)
      setResults(data.results)
      setSearchInfo(data)
      await refreshSideData()
    } catch {
      setError('搜索失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (formula.trim()) {
      navigate(`/search?q=${encodeURIComponent(formula)}`)
    }
  }

  const handleToggleFavorite = async (formulaId: string) => {
    const next = new Set(favoriteIds)
    try {
      if (next.has(formulaId)) {
        await removeFavorite(formulaId)
        next.delete(formulaId)
      } else {
        await addFavorite(formulaId)
        next.add(formulaId)
      }
      setFavoriteIds(next)
      await refreshSideData()
    } catch {
      setError('收藏状态更新失败。')
    }
  }

  const handleClearHistory = async () => {
    await clearSearchHistory()
    setHistory([])
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main>
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <FormulaInput
              value={formula}
              onChange={setFormula}
              placeholder="请输入 LaTeX 公式..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleSearch} className="btn-primary">
                搜索
              </button>
              <button onClick={() => navigate('/')} className="btn-secondary">
                返回
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                value={filters.category || ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="分类"
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="标签，用逗号分隔"
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={filters.structure || ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, structure: event.target.value }))}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {STRUCTURE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <select
                value={filters.difficulty || ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, difficulty: event.target.value }))}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">全部难度</option>
                <option value="基础">基础</option>
                <option value="中等">中等</option>
                <option value="较难">较难</option>
              </select>
              <input
                value={filters.source || ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
                placeholder="来源"
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={filters.review_status || ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, review_status: event.target.value }))}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="approved">已通过</option>
                <option value="pending">待审核</option>
                <option value="rejected">已驳回</option>
                <option value="">全部状态</option>
              </select>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(event) => setUseAI(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{useAI ? 'AI 增强' : '传统检索'}</span>
              </label>
              {searchInfo && (
                <span className={`rounded px-2 py-1 text-xs ${
                  searchInfo.ai_enhanced ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {searchInfo.ai_enhanced ? `已重排 · ${searchInfo.type_info}` : '传统模式'}
                </span>
              )}
            </div>
          </div>

          {formula && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-2 text-sm text-gray-500">当前查询</p>
              <FormulaPreview formula={formula} />
            </div>
          )}

          {loading && (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              <p className="mt-2 text-gray-600">正在搜索相似公式...</p>
            </div>
          )}

          {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>}

          {!loading && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">找到 {results.length} 条公式</h2>
                {searchInfo?.ai_enhanced && (
                  <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-600">AI 重排</span>
                )}
              </div>
              {results.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  isFavorite={favoriteIds.has(result.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}

          {!loading && !error && results.length === 0 && formula && (
            <div className="py-8 text-center text-gray-500">未找到相似公式。</div>
          )}
        </main>

        <aside className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">历史记录</h3>
              {history.length > 0 && (
                <button onClick={handleClearHistory} className="text-xs text-gray-500 hover:text-gray-800">
                  清空
                </button>
              )}
            </div>
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">暂无历史记录。</p>
              ) : history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(item.input_formula)}`)}
                  className="block w-full rounded border border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="block truncate font-mono text-gray-800">{item.input_formula}</span>
                  <span className="mt-1 block text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">收藏</h3>
            <p className="mt-2 text-sm text-gray-600">已收藏 {favoriteIds.size} 条公式</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
