import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { fetchGeminiKey } from './lib/gemini'
import AuthScreen from './components/AuthScreen'
import Header from './components/Header'
import Gallery from './components/Gallery'
import AddWatchModal from './components/AddWatchModal'
import ProfileModal from './components/ProfileModal'
import SettingsModal from './components/SettingsModal'
import ConfirmModal from './components/ConfirmModal'
import Toast from './components/Toast'

export default function App() {
  const [user, setUser] = useState(null)
  const [watches, setWatches] = useState([])
  const [currentPage, setCurrentPage] = useState('collection')
  const [toast, setToast] = useState({ msg: '', type: 'ok', visible: false })

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [profileWatchId, setProfileWatchId] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const toastTimerRef = useRef(null)

  const showToast = useCallback((msg, type = 'ok') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ msg, type, visible: true })
    toastTimerRef.current = setTimeout(
      () => setToast(t => ({ ...t, visible: false })),
      3000
    )
  }, [])

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setWatches([])
          localStorage.removeItem('gemini_api_key')
          return
        }
        if (session?.user && event !== 'TOKEN_REFRESHED') {
          setUser(session.user)
          const keyOk = await fetchGeminiKey(session.user)
          if (!keyOk) showToast('⚠ Gemini key not set in account metadata', 'error')
          const { data, error } = await supabase
            .from('watches').select('*').order('ts', { ascending: false })
          if (!error) setWatches(data || [])
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [showToast])

  // Keyboard shortcut: Escape closes all modals
  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return
      setAddModalOpen(false)
      setProfileWatchId(null)
      setConfirmDeleteId(null)
      setSettingsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const handleSignOut = async () => {
    setUser(null)
    setWatches([])
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k))
    localStorage.removeItem('gemini_api_key')
    try { await supabase.auth.signOut() } catch {}
  }

  const handleWatchAdded = useCallback((watch, targetList) => {
    setWatches(prev => [watch, ...prev])
    if (targetList !== currentPage) setCurrentPage(targetList)
  }, [currentPage])

  const handleWatchUpdated = useCallback(updated => {
    setWatches(prev => prev.map(w => w.id === updated.id ? updated : w))
  }, [])

  const handleDeleteRequest = useCallback(id => {
    setConfirmDeleteId(id)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    const id = confirmDeleteId
    if (!id) return
    const { error } = await supabase
      .from('watches').delete().eq('id', id).eq('user_id', user.id)
    if (error) { showToast('Delete failed: ' + error.message, 'error'); return }
    setWatches(prev => prev.filter(w => w.id !== id))
    setConfirmDeleteId(null)
    if (profileWatchId === id) setProfileWatchId(null)
    showToast('Removed from vault')
  }, [confirmDeleteId, user, profileWatchId, showToast])

  const confirmWatch = watches.find(w => w.id === confirmDeleteId)
  const watchCount = watches.filter(w => w.list === currentPage).length

  return (
    <>
      {!user && <AuthScreen />}

      {user && (
        <>
          <Header
            user={user}
            currentPage={currentPage}
            watchCount={watchCount}
            onPageChange={setCurrentPage}
            onAddClick={() => setAddModalOpen(true)}
            onSettingsClick={() => setSettingsOpen(true)}
            onSignOut={handleSignOut}
          />
          <main>
            <Gallery
              watches={watches}
              currentPage={currentPage}
              onWatchClick={setProfileWatchId}
              onDeleteClick={handleDeleteRequest}
              onAddClick={() => setAddModalOpen(true)}
            />
          </main>
        </>
      )}

      <AddWatchModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        currentPage={currentPage}
        user={user}
        onWatchAdded={handleWatchAdded}
        showToast={showToast}
      />

      <ProfileModal
        watchId={profileWatchId}
        watches={watches}
        user={user}
        onClose={() => setProfileWatchId(null)}
        onDeleteRequest={handleDeleteRequest}
        onWatchUpdated={handleWatchUpdated}
        showToast={showToast}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        watches={watches}
        setWatches={setWatches}
        showToast={showToast}
      />

      <ConfirmModal
        open={!!confirmDeleteId}
        watchName={confirmWatch ? `${confirmWatch.brand} ${confirmWatch.model}` : ''}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />

      <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />
    </>
  )
}
