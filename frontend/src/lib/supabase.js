import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://jwhsmvqlrwhhplltzpzs.supabase.co";

const supabasePublishableKey =
  "sb_publishable_U__fnJt2UvGrEMDSVe4cCQ_P7hOEoSC";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);