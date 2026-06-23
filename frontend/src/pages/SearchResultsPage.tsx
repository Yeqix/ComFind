import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import FormulaInput from '../components/FormulaInput'
import FormulaPreview from '../components/FormulaPreview'
import ResultCard from '../components/ResultCard'
import { aiEnhancedSearch, type AISearchResult, type AISearchResponse } from '../services/api'

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [formula, setFormula] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<AISearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchInfo, setSearchInfo] = useState<AISearchResponse | null>(null)
  const [useAI, setUseAI] = useState(true)

  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      setFormula(query)
      performSearch(query)
    }
  }, [searchParams, useAI])

  const performSearch = async (query: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await aiEnhancedSearch(query, useAI)
      setResults(data.results)
      setSearchInfo(data)
    } catch (err) {
      setError('搜索失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (formula.trim()) {
      navigate(`/search?q=${encodeURIComponent(formula)}`)
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <FormulaInput 
            value={formula} 
            onChange={setFormula}
            placeholder="输入公式搜索..."
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSearch} className="btn-primary">
              重新搜索
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              返回首页
            </button>
          </div>
          
          {/* AI 搜索开关 */}
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {useAI ? '🤖 AI 增强搜索' : '🔍 传统搜索'}
              </span>
            </label>
            {searchInfo && (
              <span className={`text-xs px-2 py-1 rounded ${
                searchInfo.ai_enhanced 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {searchInfo.ai_enhanced 
                  ? `AI评分 · ${searchInfo.type_info}` 
                  : (searchInfo.ai_available ? '传统模式' : 'AI未配置')}
              </span>
            )}
          </div>
        </div>

        {formula && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-2">当前搜索:</p>
            <FormulaPreview formula={formula} />
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">正在搜索相似公式...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                找到 {results.length} 个相似公式
              </h2>
              {searchInfo?.ai_enhanced && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  🤖 AI 智能排序
                </span>
              )}
            </div>
            {results.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
          </div>
        )}

        {!loading && !error && results.length === 0 && formula && (
          <div className="text-center py-8 text-gray-500">
            未找到相似公式，请尝试其他输入
          </div>
        )}
      </div>
    </div>
  )
}
