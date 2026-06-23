import { useNavigate } from 'react-router-dom'
import QueryPanel from '../components/QueryPanel'
import AddFormulaButton from '../components/AddFormulaButton'
import AIConfigButton from '../components/AIConfigButton'

export default function HomePage() {
  const navigate = useNavigate()

  const handleSearch = (formula: string) => {
    navigate(`/search?q=${encodeURIComponent(formula)}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-primary-800 mb-3">CombFind</h1>
        <p className="text-lg text-gray-600">组合数学公式检索系统</p>
        <p className="text-sm text-gray-500 mt-2">输入公式，发现相似的组合恒等式</p>
      </div>

      <QueryPanel onSearch={handleSearch} />

      {/* 快捷操作入口 */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <p className="text-sm text-gray-500">快捷操作：</p>
        <AddFormulaButton
          variant="primary"
          size="md"
          to="/admin"
        />
        <AIConfigButton
          variant="primary"
          size="md"
          showStatus={true}
        />
      </div>

      {/* 功能介绍 */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 36v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">公式解析</h3>
          <p className="text-sm text-gray-500">自动识别 LaTeX 公式结构和变量</p>
        </div>
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">相似匹配</h3>
          <p className="text-sm text-gray-500">基于结构和语义的公式相似度计算</p>
        </div>
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">文献出处</h3>
          <p className="text-sm text-gray-500">提供公式来源和参考书籍</p>
        </div>
      </div>

      {/* 右下角悬浮按钮 - 快速录入公式 */}
      <AddFormulaButton
        variant="primary"
        size="lg"
        position="fixed"
        to="/admin"
      />
    </div>
  )
}
