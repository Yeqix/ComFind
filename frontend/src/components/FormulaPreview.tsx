import { useEffect, useRef } from 'react'
import katex from 'katex'

interface FormulaPreviewProps {
  formula: string
}

export default function FormulaPreview({ formula }: FormulaPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && formula) {
      try {
        katex.render(formula, containerRef.current, {
          throwOnError: false,
          displayMode: true,
        })
      } catch (err) {
        containerRef.current.innerHTML = `<span class="text-red-500">公式解析错误: ${err}</span>`
      }
    }
  }, [formula])

  if (!formula) {
    return <div className="text-gray-400 italic">输入公式查看预览</div>
  }

  return <div ref={containerRef} className="overflow-x-auto" />
}
