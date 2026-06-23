import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FormulaPreview from '../components/FormulaPreview'
import { getFormula, type Formula } from '../services/api'

export default function FormulaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [formula, setFormula] = useState<Formula | null>(null)
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
              <h3 className="text-sm font-medium text-gray-500 mb-1">分类</h3>
              <span className="inline-block px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                {formula.category}
              </span>
            </div>

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
          </div>
        </div>
      </div>
    </div>
  )
}
