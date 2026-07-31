import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { NovelPage } from './pages/NovelPage'
import { ReaderPage } from './pages/ReaderPage'
import { SettingsPage } from './pages/SettingsPage'

function Shell() {
  const location = useLocation()
  const isReader = /\/ep\//.test(location.pathname)

  return (
    <div className={`app-shell ${isReader ? 'is-reader' : ''}`}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/novel/:slug" element={<NovelPage />} />
        <Route path="/novel/:slug/ep/:episodeId" element={<ReaderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isReader && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Shell />
    </BrowserRouter>
  )
}
