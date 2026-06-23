import { useState } from 'react'
import FormulaPreview from './FormulaPreview'

interface QueryPanelProps {
  onSearch: (formula: string) => void
  loading?: boolean
}

// 示例公式分类
const EXAMPLE_CATEGORIES = [
  {
    name: '二项式恒等式',
    examples: [
      { latex: '\\sum_{k=0}^{n} \\binom{n}{k} = 2^n', name: '二项式求和' },
      { latex: '\\sum_{k=0}^{n} (-1)^k \\binom{n}{k} = 0', name: '交错二项式' },
      { latex: '\\binom{n}{k} = \\binom{n}{n-k}', name: '对称性' },
      { latex: '\\sum_{k=0}^{r} \\binom{m}{k}\\binom{n}{r-k} = \\binom{m+n}{r}', name: '范德蒙德卷积' },
    ]
  },
  {
    name: 'Catalan 数',
    examples: [
      { latex: 'C_n = \\frac{1}{n+1}\\binom{2n}{n}', name: '闭式表达式' },
      { latex: 'C_{n+1} = \\sum_{i=0}^{n} C_i C_{n-i}', name: '递推关系' },
      { latex: 'C_n = \\binom{2n}{n} - \\binom{2n}{n+1}', name: '组合差形式' },
    ]
  },
  {
    name: 'Stirling 数',
    examples: [
      { latex: 'S(n,k) = \\frac{1}{k!}\\sum_{j=0}^{k}(-1)^{k-j}\\binom{k}{j}j^n', name: '第二类显式' },
      { latex: 's(n,k) = (-1)^{n-k} |s(n,k)|', name: '第一类符号' },
      { latex: '\\sum_{k=0}^{n} S(n,k) = B_n', name: 'Bell数关系' },
    ]
  },
  {
    name: '生成函数',
    examples: [
      { latex: '\\sum_{n=0}^{\\infty} C_n x^n = \\frac{1 - \\sqrt{1-4x}}{2x}', name: 'Catalan GF' },
      { latex: '\\sum_{n=0}^{\\infty} \\binom{2n}{n} x^n = \\frac{1}{\\sqrt{1-4x}}', name: '中心二项式GF' },
      { latex: '\\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = e^x', name: '指数GF' },
    ]
  },
]

export default function QueryPanel({ onSearch, loading }: QueryPanelProps) {
  const [formula, setFormula] = useState('')
  const [showExamples, setShowExamples] = useState(false)
  const [activeCategory, setActiveCategory] = useState(0)

  const handleSubmit = () => {
    if (formula.trim()) {
      onSearch(formula)
    }
  }

  const handleExampleClick = (latex: string) => {
    setFormula(latex)
    setShowExamples(false)
  }

  return (
    <div className="w-full max-w-3xl">
      {/* 输入区域 */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            输入 LaTeX 公式
          </label>
          <textarea
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="例如: \\sum_{k=0}^{n} \\binom{n}{k} = 2^n"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm min-h-[100px] resize-y focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
          />

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSubmit}
              disabled={!formula.trim() || loading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  检索中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  检查并检索
                </>
              )}
            </button>
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
            >
              {showExamples ? '隐藏示例' : '查看示例'}
            </button>
          </div>
        </div>

        {/* 预览区域 */}
        {formula && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <p className="text-sm text-gray-500 mb-2">公式预览:</p>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <FormulaPreview formula={formula} />
            </div>
          </div>
        )}
      </div>

      {/* 示例面板 */}
      {showExamples && (
        <div className="mt-4 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800">常用公式示例</h3>
            <p className="text-sm text-gray-500">点击示例快速填入</p>
          </div>

          {/* 分类标签 */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {EXAMPLE_CATEGORIES.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCategory(idx)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === idx
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* 示例列表 */}
          <div className="p-4">
            <div className="grid gap-3">
              {EXAMPLE_CATEGORIES[activeCategory].examples.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExampleClick(ex.latex)}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all text-left"
                >
                  <span className="text-sm font-medium text-gray-700 min-w-[80px]">{ex.name}</span>
                  <code className="flex-1 text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1.5 rounded">
                    {ex.latex}
                  </code>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
