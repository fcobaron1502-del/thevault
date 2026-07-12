import { useState } from 'react'

export default function ConfirmModal({ open, watchName, onCancel, onConfirm }) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className={`modal-backdrop${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal-add" style={{ maxWidth: '360px' }} role="dialog" aria-modal="true" aria-label="Confirm removal">
        <div className="modal-header">
          <div>
            <div className="modal-subtitle">Confirm Removal</div>
            <div className="modal-title" style={{ fontSize: '22px' }}>Remove Watch?</div>
          </div>
        </div>
        <div className="modal-body">
          <p style={{ fontSize:'13px', color:'var(--text-dim)', lineHeight:'1.7', marginBottom:'24px' }}>
            This will permanently remove <strong style={{ color:'var(--cream)' }}>{watchName}</strong> from your vault. This cannot be undone.
          </p>
          <div className="modal-footer" style={{ marginTop: 0 }}>
            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button
              className="btn-submit btn-danger"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Removing…' : 'Remove from Vault'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
