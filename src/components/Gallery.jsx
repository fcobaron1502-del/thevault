import { useState, useEffect, useMemo } from 'react'
import WatchCard from './WatchCard'

export default function Gallery({ watches, currentPage, onWatchClick, onDeleteClick, onAddClick }) {
  const [sort, setSort]              = useState('newest')
  const [activeBrand, setActiveBrand] = useState(null)

  // Reset brand filter when page changes
  useEffect(() => { setActiveBrand(null) }, [currentPage])

  const pageWatches = watches.filter(w => w.list === currentPage)

  const brands = useMemo(
    () => [...new Set(pageWatches.map(w => w.brand).filter(Boolean))].sort(),
    [pageWatches]
  )

  const displayed = useMemo(() => {
    let list = activeBrand ? pageWatches.filter(w => w.brand === activeBrand) : pageWatches
    if (sort === 'brand')       list = [...list].sort((a, b) => a.brand.localeCompare(b.brand))
    else if (sort === 'oldest') list = [...list].sort((a, b) => a.ts - b.ts)
    else                        list = [...list].sort((a, b) => b.ts - a.ts)
    return list
  }, [pageWatches, activeBrand, sort])

  const isCollection = currentPage === 'collection'
  const sectionLabel = isCollection ? 'My Collection' : 'Future Acquisitions'
  const sectionTitle = isCollection ? 'The Vault' : 'The Wishlist'

  return (
    <>
      <div className="section-header">
        <div className="section-title">
          <span>{sectionLabel}</span>
          {sectionTitle}
        </div>
        <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Recently Added</option>
          <option value="brand">By Brand</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {brands.length >= 2 && (
        <div className="brand-filter">
          <button className={`brand-pill${!activeBrand ? ' active' : ''}`} onClick={() => setActiveBrand(null)}>
            All
          </button>
          {brands.map(b => (
            <button
              key={b}
              className={`brand-pill${activeBrand === b ? ' active' : ''}`}
              onClick={() => setActiveBrand(b)}
            >
              {b}
            </button>
          ))}
        </div>
      )}

      <div className="gallery">
        {displayed.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
            </svg>
            <h3>
              {activeBrand
                ? `No ${activeBrand} watches`
                : isCollection ? 'Your vault is empty' : 'No saved watches yet'}
            </h3>
            <p>
              {activeBrand
                ? 'Try selecting a different brand or clear the filter.'
                : isCollection
                  ? 'Begin cataloguing your timepiece collection.'
                  : 'Save watches you want to acquire in the future.'}
            </p>
            {!activeBrand && (
              <button className="btn-primary" onClick={onAddClick}>+ Add Timepiece</button>
            )}
          </div>
        ) : (
          displayed.map((watch, i) => (
            <WatchCard
              key={watch.id}
              watch={watch}
              index={i}
              onOpen={onWatchClick}
              onDelete={onDeleteClick}
            />
          ))
        )}
      </div>
    </>
  )
}
