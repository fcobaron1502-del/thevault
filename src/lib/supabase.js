import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || 'https://aqalyjvslyevxfgbvhdz.supabase.co'
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYWx5anZzbHlldnhmZ2J2aGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTk3MzAsImV4cCI6MjA5MDg3NTczMH0.1_af0zGIjLiKxnsXwW6SBKMEAS6JerSW_dLgXedZljs'

export const supabase = createClient(supabaseUrl, supabaseKey)

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
