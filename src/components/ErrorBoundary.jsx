import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:'16px', textAlign:'center', padding:'24px' }}>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:'14px', letterSpacing:'.3em', color:'var(--gold)', textTransform:'uppercase' }}>
          Something went wrong
        </div>
        <p style={{ fontSize:'13px', color:'var(--text-dim)', maxWidth:'360px', lineHeight:'1.7' }}>
          An unexpected error occurred. Your collection is safe — reload the page to continue.
        </p>
        <button className="btn-submit" style={{ flex:'none', padding:'10px 24px' }} onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
