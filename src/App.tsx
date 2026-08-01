import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { InstallPwa } from './components/InstallPwa'
import { EditEpisodePage } from './pages/EditEpisodePage'
import { EditListPage } from './pages/EditListPage'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { NovelPage } from './pages/NovelPage'
import { ReaderPage } from './pages/ReaderPage'
import { SettingsPage } from './pages/SettingsPage'
import './hooks/usePwaInstall'

function Shell() {
  const location = useLocation()
  const isReader = /\/ep\//.test(location.pathname)
  const isEpisodeEditor = /^\/edit\/[^/]+\/[^/]+/.test(location.pathname)
  const hideChrome = isReader || isEpisodeEditor

  return (
    <div className={`app-shell ${hideChrome ? 'is-reader' : ''} ${isEpisodeEditor ? 'is-editor' : ''}`}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/edit" element={<EditListPage />} />
        <Route path="/edit/:slug" element={<EditListPage />} />
        <Route path="/edit/:slug/:episodeId" element={<EditEpisodePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/novel/:slug" element={<NovelPage />} />
        <Route path="/novel/:slug/ep/:episodeId" element={<ReaderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideChrome && (
        <>
          <InstallPwa variant="banner" />
          <BottomNav />
        </>
      )}
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
