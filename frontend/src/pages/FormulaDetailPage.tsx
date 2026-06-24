import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FormulaPreview from '../components/FormulaPreview'
import { getFormula, getRelatedFormulas, type Formula } from '../services/api'

export default function FormulaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [formula, setFormula] = useState<Formula | null>(null)
  const [relatedFormulas, setRelatedFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      loadFormula(id)
    }
  }, [id])

  const loadFormula = async (formulaId: string) => {
    setLoading(true)
    try {
      const data = await getFormula(formulaId)
      setFormula(data)
      const related = await getRelatedFormulas(formulaId)
      setRelatedFormulas(related)
    } catch (err) {
      setError('加载公式详情失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error || !formula) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">{error || '公式不存在'}</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="mb-4 text-primary-600 hover:text-primary-800"
        >
          ← 返回
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{formula.title}</h1>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <FormulaPreview formula={formula.latex} />
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">审核状态</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                formula.review_status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : formula.review_status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
              }`}>
                {formula.review_status === 'pending'
                  ? '待审核'
                  : formula.review_status === 'rejected'
                    ? '已驳回'
                    : '已通过'}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">分类</h3>
              <span className="inline-block px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                {formula.category}
              </span>
            </div>

            {formula.formula_type && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">公式类型</h3>
                <p className="text-gray-800">{formula.formula_type}</p>
              </div>
            )}

            {formula.aliases && formula.aliases.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">别名</h3>
                <div className="flex flex-wrap gap-2">
                  {formula.aliases.map((alias, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formula.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">标签</h3>
                <div className="flex flex-wrap gap-2">
                  {formula.tags.map((tag, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formula.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">说明</h3>
                <p className="text-gray-800">{formula.description}</p>
              </div>
            )}

            {formula.conditions && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">适用条件</h3>
                <p className="text-gray-800">{formula.conditions}</p>
              </div>
            )}

            {formula.proof_sketch && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">证明思路</h3>
                <p className="text-gray-800">{formula.proof_sketch}</p>
              </div>
            )}

            {formula.proof_steps && formula.proof_steps.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Proof steps</h3>
                <ol className="space-y-2">
                  {formula.proof_steps.map((step) => (
                    <li key={step.order} className="rounded border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
                          {step.order}
                        </span>
                        <span className="font-medium text-gray-800">{step.title}</span>
                        {step.method && <span className="text-xs text-gray-400">{step.method}</span>}
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{step.detail}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {formula.application_scenarios && formula.application_scenarios.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">应用场景</h3>
                <div className="flex flex-wrap gap-2">
                  {formula.application_scenarios.map((scenario, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                      {scenario}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(formula.source || formula.source_page) && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">来源定位</h3>
                <p className="text-gray-800">
                  {formula.source || '未填写来源'}
                  {formula.source_page ? ` · 第 ${formula.source_page} 页` : ''}
                </p>
              </div>
            )}

            {formula.references.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">参考来源</h3>
                <ul className="list-disc list-inside text-gray-800">
                  {formula.references.map((ref, idx) => (
                    <li key={idx}>{ref}</li>
                  ))}
                </ul>
              </div>
            )}

            {relatedFormulas.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">相关公式</h3>
                <div className="space-y-2">
                  {relatedFormulas.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/formula/${item.id}`)}
                      className="block w-full rounded border border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-gray-800">{item.title}</span>
                        <span className="text-xs text-gray-400">#{item.id}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{item.category}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
