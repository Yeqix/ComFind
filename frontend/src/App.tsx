import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SearchResultsPage from './pages/SearchResultsPage'
import FormulaDetailPage from './pages/FormulaDetailPage'
import AdminPage from './pages/AdminPage'
import AddAIConfigPage from './pages/AddAIConfigPage'
import AIConfigListPage from './pages/AIConfigListPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/formula/:id" element={<FormulaDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/ai" element={<AIConfigListPage />} />
        <Route path="/admin/ai/add" element={<AddAIConfigPage />} />
        <Route path="/admin/ai/edit/:id" element={<AddAIConfigPage />} />
      </Routes>
    </div>
  )
}

export default App
