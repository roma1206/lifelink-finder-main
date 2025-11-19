import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Prefer .env.local then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment');
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  try {
    console.log('Seeding donor_profiles...');
    const donors = [
      {
        id: `demo_donor_${Date.now()}`,
        user_id: `demo_user_${Date.now()}`,
        full_name: 'Sofia Ramirez',
        email: 'sofia.ramirez@example.com',
        phone: '555-0303',
        blood_type: 'B+',
        is_available: true,
        location_address: 'Community Health Center',
        location_lat: 37.768,
        location_lng: -122.431,
        created_at: new Date().toISOString(),
      },
    ];

    const { data: donorData, error: donorError } = await supabase.from('donor_profiles').insert(donors);
    if (donorError) throw donorError;
    console.log('Inserted donors:', donorData?.length || 0);

    console.log('Seeding user_roles...');
    const roles = donors.map((d) => ({ user_id: d.user_id, role: 'donor' }));
    const { data: rolesData, error: rolesError } = await supabase.from('user_roles').insert(roles);
    if (rolesError) throw rolesError;
    console.log('Inserted roles:', rolesData?.length || 0);

    console.log('Seeding notifications...');
    const notif = {
      id: `demo_notif_${Date.now()}`,
      user_id: donors[0].user_id,
      title: 'Demo Seed',
      message: 'Demo data inserted by local seeder',
      type: 'info',
      created_at: new Date().toISOString(),
    };
    const { data: notifData, error: notifError } = await supabase.from('notifications').insert(notif);
    if (notifError) throw notifError;
    console.log('Inserted notifications:', notifData?.length || 0);

    console.log('Seeding complete.');
  } catch (e) {
    console.error('Seeding failed:', e.message || e);
    process.exit(2);
  }
}

seed();
