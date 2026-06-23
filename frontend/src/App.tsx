import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'

const HomePage = lazy(() => import('./pages/HomePage'))
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'))
const FormulaDetailPage = lazy(() => import('./pages/FormulaDetailPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AddAIConfigPage = lazy(() => import('./pages/AddAIConfigPage'))
const AIConfigListPage = lazy(() => import('./pages/AIConfigListPage'))

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="p-6 text-sm text-gray-500">加载中...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/formula/:id" element={<FormulaDetailPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/ai" element={<AIConfigListPage />} />
          <Route path="/admin/ai/add" element={<AddAIConfigPage />} />
          <Route path="/admin/ai/edit/:id" element={<AddAIConfigPage />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
