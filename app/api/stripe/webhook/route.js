import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAdminNotification } from '@/lib/resend';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { eventType, packageType, organizerEmail, guestLimit } = session.metadata;

    const supabase = createAdminClient();

    try {
      // Create order record
      await supabase.from('orders').insert({
        stripe_session_id: session.id,
        organizer_email: organizerEmail,
        event_type: eventType,
        package_type: packageType,
        package_label: `${eventType} ${packageType}`,
        amount_total: session.amount_total,
        currency: session.currency,
        status: 'completed',
        guest_limit: parseInt(guestLimit),
      });

      // Notify admin
      await sendAdminNotification(
        `Comandă nouă: ${packageType} ${eventType}`,
        `<p><strong>Email:</strong> ${organizerEmail}</p>
         <p><strong>Pachet:</strong> ${eventType} — ${packageType}</p>
         <p><strong>Suma:</strong> ${(session.amount_total / 100).toFixed(0)} RON</p>`
      );
    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }

  return NextResponse.json({ received: true });
}
