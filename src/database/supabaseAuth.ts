import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const globalScope = globalThis as typeof globalThis & {
  __inspirePlanetSupabaseAuth?: SupabaseClient;
};

// Keep one auth client across Vite hot updates as well as regular module
// imports. Recreating it with the same storage key can register concurrent
// GoTrue clients and lead to duplicate auth events.
export const supabaseAuth =
  globalScope.__inspirePlanetSupabaseAuth ||
  createClient(supabaseUrl, supabaseAnonKey);

globalScope.__inspirePlanetSupabaseAuth = supabaseAuth;
