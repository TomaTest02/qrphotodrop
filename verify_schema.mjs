import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Verifying events table schema...");
  const { data, error } = await supabase
    .from('events')
    .select('id, is_gallery_public')
    .limit(1);

  if (error) {
    console.error("❌ Schema verification failed:");
    console.error(error);
  } else {
    console.log("✅ Schema verification passed! is_gallery_public exists.");
  }
}

test();
