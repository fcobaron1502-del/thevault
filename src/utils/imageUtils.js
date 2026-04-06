export function testImageUrl(url) {
  return new Promise(resolve => {
    if (!url || !url.startsWith('http')) return resolve(false)
    const img = new Image()
    const t = setTimeout(() => { img.src = ''; resolve(false) }, 6000)
    img.onload  = () => { clearTimeout(t); resolve(img.naturalWidth > 0 ? url : false) }
    img.onerror = () => { clearTimeout(t); resolve(false) }
    img.src = url
  })
}

export async function findWorkingImageUrl(urls) {
  if (!urls?.length) return null
  return new Promise(resolve => {
    let settled = false
    let pending = urls.length
    urls.forEach(url => {
      testImageUrl(url).then(r => {
        pending--
        if (r && !settled) { settled = true; resolve(r) }
        else if (pending === 0 && !settled) resolve(null)
      })
    })
  })
}

export async function tryWikipediaImage(query) {
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, '_'))}`
    )
    const data = await resp.json()
    const url = data?.thumbnail?.source || data?.originalimage?.source
    if (url && await testImageUrl(url)) return url
  } catch {}
  return null
}

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = e => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const MAX = 800
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else       { w = Math.round(w * MAX / h); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
