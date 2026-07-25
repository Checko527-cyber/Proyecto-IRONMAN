import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const configOk =
  !SUPABASE_URL.includes("TU-PROYECTO") && !SUPABASE_ANON_KEY.includes("PEGA_AQUI");

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
