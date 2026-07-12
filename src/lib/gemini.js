import { supabase } from './supabase'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models'

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

  const requestBody = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
  }
  if (useGrounding) {
    requestBody.tools = [{ google_search: {} }]
  }

  // Key goes in a header, never the URL, so it can't leak via logs or history.
  const resp = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(requestBody),
  })
  const data = await resp.json()
  if (data.error) throw new Error(`Gemini: ${data.error.message}`)
  const candidate       = data.candidates?.[0]
  const text            = candidate?.content?.parts?.filter(p => p.text)?.map(p => p.text)?.join('') || ''
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks || []
  if (!text) throw new Error('Empty response. Try again.')
  return { text, groundingChunks }
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
  // Grounded responses sometimes add preamble despite instructions — extract the JSON object.
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not read watch data from the response. Try again.')
  return JSON.parse(match[0])
}

// Normalize raw Gemini output into the specs shape stored on a watch row.
export function normalizeSpecs(data) {
  return {
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
}

