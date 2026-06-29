import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const admin = createAdminClient();

    const { data: userData, error: userError } = await admin.from('users').select('*').eq('id', id).single();
    if (userError) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: eventData } = await admin.from('events').select('*').eq('user_id', id).single();

    // Get auth email + last sign in
    const { data: authData } = await admin.auth.admin.getUserById(id);

    // Statistici agregate (poze/clipuri/urări/RSVP/stocare) din view
    const { data: stats } = await admin
      .from('admin_account_overview')
      .select('photo_count, video_count, storage_used, wish_count, rsvp_count, guests_attending')
      .eq('id', id)
      .maybeSingle();

    return NextResponse.json({
      user: {
        ...userData,
        email: authData?.user?.email,
        last_sign_in_at: authData?.user?.last_sign_in_at || null,
      },
      event: eventData || null,
      stats: stats || null,
    });
  } catch (err) {
    console.error('Error fetching account details:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const admin = createAdminClient();
    const body = await request.json();

    const { phone, newPassword, eventData, status, payment } = body;

    // 1. Update phone in public.users
    if (phone !== undefined) {
      await admin.from('users').update({ phone }).eq('id', id);
    }

    // 1b. Update status (active / suspended / pending)
    if (status !== undefined) {
      const ALLOWED_STATUS = ['pending', 'active', 'suspended'];
      if (!ALLOWED_STATUS.includes(status)) {
        return NextResponse.json({ error: 'Status invalid' }, { status: 400 });
      }
      await admin.from('users').update({ status }).eq('id', id);
    }

    // 2. Update password if provided
    if (newPassword && newPassword.length >= 6) {
      const { error: passError } = await admin.auth.admin.updateUserById(id, { password: newPassword });
      if (passError) throw passError;
    }

    // 2b. Update payment info on the user's event
    if (payment) {
      const ALLOWED_PAYMENT = ['unpaid', 'partial', 'paid'];
      const payPayload = {};
      if (payment.amount_paid !== undefined) {
        const amt = Number.parseInt(payment.amount_paid, 10);
        if (Number.isNaN(amt) || amt < 0) return NextResponse.json({ error: 'Sumă invalidă' }, { status: 400 });
        payPayload.amount_paid = amt;
      }
      if (payment.payment_status !== undefined) {
        if (!ALLOWED_PAYMENT.includes(payment.payment_status)) {
          return NextResponse.json({ error: 'Stare plată invalidă' }, { status: 400 });
        }
        payPayload.payment_status = payment.payment_status;
        payPayload.paid_at = payment.payment_status === 'paid' ? new Date().toISOString() : null;
      }
      if (Object.keys(payPayload).length > 0) {
        await admin.from('events').update(payPayload).eq('user_id', id);
      }
    }

    // 3. Update event if provided
    if (eventData) {
      const { event_name, event_type, event_date, couple_names, location, package_tier, package_type, expires_at } = eventData;

      const updatePayload = {};
      if (event_name !== undefined) updatePayload.event_name = event_name;
      if (event_type !== undefined) updatePayload.event_type = event_type;
      if (event_date !== undefined) updatePayload.event_date = event_date;
      if (couple_names !== undefined) updatePayload.couple_names = couple_names;
      if (location !== undefined) updatePayload.location = location;
      if (package_tier !== undefined) updatePayload.package_tier = package_tier;
      if (package_type !== undefined) updatePayload.package_type = package_type;
      if (expires_at !== undefined) updatePayload.expires_at = expires_at || null;

      if (Object.keys(updatePayload).length > 0) {
        // Check if event exists
        const { data: existingEvent } = await admin.from('events').select('id').eq('user_id', id).single();
        if (existingEvent) {
          await admin.from('events').update(updatePayload).eq('user_id', id);
        } else {
          // You could optionally create an event here, but usually it's created by the user
          // For now, let's just create it if it doesn't exist
          await admin.from('events').insert({
            user_id: id,
            ...updatePayload
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating account:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
