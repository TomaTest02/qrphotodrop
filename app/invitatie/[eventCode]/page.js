'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import AnimatedInvitation from '@/components/marketing/AnimatedInvitation';

export default function InvitationPage({ params }) {
  const { eventCode } = use(params);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      const supabase = createClient();
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', eventCode)
        .single();
      
      setEvent(data);
      setLoading(false);
    }
    loadEvent();
  }, [eventCode]);

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-cream)' }}>Se încarcă...</div>;
  }

  if (!event) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-cream)' }}>Invitația nu a fost găsită.</div>;
  }

  const details = event.invitation_details || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', position: 'relative', overflowX: 'hidden' }}>
      <AnimatedInvitation details={details} event={event} isPreview={false} />
    </div>
  );
}
