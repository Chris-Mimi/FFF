import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function main(){
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await s.from('barbell_lifts').select('name').order('name');
  if (error) { console.error(error); process.exit(1); }
  data?.forEach(r => console.log(r.name));
}
main();
