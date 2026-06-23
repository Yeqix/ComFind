import { useState } from 'react'
import FormulaInput from './FormulaInput'
import FormulaPreview from './FormulaPreview'
import { createFormula } from '../services/api'

export default function FormulaForm() {
  const [formData, setFormData] = useState({
    title: '',
    latex: '',
    category: '二项式恒等式',
    tags: '',
    description: '',
    conditions: '',
    references: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      await createFormula({
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        references: formData.references.split('\n').map(r => r.trim()).filter(Boolean),
      })
      setMessage('公式添加成功！')
      setFormData({
        title: '',
        latex: '',
        category: '二项式恒等式',
        tags: '',
        description: '',
        conditions: '',
        references: '',
      })
    } catch (err) {
      setMessage('添加失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const categories = [
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
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div className={`p-3 rounded ${message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="formula-input"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">LaTeX 公式</label>
        <FormulaInput
          value={formData.latex}
          onChange={(value) => setFormData({ ...formData, latex: value })}
          placeholder="输入 LaTeX 公式"
        />
        {formData.latex && (
          <div className="mt-2 p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-500 mb-1">预览:</p>
            <FormulaPreview formula={formData.latex} />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="formula-input"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">标签 (用逗号分隔)</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="formula-input"
          placeholder="例如: 闭式, 递推, 求和恒等式"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">说明</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="formula-input"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">适用条件</label>
        <input
          type="text"
          value={formData.conditions}
          onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
          className="formula-input"
          placeholder="例如: n ≥ 0, k ≥ 0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">参考来源 (每行一个)</label>
        <textarea
          value={formData.references}
          onChange={(e) => setFormData({ ...formData, references: e.target.value })}
          className="formula-input"
          rows={3}
          placeholder="例如: 组合数学, Richard P. Stanley, 第2章"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full disabled:opacity-50"
      >
        {submitting ? '提交中...' : '添加公式'}
      </button>
    </form>
  )
}
