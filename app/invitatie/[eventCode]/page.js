'use client';

import { useState, useEffect, use } from 'react';
import AnimatedInvitation from '@/components/marketing/AnimatedInvitation';

export default function InvitationPage({ params }) {
  const { eventCode } = use(params);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/events?code=${encodeURIComponent(eventCode)}`);
        if (res.ok) {
          const { event } = await res.json();
          setEvent(event);
        }
      } catch {
        // event rămâne null → afișăm "Invitația nu a fost găsită"
      } finally {
        setLoading(false);
      }
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
