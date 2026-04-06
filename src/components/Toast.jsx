export default function Toast({ msg, type, visible }) {
  return (
    <div id="toast" className={`${visible ? 'show' : ''} ${type === 'error' ? 'error' : ''}`}>
      {msg}
    </div>
  )
}
