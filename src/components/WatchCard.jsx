export default function WatchCard({ watch, index, onOpen, onDelete }) {
  const meta = [watch.ref, watch.year, watch.dial].filter(Boolean).join(' · ')

  return (
    <div
      className="watch-card"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => onOpen(watch.id)}
    >
      <div className="card-img-wrap">
        {watch.image ? (
          <img
            className="card-img"
            src={watch.image}
            alt={`${watch.brand} ${watch.model}`}
            onError={e => {
              e.target.parentElement.innerHTML =
                '<div class="card-img-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg><span>No Image</span></div>'
            }}
          />
        ) : (
          <div className="card-img-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
            </svg>
            <span>Click to view</span>
          </div>
        )}
        <div className="card-overlay">
          <span className="card-overlay-btn">View Profile →</span>
        </div>
      </div>

      <div className="card-info">
        <div className="card-brand">{watch.brand}</div>
        <div className="card-model">{watch.model}</div>
        {meta && <div className="card-meta">{meta}</div>}
      </div>

      <div className="card-actions" onClick={e => e.stopPropagation()}>
        <button className="icon-btn delete" onClick={() => onDelete(watch.id)} title="Remove">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
