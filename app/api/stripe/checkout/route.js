import { NextResponse } from 'next/server';
import { getStripe, PACKAGES } from '@/lib/stripe';

export async function POST(request) {
  try {
    const { eventType, packageType, organizerEmail } = await request.json();

    if (!eventType || !packageType || !organizerEmail) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const pkg = PACKAGES[eventType]?.[packageType];
    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: organizerEmail,
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: pkg.label,
              description: `Pachet ${pkg.label} — ${pkg.storage} stocare, valabil ${pkg.duration}`,
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        eventType,
        packageType,
        organizerEmail,
        guestLimit: String(pkg.guests),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/login?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/preturi?checkout=cancelled`,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
