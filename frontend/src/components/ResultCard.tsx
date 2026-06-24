import { useNavigate } from 'react-router-dom'
import FormulaPreview from './FormulaPreview'
import EditFormulaButton from './EditFormulaButton'
import type { SearchResult } from '../services/api'

interface ResultCardProps {
  result: SearchResult
  isFavorite?: boolean
  onToggleFavorite?: (formulaId: string) => void
}

export default function ResultCard({ result, isFavorite = false, onToggleFavorite }: ResultCardProps) {
  const navigate = useNavigate()
  const matchReason = result.matchReason || result.match_reason
  const reasoningSteps = result.reasoning_steps || []

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/formula/${result.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{result.title}</h3>
        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onToggleFavorite(result.id)
              }}
              className={`rounded border px-2 py-1 text-xs ${
                isFavorite
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isFavorite ? '已收藏' : '收藏'}
            </button>
          )}
          <EditFormulaButton
            formulaId={result.id}
            formula={result}
            variant="secondary"
            size="sm"
            style="icon"
          />
          <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-sm">
            相似度 {(result.similarity * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mb-3 p-3 bg-gray-50 rounded">
        <FormulaPreview formula={result.latex} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
          {result.category}
        </span>
        {result.tags.map((tag: string, idx: number) => (
          <span key={idx} className="text-gray-500">
            #{tag}
          </span>
        ))}
      </div>

      {(result.structural_score !== undefined || result.semantic_score !== undefined || result.normalized_score !== undefined || result.vector_score !== undefined || result.equivalence_score !== undefined) && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-5">
          <span className="rounded bg-blue-50 px-2 py-1">结构 {((result.structural_score || 0) * 100).toFixed(0)}%</span>
          <span className="rounded bg-green-50 px-2 py-1">语义 {((result.semantic_score || 0) * 100).toFixed(0)}%</span>
          <span className="rounded bg-purple-50 px-2 py-1">归一 {((result.normalized_score || 0) * 100).toFixed(0)}%</span>
          <span className="rounded bg-cyan-50 px-2 py-1">向量 {((result.vector_score || 0) * 100).toFixed(0)}%</span>
          <span className="rounded bg-amber-50 px-2 py-1">等价 {((result.equivalence_score || 0) * 100).toFixed(0)}%</span>
        </div>
      )}

      {matchReason && (
        <p className="mt-3 text-sm text-gray-600">
          <span className="font-medium">匹配原因:</span> {matchReason}
          {result.equivalence_reason ? `；等价判断：${result.equivalence_reason}` : ''}
        </p>
      )}

      {reasoningSteps.length > 0 && (
        <div className="mt-3 rounded border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
          <p className="mb-2 font-medium text-gray-700">推理链</p>
          <ol className="space-y-1 pl-4 list-decimal">
            {reasoningSteps.slice(0, 5).map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
