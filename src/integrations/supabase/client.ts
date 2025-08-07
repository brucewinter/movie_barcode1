import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cbe2b28f-1917-4504-962f-a4fcf0f16230.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZTJiMjhmMTkxNzQ1MDQ5NjJmYTRmY2YwZjE2MjMwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0Nzk3NDMsImV4cCI6MjA1MTA1NTc0M30.bCDqO1uaHGmXC4DLYDKyBNgAALkHQyEiRUFf5V2HBhI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)