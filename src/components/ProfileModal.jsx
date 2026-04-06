import { useState, useEffect, useRef } from 'react'
import { searchWatchDataGrounded } from '../lib/gemini'
import { tryWikipediaImage, compressImage } from '../utils/imageUtils'
import { dbUpsert } from '../lib/supabase'

const SPEC_FIELDS = [
  ['Case Diameter',    'case_diameter'],
  ['Thickness',        'case_thickness'],
  ['Case Material',    'case_material'],
  ['Crystal',         'crystal'],
  ['Movement',        'movement'],
  ['Power Reserve',   'power_reserve'],
  ['Water Resistance','water_resistance'],
  ['Lug Width',       'lug_width'],
  ['Dial',            'dial'],
  ['Bracelet / Strap','bracelet'],
]

export default function ProfileModal({ watchId, watches, user, onClose, onDeleteRequest, onWatchUpdated, showToast }) {
  const open  = !!watchId
  const watch = watches.find(w => w.id === watchId) || null

  const [notes, setNotes]             = useState('')
  const [specsState, setSpecsState]   = useState('idle') // 'loading' | 'loaded' | 'error'
  const [savingNotes, setSavingNotes] = useState(false)
  const [moving, setMoving]           = useState(false)
  const [imgPopoverOpen, setImgPopoverOpen] = useState(false)
  const [urlPanelOpen, setUrlPanelOpen]     = useState(false)
  const [urlInput, setUrlInput]             = useState('')
  const [searchingImg, setSearchingImg]     = useState(false)
  const fileInputRef  = useRef(null)
  const popoverRef    = useRef(null)

  // When watch changes, reset local state and fetch specs if needed
  useEffect(() => {
    if (!watch) return
    setNotes(watch.notes || '')
    setImgPopoverOpen(false)
    setUrlPanelOpen(false)
    setUrlInput('')
    setMoving(false)
    setSavingNotes(false)

    if (!watch.specs) {
      setSpecsState('loading')
      fetchSpecs(watch)
    } else {
      setSpecsState('loaded')
    }
  }, [watchId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close popover on outside click
  useEffect(() => {
    if (!imgPopoverOpen) return
    function handler(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setImgPopoverOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [imgPopoverOpen])

  async function fetchSpecs(w) {
    const query = `${w.brand} ${w.model} ${w.ref || ''}`.trim()
    try {
      // Grounded call — searches real-time web, handles new releases beyond training cutoff
      const data  = await searchWatchDataGrounded(query, user)
      const specs = {
        case_diameter:    data.case_diameter    || '—',
        case_thickness:   data.case_thickness   || '—',
        case_material:    data.case_material    || '—',
        crystal:          data.crystal          || '—',
        movement:         data.movement         || '—',
        power_reserve:    data.power_reserve    || '—',
        water_resistance: data.water_resistance || '—',
        lug_width:        data.lug_width        || '—',
        dial:             data.dial             || '—',
        bracelet:         data.bracelet         || '—',
        description:      data.description      || '',
      }
      const updated = { ...w, specs }
      await dbUpsert(updated, user.id)
      onWatchUpdated(updated)
      setSpecsState('loaded')
    } catch {
      setSpecsState('error')
    }
  }

  async function saveNotes() {
    if (!watch) return
    setSavingNotes(true)
    const updated = { ...watch, notes }
    try {
      await dbUpsert(updated, user.id)
      onWatchUpdated(updated)
      showToast('Notes saved ✓')
    } catch (e) {
      showToast('Save failed: ' + e.message, 'error')
    }
    setSavingNotes(false)
  }

  async function moveToCollection() {
    if (!watch || watch.list !== 'wishlist') return
    setMoving(true)
    const updated = { ...watch, list: 'collection' }
    try {
      await dbUpsert(updated, user.id)
      onWatchUpdated(updated)
      onClose()
      showToast('✓ Moved to Collection')
    } catch (e) {
      showToast('Move failed: ' + e.message, 'error')
      setMoving(false)
    }
  }

  async function setImageUrl() {
    if (!urlInput.trim() || !watch) return
    const updated = { ...watch, image: urlInput.trim() }
    await dbUpsert(updated, user.id)
    onWatchUpdated(updated)
    setUrlInput('')
    setUrlPanelOpen(false)
    setImgPopoverOpen(false)
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !watch) return
    try {
      const compressed = await compressImage(file)
      const updated = { ...watch, image: compressed }
      await dbUpsert(updated, user.id)
      onWatchUpdated(updated)
      setImgPopoverOpen(false)
      showToast('Photo updated')
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error')
    }
  }

  async function searchInternetImage() {
    if (!watch) return
    setSearchingImg(true)
    const query = `${watch.brand} ${watch.model}${watch.ref ? ' ' + watch.ref : ''}`
    try {
      const url = await tryWikipediaImage(query)
      if (url) {
        const updated = { ...watch, image: url }
        await dbUpsert(updated, user.id)
        onWatchUpdated(updated)
        setImgPopoverOpen(false)
        showToast('✓ Image found')
      } else {
        showToast('No image found on Wikipedia', 'error')
      }
    } catch (e) {
      showToast('Search failed: ' + e.message, 'error')
    }
    setSearchingImg(false)
  }

  if (!open || !watch) return null

  const refLine = [
    watch.ref   && `Ref. ${watch.ref}`,
    watch.year,
    watch.dial  && `${watch.dial} dial`,
  ].filter(Boolean).join(' · ')

  const specs = watch.specs || {}

  return (
    <div className="modal-backdrop open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-profile">
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div>
            <div className="modal-subtitle">
              {watch.list === 'wishlist' ? '★ Wishlist' : 'Collection Piece'}
            </div>
            <div className="modal-title">{watch.brand} {watch.model}</div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="profile-layout">
          {/* Image column */}
          <div className="profile-image-col">
            {watch.image ? (
              <img src={watch.image} alt={`${watch.brand} ${watch.model}`} onError={e => e.target.style.display = 'none'} />
            ) : (
              <div className="profile-image-placeholder">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: .25 }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span style={{ fontSize:'10px', letterSpacing:'.15em', textTransform:'uppercase', opacity:.4, marginTop:'8px' }}>No Photo</span>
              </div>
            )}

            {/* Photo change button + popover */}
            <button className="img-action-btn" onClick={e => { e.stopPropagation(); setImgPopoverOpen(v => !v) }} title="Change photo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>

            <div ref={popoverRef} className={`img-popover${imgPopoverOpen ? ' open' : ''}`}>
              <button className="img-popover-item" onClick={searchInternetImage} disabled={searchingImg}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {searchingImg ? 'Searching…' : 'Search Internet'}
              </button>

              <label className="img-popover-item img-file-wrap" style={{ cursor:'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload from Device
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', fontSize:0 }} />
              </label>

              <button className="img-popover-item" onClick={() => setUrlPanelOpen(v => !v)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Paste URL
              </button>

              <div className={`img-popover-url${urlPanelOpen ? ' open' : ''}`}>
                <input
                  placeholder="https://…"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setImageUrl()}
                />
                <button onClick={setImageUrl}>Set Image</button>
              </div>
            </div>
          </div>

          {/* Info column */}
          <div className="profile-info-col">
            <div className="profile-brand">{watch.brand}</div>
            <div className="profile-model">{watch.model}</div>
            {refLine && <div className="profile-ref">{refLine}</div>}

            {/* Specs */}
            {specsState === 'loading' && (
              <div className="loading-specs">
                <div className="spinner" />
                <p>Fetching Specifications</p>
              </div>
            )}

            {specsState === 'error' && (
              <div style={{ padding:'20px', color:'var(--text-dim)', fontSize:'13px' }}>
                Unable to fetch specifications.<br /><br />
                <button className="btn-secondary" style={{ flex:'none', padding:'8px 16px' }} onClick={() => { setSpecsState('loading'); fetchSpecs(watch) }}>
                  Retry
                </button>
              </div>
            )}

            {specsState === 'loaded' && (
              <>
                <div className="specs-title">Technical Specifications</div>
                <div className="specs-grid">
                  {SPEC_FIELDS.map(([label, key]) => (
                    <div key={key} className="spec-item">
                      <div className="spec-label">{label}</div>
                      <div className="spec-value">{specs[key] || '—'}</div>
                    </div>
                  ))}
                </div>
                {specs.description && <p className="profile-desc">{specs.description}</p>}
              </>
            )}

            {/* Notes */}
            <div className="notes-section" style={{ marginTop:'20px' }}>
              <div className="specs-title">Personal Notes</div>
              <textarea
                className="notes-textarea"
                placeholder="Purchase notes, service history, sentimental value..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="profile-footer">
          <div style={{ flex: 1 }} />
          {watch.list === 'wishlist' && (
            <button className="btn-secondary" style={{ flex:0, padding:'8px 20px' }} onClick={moveToCollection} disabled={moving}>
              {moving ? 'Moving…' : '★ Move to Collection'}
            </button>
          )}
          <button className="btn-secondary" style={{ flex:0, padding:'8px 20px' }} onClick={saveNotes} disabled={savingNotes}>
            {savingNotes ? 'Saved ✓' : 'Save Notes'}
          </button>
          <button
            className="btn-submit"
            style={{ background:'rgba(192,57,43,0.15)', color:'#e74c3c', border:'1px solid rgba(192,57,43,0.3)', flex:0, padding:'8px 20px' }}
            onClick={() => { onClose(); onDeleteRequest(watch.id) }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
