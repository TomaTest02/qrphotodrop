import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Webhook apelat de Sanity când un articol de blog e publicat/editat/șters.
// Reîmprospătează instant lista de blog, articolul respectiv și sitemap-ul —
// fără ISR periodic costisitor (vezi revalidate mare pe paginile de blog).
//
// Config în Sanity: Project → API → Webhooks → Create webhook
//   URL:    https://qrphotodrop.com/api/revalidate?secret=SECRETUL_TAU
//   Trigger: Create, Update, Delete   Filter: _type == "post"
//   Projection (opțional, pt. revalidare țintită): { "slug": slug.current }
export async function POST(request) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (!process.env.SANITY_REVALIDATE_SECRET || secret !== process.env.SANITY_REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    let slug;
    try {
      const body = await request.json();
      slug = body?.slug?.current || body?.slug;
    } catch {
      /* fără body — revalidăm tot blogul */
    }

    revalidatePath('/blog');
    revalidatePath('/sitemap.xml');
    if (slug) {
      revalidatePath(`/blog/${slug}`);
    } else {
      revalidatePath('/blog/[slug]', 'page');
    }

    return NextResponse.json({ revalidated: true, slug: slug || 'all' });
  } catch {
    return NextResponse.json({ error: 'Error revalidating' }, { status: 500 });
  }
}
