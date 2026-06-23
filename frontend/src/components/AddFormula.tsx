import { useState } from 'react'
import FormulaPreview from './FormulaPreview'
import AddAutofill from './AddAutofill'
import { createFormula, parseFormula, type AutofillResponse } from '../services/api'

interface AddFormulaProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface FormData {
  title: string
  latex: string
  category: string
  tags: string
  description: string
  conditions: string
  references: string
}

interface ParsedInfo {
  normalized?: string
  type?: string
  variables?: string[]
  hints?: string[]
}

const CATEGORIES = [
  '二项式恒等式',
  '排列与组合计数',
  'Stirling 数',
  'Bell 数',
  'Catalan 相关',
  '分拆理论',
  '生成函数',
  '递推关系',
  '容斥原理',
  'q-组合',
  '概率组合公式',
  'Fibonacci 数',
  'Lucas 数',
  '其他',
]

export default function AddFormula({ onSuccess, onCancel }: AddFormulaProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    latex: '',
    category: '二项式恒等式',
    tags: '',
    description: '',
    conditions: '',
    references: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [parsedInfo, setParsedInfo] = useState<ParsedInfo | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [autofillApplied, setAutofillApplied] = useState(false)

  // 处理自动填充结果
  const handleAutofill = (data: AutofillResponse['data']) => {
    setFormData(prev => ({
      ...prev,
      title: data.title || prev.title,
      category: CATEGORIES.includes(data.category) ? data.category : prev.category,
      tags: data.tags.join(', ') || prev.tags,
      description: data.description || prev.description,
      conditions: data.conditions || prev.conditions,
      references: data.references.join('\n') || prev.references,
    }))
    setAutofillApplied(true)
    setMessage({ type: 'success', text: `AI 自动填充完成！置信度: ${(data.confidence * 100).toFixed(0)}%` })
  }

  // 实时解析公式
  const handleLatexChange = async (latex: string) => {
    setFormData(prev => ({ ...prev, latex }))
    
    if (latex.trim().length > 5) {
      setParsing(true)
      try {
        const result = await parseFormula(latex)
        if (result.success) {
          setParsedInfo({
            normalized: result.normalized,
            type: result.type,
            variables: result.variables,
            hints: result.hints,
          })
        }
      } catch {
        setParsedInfo(null)
      } finally {
        setParsing(false)
      }
    } else {
      setParsedInfo(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    // 基本验证
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: '请输入公式标题' })
      setSubmitting(false)
      return
    }

    if (!formData.latex.trim()) {
      setMessage({ type: 'error', text: '请输入 LaTeX 公式' })
      setSubmitting(false)
      return
    }

    try {
      await createFormula({
        title: formData.title.trim(),
        latex: formData.latex.trim(),
        category: formData.category,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        description: formData.description.trim() || undefined,
        conditions: formData.conditions.trim() || undefined,
        references: formData.references.split('\n').map(r => r.trim()).filter(Boolean),
      })

      setMessage({ type: 'success', text: '公式添加成功！' })
      
      // 重置表单
      setFormData({
        title: '',
        latex: '',
        category: '二项式恒等式',
        tags: '',
        description: '',
        conditions: '',
        references: '',
      })
      setParsedInfo(null)

      onSuccess?.()
    } catch (err) {
      setMessage({ type: 'error', text: '添加失败，请稍后重试' })
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">录入新公式</h2>
            <p className="text-sm text-gray-500 mt-1">将组合数学公式添加到知识库</p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`px-6 py-3 ${message.type === 'success' ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            公式标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="例如：二项式求和公式"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          />
        </div>

        {/* LaTeX 公式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            LaTeX 公式 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              value={formData.latex}
              onChange={(e) => handleLatexChange(e.target.value)}
              placeholder="例如：\sum_{k=0}^{n} \binom{n}{k} = 2^n"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm min-h-[100px] resize-y focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              required
            />
            {parsing && (
              <div className="absolute right-3 top-3">
                <svg className="animate-spin h-5 w-5 text-primary-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">支持标准 LaTeX 数学公式语法</p>

          {/* AI 自动填充 */}
          <div className="mt-4">
            <AddAutofill
              latex={formData.latex}
              onAutofill={handleAutofill}
              disabled={submitting}
            />
            {autofillApplied && (
              <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                已应用 AI 自动填充，请检查并修改
              </p>
            )}
          </div>
        </div>

        {/* 预览和解析信息 */}
        {formData.latex && showPreview && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">公式预览</h3>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {showPreview ? '隐藏预览' : '显示预览'}
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <FormulaPreview formula={formData.latex} />
            </div>

            {/* 解析结果 */}
            {parsedInfo && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">智能解析</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {parsedInfo.type && (
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <span className="text-xs text-gray-500">识别类型</span>
                      <p className="text-sm font-medium text-gray-800">{parsedInfo.type}</p>
                    </div>
                  )}
                  {parsedInfo.variables && parsedInfo.variables.length > 0 && (
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <span className="text-xs text-gray-500">变量</span>
                      <p className="text-sm font-medium text-gray-800">{parsedInfo.variables.join(', ')}</p>
                    </div>
                  )}
                </div>
                {parsedInfo.hints && parsedInfo.hints.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <span className="text-xs text-blue-600 font-medium">提示</span>
                    <ul className="mt-1 space-y-1">
                      {parsedInfo.hints.map((hint, idx) => (
                        <li key={idx} className="text-sm text-blue-700">• {hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 分类 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            公式分类 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标签
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => updateField('tags', e.target.value)}
            placeholder="用逗号分隔，例如：闭式, 递推, 求和恒等式"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">多个标签用逗号分隔</p>
        </div>

        {/* 说明 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            公式说明
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="描述公式的含义、用途和重要性..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* 适用条件 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            适用条件
          </label>
          <input
            type="text"
            value={formData.conditions}
            onChange={(e) => updateField('conditions', e.target.value)}
            placeholder="例如：n ≥ 0, k ≥ 0, n ≥ k"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* 参考来源 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            参考来源
          </label>
          <textarea
            value={formData.references}
            onChange={(e) => updateField('references', e.target.value)}
            placeholder="每行一个来源，例如：&#10;组合数学, Richard P. Stanley, 第1章&#10;OEIS A000045"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">每行一个来源，支持书籍、论文、OEIS 等</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                提交中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加公式
              </>
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
