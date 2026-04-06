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
    // Fallback: refresh session to get latest metadata
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

export async function geminiCall(systemPrompt, userPrompt, user) {
  const key = getApiKey(user)
  if (!key) throw new Error('No Gemini key. Open Settings to reload it.')

  const apiUrl = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`
  const body   = JSON.stringify({
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
  })
  const headers = { 'Content-Type': 'application/json' }
  const urls = [apiUrl, CORS_PROXY + encodeURIComponent(apiUrl)]

  for (const url of urls) {
    try {
      const resp = await fetch(url, { method: 'POST', headers, body })
      const data = await resp.json()
      if (data.error) throw new Error(`Gemini: ${data.error.message}`)
      const text = data.candidates?.[0]?.content?.parts
        ?.filter(p => p.text)?.map(p => p.text)?.join('') || ''
      if (!text) throw new Error('Empty response. Try again.')
      return text
    } catch (e) {
      if (url === urls[urls.length - 1]) throw e
    }
  }
}
