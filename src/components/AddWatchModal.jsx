import { useState, useEffect, useRef } from 'react'
import { searchWatchDataGrounded } from '../lib/gemini'
import { genId, tryWikipediaImage } from '../utils/imageUtils'
import { dbUpsert } from '../lib/supabase'

export default function AddWatchModal({ open, onClose, currentPage, user, onWatchAdded, showToast }) {
  const [step, setStep]                   = useState(1)
  const [query, setQuery]                 = useState('')
  const [selectedList, setSelectedList]   = useState('collection')
  const [pendingData, setPendingData]     = useState(null)
  const [previewImgSrc, setPreviewImgSrc] = useState('')
  const [error, setError]                 = useState('')
  const [searching, setSearching]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const inputRef = useRef(null)

  // Sync selectedList with currentPage when modal opens
  useEffect(() => {
    if (open) {
      setSelectedList(currentPage)
      setStep(1)
      setQuery('')
      setError('')
      setPendingData(null)
      setPreviewImgSrc('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, currentPage])

  async function searchWatch() {
    if (!query.trim()) { setError('Please enter a watch name.'); return }
    setError('')
    setSearching(true)
    try {
      // Grounded call — searches real-time web for specs, works for new releases too
      const info = await searchWatchDataGrounded(query, user)
      setPendingData(info)
      setStep(2)

      // Search Wikipedia for a watch image in the background
      setPreviewImgSrc('')
      ;(async () => {
        // Wikipedia articles exist at brand+model level, not by ref number
        const url = await tryWikipediaImage(`${info.brand} ${info.model}`)
        if (url) {
          info.resolved_image = url
          setPreviewImgSrc(url)
        }
      })()
    } catch (err) {
      setError(err.message || 'Search failed. Try again.')
    }
    setSearching(false)
  }

  async function confirmAdd() {
    if (!pendingData) return
    if (!user) { setError('Not signed in — please refresh and try again.'); return }
    setSaving(true)
    const d = pendingData
    const watch = {
      id:    genId(),
      brand: d.brand || 'Unknown',
      model: d.model || 'Unknown',
      ref:   d.ref   || '',
      year:  d.year  || '',
      dial:  d.dial  || '',
      list:  selectedList,
      image: d.resolved_image || '',
      notes: '',
      specs: {
        case_diameter:    d.case_diameter    || '—',
        case_thickness:   d.case_thickness   || '—',
        case_material:    d.case_material    || '—',
        crystal:          d.crystal          || '—',
        movement:         d.movement         || '—',
        power_reserve:    d.power_reserve    || '—',
        water_resistance: d.water_resistance || '—',
        lug_width:        d.lug_width        || '—',
        dial:             d.dial             || '—',
        bracelet:         d.bracelet         || '—',
        description:      d.description      || '',
      },
      ts: Date.now(),
    }
    try {
      await dbUpsert(watch, user.id)
      onWatchAdded(watch, selectedList)
      onClose()
    } catch (e) {
      setError('Save failed: ' + e.message)
    }
    setSaving(false)
  }

  const previewMeta = pendingData
    ? [pendingData.ref && `Ref. ${pendingData.ref}`, pendingData.case_diameter, pendingData.movement].filter(Boolean).join(' · ')
    : ''

  const confirmMsg = pendingData
    ? `Found: ${pendingData.brand} ${pendingData.model}${pendingData.ref ? ` (${pendingData.ref})` : ''}. Add to your ${selectedList === 'wishlist' ? 'Wishlist' : 'Collection'}?`
    : ''

  if (!open) return null

  return (
    <div className="modal-backdrop open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-add">
        <div className="modal-header">
          <div>
            <div className="modal-subtitle">Add to Vault</div>
            <div className="modal-title">{step === 1 ? 'New Timepiece' : 'Confirm Watch'}</div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-msg">{error}</div>}

          {/* Step 1: Search */}
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">Watch Name</label>
                <input
                  ref={inputRef}
                  className="form-input"
                  placeholder="e.g. Rolex Submariner, Omega Speedmaster…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchWatch()}
                />
                <div style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'6px', letterSpacing:'.05em' }}>
                  Just type the brand and model — we'll find everything else.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Add to</label>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button className={`list-toggle${selectedList === 'collection' ? ' active' : ''}`} onClick={() => setSelectedList('collection')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    Collection
                  </button>
                  <button className={`list-toggle${selectedList === 'wishlist' ? ' active' : ''}`} onClick={() => setSelectedList('wishlist')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    Wishlist
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn-submit" onClick={searchWatch} disabled={searching}>
                  {searching ? (
                    <><div className="spinner" style={{ width:'13px', height:'13px', borderWidth:'2px' }} /> Searching…</>
                  ) : (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search Watch</>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && pendingData && (
            <>
              <div style={{ display:'flex', gap:'16px', marginBottom:'20px', background:'var(--bg3)', border:'1px solid var(--border)', padding:'14px', borderRadius:'1px' }}>
                {previewImgSrc ? (
                  <img src={previewImgSrc} alt="" style={{ width:'90px', height:'90px', objectFit:'cover', border:'1px solid var(--border)', borderRadius:'1px', flexShrink:0, background:'var(--bg2)' }} onError={() => setPreviewImgSrc('')} />
                ) : (
                  <div style={{ width:'90px', height:'90px', border:'1px solid var(--border)', borderRadius:'1px', flexShrink:0, background:'var(--bg2)' }} />
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:'9px', letterSpacing:'.35em', color:'var(--gold)', marginBottom:'4px' }}>
                    {pendingData.brand}
                  </div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'20px', color:'var(--cream)', lineHeight:'1.2', marginBottom:'6px' }}>
                    {pendingData.model || query}
                  </div>
                  <div style={{ fontSize:'11px', color:'var(--text-dim)' }}>{previewMeta}</div>
                </div>
              </div>

              <div style={{ fontSize:'12px', color:'var(--text-dim)', letterSpacing:'.05em', marginBottom:'16px' }}>
                {confirmMsg}
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => { setStep(1); setError('') }}>← Back</button>
                <button className="btn-submit" onClick={confirmAdd} disabled={saving}>
                  {saving ? (
                    <><div className="spinner" style={{ width:'13px', height:'13px', borderWidth:'2px' }} /> Saving…</>
                  ) : (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Add to Vault</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
