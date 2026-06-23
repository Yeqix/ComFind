import { useState, useEffect } from 'react'
import {
  checkAIStatus,
  batchExtractFormulas,
  createFormula,
  type AIStatusResponse,
  type BatchExtractedFormula,
} from '../services/api'
import FormulaPreview from './FormulaPreview'

interface BatchAddProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface ExtractedFormula extends BatchExtractedFormula {
  selected: boolean
  id: string
}

export default function BatchAdd({ onSuccess, onCancel }: BatchAddProps) {
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null)
  const [checkingAI, setCheckingAI] = useState(true)
  const [content, setContent] = useState('')
  const [inputFormat, setInputFormat] = useState<'auto' | 'markdown' | 'latex'>('auto')
  const [extracting, setExtracting] = useState(false)
  const [extractedFormulas, setExtractedFormulas] = useState<ExtractedFormula[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // 检查 AI 状态
  useEffect(() => {
    checkAIStatus()
      .then(status => {
        setAiStatus(status)
        setCheckingAI(false)
        if (!status.available) {
          setMessage({ type: 'error', text: 'AI 服务未配置，请先配置 AI 服务才能使用批量添加功能' })
        }
      })
      .catch(err => {
        console.error('Failed to check AI status:', err)
        setAiStatus({ available: false, configs_count: 0, has_env_key: false, message: '检查失败' })
        setCheckingAI(false)
        setMessage({ type: 'error', text: '无法检查 AI 服务状态' })
      })
  }, [])

  // 提取公式
  const handleExtract = async () => {
    if (!content.trim()) {
      setMessage({ type: 'error', text: '请输入文档内容' })
      return
    }

    setExtracting(true)
    setMessage(null)
    setExtractedFormulas([])

    try {
      const result = await batchExtractFormulas(content, inputFormat)
      
      if (result.count === 0) {
        setMessage({ type: 'info', text: '未检测到公式，请检查文档格式' })
      } else {
        // 为每个公式生成唯一 ID 并默认选中高置信度的
        const formulas = result.formulas.map((f, idx) => ({
          ...f,
          id: `formula-${idx}`,
          selected: f.confidence >= 0.6,
        }))
        setExtractedFormulas(formulas)
        setMessage({ 
          type: 'success', 
          text: `成功提取 ${result.count} 个公式，高置信度(${formulas.filter(f => f.confidence >= 0.6).length}个)已默认选中` 
        })
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || '提取失败'
      setMessage({ type: 'error', text: `提取失败: ${errorMsg}` })
    } finally {
      setExtracting(false)
    }
  }

  // 切换选择状态
  const toggleSelection = (id: string) => {
    setExtractedFormulas(prev => 
      prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f)
    )
  }

  // 全选/取消全选
  const selectAll = (selected: boolean) => {
    setExtractedFormulas(prev => 
      prev.map(f => ({ ...f, selected }))
    )
  }

  // 导入选中的公式
  const handleImport = async () => {
    const selected = extractedFormulas.filter(f => f.selected)
    if (selected.length === 0) {
      setMessage({ type: 'error', text: '请至少选择一个公式' })
      return
    }

    setImporting(true)
    setImportProgress({ current: 0, total: selected.length })
    setMessage(null)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < selected.length; i++) {
      const formula = selected[i]
      setImportProgress({ current: i + 1, total: selected.length })

      try {
        await createFormula({
          title: formula.title || `公式 ${i + 1}`,
          latex: formula.latex,
          category: formula.category,
          tags: formula.tags,
          description: formula.description || `从文档中提取的公式。上下文: ${formula.context.slice(0, 100)}`,
          conditions: formula.conditions,
          references: formula.references,
        })
        successCount++
      } catch (err) {
        console.error(`Failed to import formula ${formula.id}:`, err)
        errorCount++
      }
    }

    setImporting(false)
    
    if (errorCount === 0) {
      setMessage({ type: 'success', text: `成功导入 ${successCount} 个公式！` })
      setTimeout(() => {
        onSuccess?.()
      }, 1500)
    } else {
      setMessage({ 
        type: errorCount === selected.length ? 'error' : 'info', 
        text: `导入完成: ${successCount} 个成功，${errorCount} 个失败` 
      })
    }
  }

  // 如果没有 AI 服务，显示不可用状态
  if (!aiStatus?.available) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">批量添加公式</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">使用 AI 从文档中自动提取公式</p>
        </div>

        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {checkingAI ? '检查 AI 服务状态...' : 'AI 服务未配置'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-4">
            批量添加功能需要配置 AI 服务才能使用。请先添加 AI 配置。
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              返回
            </button>
            <a
              href="/admin/ai/add"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              配置 AI 服务
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900">批量添加公式</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">粘贴 Markdown 或 LaTeX 文档，AI 将自动提取其中的数学公式</p>
      </div>

      <div className="p-6 space-y-6">
        {/* AI 状态提示 */}
        {aiStatus && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-700">
              AI 服务可用 ({aiStatus.configs_count} 个配置{aiStatus.has_env_key ? ' + 环境变量' : ''})
            </span>
          </div>
        )}

        {/* 输入格式选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">文档格式</label>
          <div className="flex gap-2">
            {[
              { value: 'auto', label: '自动检测' },
              { value: 'markdown', label: 'Markdown' },
              { value: 'latex', label: 'LaTeX' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setInputFormat(option.value as typeof inputFormat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputFormat === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 文档输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            文档内容
            <span className="text-gray-400 font-normal ml-1">(支持 $...$、$$...$$、\[...\]、\(...\) 格式)</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在这里粘贴包含数学公式的文档...&#10;&#10;例如：&#10;二项式定理是一个重要的组合数学公式：&#10;$$ \\sum_{k=0}^{n} \\binom{n}{k} = 2^n $$&#10;它表示 n 元集合的所有子集个数。"
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>字数: {content.length}</span>
            <span>支持 Markdown 和 LaTeX 格式</span>
          </div>
        </div>

        {/* 提取按钮 */}
        <button
          onClick={handleExtract}
          disabled={extracting || !content.trim()}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {extracting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              AI 分析中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              提取公式
            </>
          )}
        </button>

        {/* 消息提示 */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 提取结果 */}
        {extractedFormulas.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                提取结果 ({extractedFormulas.filter(f => f.selected).length}/{extractedFormulas.length} 已选)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => selectAll(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  全选
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => selectAll(false)}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  取消全选
                </button>
              </div>
            </div>

            {/* 公式列表 */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {extractedFormulas.map((formula) => (
                <div
                  key={formula.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    formula.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formula.selected}
                      onChange={() => toggleSelection(formula.id)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {formula.category}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            formula.confidence >= 0.7
                              ? 'bg-green-100 text-green-700'
                              : formula.confidence >= 0.5
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          置信度 {(formula.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {formula.type === 'display' ? '行间公式' : '行内公式'}
                        </span>
                      </div>

                      {/* 公式预览 */}
                      <div className="bg-white rounded border border-gray-200 p-3 mb-2">
                        <FormulaPreview formula={formula.latex} />
                      </div>

                      {/* 公式元数据 */}
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">标题:</span> {formula.title || '未识别'}</p>
                        {formula.description && (
                          <p><span className="font-medium">描述:</span> {formula.description}</p>
                        )}
                        {formula.tags.length > 0 && (
                          <p>
                            <span className="font-medium">标签:</span>{' '}
                            {formula.tags.map(tag => (
                              <span key={tag} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs mr-1">
                                {tag}
                              </span>
                            ))}
                          </p>
                        )}
                        {formula.context && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            <span className="font-medium">上下文:</span> {formula.context}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 导入按钮 */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={importing || extractedFormulas.filter(f => f.selected).length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    导入中... {importProgress.current}/{importProgress.total}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    导入选中的 {extractedFormulas.filter(f => f.selected).length} 个公式
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 空状态时显示取消按钮 */}
        {extractedFormulas.length === 0 && (
          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
