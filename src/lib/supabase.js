import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — see .env.example')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function dbUpsertMany(rows) {
  const { error } = await supabase
    .from('watches')
    .upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function dbUpsert(watch, userId) {
  const { error } = await supabase
    .from('watches')
    .upsert({ ...watch, user_id: userId }, { onConflict: 'id' })
  if (error) throw error
}

export async function dbDelete(id, userId) {
  const { error } = await supabase
    .from('watches')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}
