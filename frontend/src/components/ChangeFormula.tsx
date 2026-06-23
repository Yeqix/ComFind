import { useState, useEffect } from 'react'
import FormulaPreview from './FormulaPreview'
import { updateFormula, parseFormula } from '../services/api'
import type { Formula } from '../services/api'

interface ChangeFormulaProps {
  formula: Formula
  onSuccess?: () => void
  onCancel?: () => void
}

interface FormData {
  title: string
  latex: string
  formula_type: string
  category: string
  tags: string
  aliases: string
  description: string
  conditions: string
  references: string
  source: string
  source_page: string
  difficulty: string
  proof_sketch: string
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

export default function ChangeFormula({ formula, onSuccess, onCancel }: ChangeFormulaProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    latex: '',
    formula_type: '',
    category: '二项式恒等式',
    tags: '',
    aliases: '',
    description: '',
    conditions: '',
    references: '',
    source: '',
    source_page: '',
    difficulty: '基础',
    proof_sketch: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [parsedInfo, setParsedInfo] = useState<ParsedInfo | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // 初始化表单数据
  useEffect(() => {
    if (formula) {
      setFormData({
        title: formula.title,
        latex: formula.latex,
        formula_type: formula.formula_type || '',
        category: formula.category,
        tags: formula.tags.join(', '),
        aliases: (formula.aliases || []).join(', '),
        description: formula.description || '',
        conditions: formula.conditions || '',
        references: formula.references.join('\n'),
        source: formula.source || '',
        source_page: formula.source_page ? String(formula.source_page) : '',
        difficulty: formula.difficulty || '基础',
        proof_sketch: formula.proof_sketch || '',
      })
      // 初始解析
      handleLatexChange(formula.latex)
    }
  }, [formula])

  // 实时解析公式
  const handleLatexChange = async (latex: string) => {
    setFormData(prev => ({ ...prev, latex }))
    setHasChanges(true)

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
      await updateFormula(formula.id, {
        title: formData.title.trim(),
        latex: formData.latex.trim(),
        formula_type: formData.formula_type.trim() || undefined,
        category: formData.category,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        aliases: formData.aliases.split(',').map(t => t.trim()).filter(Boolean),
        description: formData.description.trim() || undefined,
        conditions: formData.conditions.trim() || undefined,
        references: formData.references.split('\n').map(r => r.trim()).filter(Boolean),
        source: formData.source.trim() || undefined,
        source_page: formData.source_page.trim() ? Number(formData.source_page) : undefined,
        difficulty: formData.difficulty || undefined,
        proof_sketch: formData.proof_sketch.trim() || undefined,
        review_status: formula.review_status,
        review_notes: formula.review_notes,
        relation_ids: formula.relation_ids || [],
        import_batch_id: formula.import_batch_id,
      })

      setMessage({ type: 'success', text: '公式修改成功！' })
      setHasChanges(false)
      onSuccess?.()
    } catch (err) {
      setMessage({ type: 'error', text: '修改失败，请稍后重试' })
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  // 重置为原始数据
  const handleReset = () => {
    setFormData({
      title: formula.title,
      latex: formula.latex,
      formula_type: formula.formula_type || '',
      category: formula.category,
      tags: formula.tags.join(', '),
      aliases: (formula.aliases || []).join(', '),
      description: formula.description || '',
      conditions: formula.conditions || '',
      references: formula.references.join('\n'),
      source: formula.source || '',
      source_page: formula.source_page ? String(formula.source_page) : '',
      difficulty: formula.difficulty || '基础',
      proof_sketch: formula.proof_sketch || '',
    })
    setHasChanges(false)
    setMessage(null)
    handleLatexChange(formula.latex)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">修改公式</h2>
            <p className="text-sm text-gray-500 mt-1">
              编辑公式 #{formula.id} · {formula.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                有未保存的修改
              </span>
            )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              公式类型
            </label>
            <input
              type="text"
              value={formData.formula_type}
              onChange={(e) => updateField('formula_type', e.target.value)}
              placeholder="例如：恒等式、递推式、生成函数"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            别名
          </label>
          <input
            type="text"
            value={formData.aliases}
            onChange={(e) => updateField('aliases', e.target.value)}
            placeholder="用逗号分隔，例如：Vandermonde 恒等式"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              来源文件/书籍
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => updateField('source', e.target.value)}
              placeholder="例如：4_组合数学(1).pdf"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              页码
            </label>
            <input
              type="number"
              min="1"
              value={formData.source_page}
              onChange={(e) => updateField('source_page', e.target.value)}
              placeholder="页码"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            难度
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => updateField('difficulty', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="基础">基础</option>
            <option value="中等">中等</option>
            <option value="较难">较难</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            证明思路
          </label>
          <textarea
            value={formData.proof_sketch}
            onChange={(e) => updateField('proof_sketch', e.target.value)}
            placeholder="简要说明公式可如何推导，不写严格证明也可以"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={submitting || !hasChanges}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                保存中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                保存修改
              </>
            )}
          </button>

          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              重置
            </button>
          )}

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
