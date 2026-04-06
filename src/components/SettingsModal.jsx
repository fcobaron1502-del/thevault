import { useState } from 'react'
import { fetchGeminiKey } from '../lib/gemini'
import { supabase, dbUpsert } from '../lib/supabase'
import { genId } from '../utils/imageUtils'

export default function SettingsModal({ open, onClose, user, watches, setWatches, showToast }) {
  const [reloading, setReloading]       = useState(false)
  const [importStatus, setImportStatus] = useState(null)

  async function reloadGeminiKey() {
    setReloading(true)
    const ok = await fetchGeminiKey(user)
    showToast(ok ? '✓ Gemini key loaded' : '✗ Key not found in account', ok ? 'ok' : 'error')
    setReloading(false)
  }

  function exportWatches() {
    if (!watches.length) { showToast('No watches to export', 'error'); return }
    const blob = new Blob([JSON.stringify(watches, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `vault-watches-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importWatches(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus({ msg: 'Reading file…', type: 'neutral' })

    const text = await file.text()
    let data
    try { data = JSON.parse(text) }
    catch { setImportStatus({ msg: '❌ Invalid file — must be a .json export from The Vault.', type: 'error' }); return }

    if (!Array.isArray(data) || !data.length) {
      setImportStatus({ msg: '❌ No watches found in file.', type: 'error' }); return
    }

    setImportStatus({ msg: `Importing ${data.length} watches…`, type: 'neutral' })

    let success = 0, failed = 0
    for (const w of data) {
      try {
        const row = {
          id:    w.id    || genId(),
          brand: w.brand || 'Unknown',
          model: w.model || 'Unknown',
          ref:   w.ref   || '',
          year:  w.year  || '',
          dial:  w.dial  || '',
          list:  w.list  || 'collection',
          image: w.image || '',
          notes: w.notes || '',
          specs: w.specs || null,
          ts:    w.ts    || Date.now(),
        }
        await dbUpsert(row, user.id)
        success++
      } catch { failed++ }
    }

    setImportStatus({
      msg: `✓ Imported ${success} watch${success !== 1 ? 'es' : ''}${failed ? ` (${failed} failed)` : ''}.`,
      type: success > 0 ? 'ok' : 'error'
    })

    if (success > 0) {
      const { data: fresh } = await supabase.from('watches').select('*').order('ts', { ascending: false })
      if (fresh) setWatches(fresh)
      setTimeout(onClose, 1500)
    }

    // Reset file input
    e.target.value = ''
  }

  const statusColors = {
    ok:      { background:'rgba(201,168,76,0.1)',    color:'var(--gold)',     border:'1px solid rgba(201,168,76,0.3)' },
    error:   { background:'rgba(192,57,43,0.1)',     color:'#e74c3c',         border:'1px solid rgba(192,57,43,0.3)' },
    neutral: { background:'rgba(255,255,255,0.05)',  color:'var(--text-dim)', border:'1px solid var(--border)' },
  }

  return (
    <div className={`modal-backdrop${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-add" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div>
            <div className="modal-subtitle">Configuration</div>
            <div className="modal-title" style={{ fontSize: '22px' }}>Settings</div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display:'flex', gap:'8px', marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px solid var(--border)' }}>
            <button className="btn-secondary" style={{ flex:1 }} onClick={reloadGeminiKey} disabled={reloading}>
              {reloading ? '↺ Loading…' : '↺ Reload Gemini Key'}
            </button>
          </div>

          <div style={{ fontFamily:"'Cinzel',serif", fontSize:'9px', letterSpacing:'.4em', color:'var(--gold)', textTransform:'uppercase', marginBottom:'14px' }}>
            Data Migration
          </div>
          <div style={{ fontSize:'12px', color:'var(--text-dim)', lineHeight:'1.7', marginBottom:'14px' }}>
            Export your watches to a JSON file, or import from a previous export.
          </div>

          <div style={{ display:'flex', gap:'8px' }}>
            <button className="btn-secondary" style={{ flex:1 }} onClick={exportWatches}>⬇ Export</button>
            <label className="btn-secondary" style={{ flex:1, textAlign:'center', cursor:'pointer', position:'relative', overflow:'hidden' }}>
              ⬆ Import
              <input type="file" accept=".json" onChange={importWatches} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', fontSize:0 }} />
            </label>
          </div>

          {importStatus && (
            <div className="auth-status" style={{ marginTop:'10px', display:'block', ...statusColors[importStatus.type] }}>
              {importStatus.msg}
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: '16px' }}>
            <button className="btn-submit" style={{ flex:1, justifyContent:'center' }} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
