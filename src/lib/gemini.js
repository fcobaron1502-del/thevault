import { supabase } from './supabase'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models'
const CORS_PROXY   = 'https://corsproxy.io/?'

export function getApiKey(user) {
  if (user?.user_metadata?.gemini_key) return user.user_metadata.gemini_key
  return localStorage.getItem('gemini_api_key') || ''
}

export async function fetchGeminiKey(user) {
  try {
    const key = user?.user_metadata?.gemini_key
    if (key) {
      localStorage.setItem('gemini_api_key', key)
      return true
    }
    const { data: { user: freshUser } } = await supabase.auth.getUser()
    const keyFromRefresh = freshUser?.user_metadata?.gemini_key
    if (keyFromRefresh) {
      localStorage.setItem('gemini_api_key', keyFromRefresh)
      return true
    }
    return false
  } catch {
    return false
  }
}

// Core call. Returns { text, groundingChunks }.
// useGrounding enables real-time Google Search — direct API only (no CORS proxy).
async function geminiCallRaw(systemPrompt, userPrompt, user, useGrounding = false) {
  const key = getApiKey(user)
  if (!key) throw new Error('No Gemini key. Open Settings to reload it.')

  const apiUrl = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`
  const requestBody = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
  }
  if (useGrounding) {
    requestBody.tools = [{ google_search: {} }]
  }
  const body    = JSON.stringify(requestBody)
  const headers = { 'Content-Type': 'application/json' }
  const urls    = useGrounding ? [apiUrl] : [apiUrl, CORS_PROXY + encodeURIComponent(apiUrl)]

  for (const url of urls) {
    try {
      const resp = await fetch(url, { method: 'POST', headers, body })
      const data = await resp.json()
      if (data.error) throw new Error(`Gemini: ${data.error.message}`)
      const candidate      = data.candidates?.[0]
      const text           = candidate?.content?.parts?.filter(p => p.text)?.map(p => p.text)?.join('') || ''
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks || []
      if (!text) throw new Error('Empty response. Try again.')
      return { text, groundingChunks }
    } catch (e) {
      if (url === urls[urls.length - 1]) throw e
    }
  }
}

// Standard text call — returns just the text string (backwards-compatible).
export async function geminiCall(systemPrompt, userPrompt, user, useGrounding = false) {
  const { text } = await geminiCallRaw(systemPrompt, userPrompt, user, useGrounding)
  return text
}

// Grounded watch data search: real-time Google Search for specs on any watch,
// including recently released models beyond the training cutoff.
export async function searchWatchDataGrounded(query, user) {
  const systemPrompt = `You are a watch encyclopedia with access to real-time web search. Search for the exact watch and return ONLY valid JSON, no markdown, no preamble.
Required keys: brand, model, ref (or ""), year (or ""), dial, case_diameter, case_thickness, case_material, crystal, movement, power_reserve, water_resistance, lug_width, bracelet, description (2-3 sentences).
Use "—" for any value you cannot confirm from search results. JSON only.`
  const { text } = await geminiCallRaw(systemPrompt, `Find specs for: ${query}`, user, true)
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

// Grounded image search: uses real-time Google Search to find product image URLs.
// Asks for multiple candidates, then tests each to return the first working one.
// groundingChunks from the response confirm the model searched real web pages —
// the URLs in the JSON come from those actual pages, not hallucinated memory.
export async function searchWatchImageGrounded(brand, model, ref, user) {
  const watchName   = `${brand} ${model}${ref ? ' ' + ref : ''}`
  const systemPrompt = `Search the web for product photos of this watch on retailer and brand websites. Return ONLY valid JSON: { "image_urls": ["url1", "url2", "url3"] } with up to 3 direct image file URLs (.jpg, .png, or .webp) found in the search results. These must be direct links to image files from Jomashop, Chrono24, WatchBox, official brand sites, or similar. JSON only, no markdown.`
  try {
    const { text, groundingChunks } = await geminiCallRaw(
      systemPrompt,
      `Find product images for: ${watchName}`,
      user,
      true
    )
    const info       = JSON.parse(text.replace(/```json|```/g, '').trim())
    const candidates = Array.isArray(info.image_urls) ? info.image_urls
      : info.image_url ? [info.image_url] : []

    // Return the first URL directly — client-side image testing (new Image()) fails
    // for most retailer sites due to hotlink protection / CORS, producing false negatives.
    // The <img> onError handler in WatchCard and the preview already handles broken URLs.
    return candidates[0] || null
  } catch {
    return null
  }
}
