import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...value] = line.split('=');
    env[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAccount() {
  const email = 'tarbatoma@gmail.com';
  console.log(`\n=== Analyzing account: ${email} ===`);
  
  // 1. Check Auth User
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Error fetching auth users:", userError);
    return;
  }
  
  const authUser = users.users.find(u => u.email === email);
  if (!authUser) {
    console.log("❌ User not found in Supabase Auth.");
    return;
  }
  console.log("✅ User found in Auth:", authUser.id);
  console.log("   Email confirmed:", authUser.email_confirmed_at ? "Yes" : "No");

  // 2. Check public.users table
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();
    
  if (publicError) {
    console.error("Error fetching from public.users:", publicError);
  } else {
    console.log("✅ User profile in public.users:");
    console.log("   Role:", publicUser.role);
    console.log("   Status:", publicUser.status);
  }

  // 3. Check public.events table
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', authUser.id);

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
  } else {
    console.log(`✅ Events found: ${events.length}`);
    events.forEach((ev, i) => {
      console.log(`   [Event ${i+1}] Name: ${ev.event_name}, Code: ${ev.event_code}, Type: ${ev.event_type}, Status: ${ev.status}`);
    });
  }
  
  console.log("=====================================\n");
}

analyzeAccount();
