import { useState, useCallback } from 'react'
import { autofillFormula, validateFormula, type AutofillResponse } from '../services/api'

interface AddAutofillProps {
  latex: string
  onAutofill: (data: AutofillResponse['data']) => void
  disabled?: boolean
}

export default function AddAutofill({ latex, onAutofill, disabled = false }: AddAutofillProps) {
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<AutofillResponse['validation'] | null>(null)
  const [showValidation, setShowValidation] = useState(false)

  // 执行自动填充
  const handleAutofill = useCallback(async () => {
    if (!latex.trim() || loading || disabled) return

    setLoading(true)
    setShowValidation(false)

    try {
      const result = await autofillFormula(latex)

      if (result.success) {
        // 调用父组件回调填充数据
        onAutofill(result.data)

        // 显示验证信息
        if (result.validation && (!result.validation.is_valid || result.validation.suggestions.length > 0)) {
          setValidationResult(result.validation)
          setShowValidation(true)
        }
      }
    } catch (err) {
      console.error('自动填充失败:', err)
    } finally {
      setLoading(false)
    }
  }, [latex, loading, disabled, onAutofill])

  // 仅验证公式
  const handleValidate = useCallback(async () => {
    if (!latex.trim() || loading) return

    setLoading(true)
    try {
      const result = await validateFormula(latex)
      if (result.success) {
        setValidationResult(result.validation)
        setShowValidation(true)
      }
    } catch (err) {
      console.error('验证失败:', err)
    } finally {
      setLoading(false)
    }
  }, [latex, loading])

  // 如果没有公式，不显示组件
  if (!latex || latex.length < 3) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* 自动填充按钮 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAutofill}
          disabled={disabled || loading || latex.length < 5}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200 ease-out
            ${loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg active:scale-95'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          `}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>AI 分析中...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>AI 自动填充</span>
            </>
          )}
        </button>

        {/* 仅验证按钮 */}
        <button
          type="button"
          onClick={handleValidate}
          disabled={loading || latex.length < 5}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          仅验证
        </button>

        {/* 提示文字 */}
        {!loading && latex.length >= 5 && (
          <span className="text-xs text-gray-400">
            点击自动识别公式类型并填充信息
          </span>
        )}
      </div>

      {/* 验证结果面板 */}
      {showValidation && validationResult && (
        <div className={`
          rounded-lg p-4 text-sm
          ${validationResult.is_valid
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
          }
        `}>
          {/* 验证状态 */}
          <div className="flex items-center gap-2 mb-2">
            {validationResult.is_valid ? (
              <>
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-green-700">公式格式正确</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium text-yellow-700">发现一些问题</span>
              </>
            )}
          </div>

          {/* 问题列表 */}
          {validationResult.issues.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-yellow-800 mb-1">问题：</p>
              <ul className="space-y-1">
                {validationResult.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-yellow-700">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 建议列表 */}
          {validationResult.suggestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">建议：</p>
              <ul className="space-y-1">
                {validationResult.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-600">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 关闭按钮 */}
          <button
            onClick={() => setShowValidation(false)}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600"
          >
            隐藏提示
          </button>
        </div>
      )}
    </div>
  )
}

// 导出自动填充 Hook 供其他组件使用
export function useAutofill() {
  const [autofillData, setAutofillData] = useState<AutofillResponse['data'] | null>(null)
  const [isAutofilling, setIsAutofilling] = useState(false)

  const doAutofill = useCallback(async (latex: string) => {
    if (!latex.trim()) return null

    setIsAutofilling(true)
    try {
      const result = await autofillFormula(latex)
      if (result.success) {
        setAutofillData(result.data)
        return result.data
      }
    } catch (err) {
      console.error('自动填充失败:', err)
    } finally {
      setIsAutofilling(false)
    }
    return null
  }, [])

  return { autofillData, isAutofilling, doAutofill }
}
