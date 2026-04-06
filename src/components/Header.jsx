export default function Header({ user, currentPage, watchCount, onPageChange, onAddClick, onSettingsClick, onSignOut }) {
  const label = currentPage === 'collection'
    ? `${watchCount} piece${watchCount !== 1 ? 's' : ''}`
    : `${watchCount} saved`

  return (
    <header>
      <div className="logo">
        The Vault
        <span>Watch Collection</span>
      </div>

      <nav>
        <button className={currentPage === 'collection' ? 'active' : ''} onClick={() => onPageChange('collection')}>
          Collection
        </button>
        <button className={currentPage === 'wishlist' ? 'active' : ''} onClick={() => onPageChange('wishlist')}>
          Wishlist
        </button>
      </nav>

      <div className="header-actions">
        {user && (
          <div className="user-pill">
            <strong>{user.email}</strong>
            <button className="btn-signout" onClick={onSignOut}>Sign out</button>
          </div>
        )}

        <span className="count-badge">
          <strong>{watchCount}</strong> {currentPage === 'collection' ? `piece${watchCount !== 1 ? 's' : ''}` : 'saved'}
        </span>

        <button className="btn-add" onClick={onAddClick}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Watch
        </button>

        <button className="icon-btn" onClick={onSettingsClick} title="Settings"
          style={{ width:'36px', height:'36px', borderRadius:'1px', flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
