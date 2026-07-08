'use client';

import { useState, useEffect } from 'react';

export default function AdminSetariPage() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setEnabled(!!d.publicGalleryEnabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    setEnabled(next); // optimist
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicGalleryEnabled: next }),
      });
      if (!r.ok) { setEnabled(!next); alert('Eroare la salvare.'); }
    } catch { setEnabled(!next); alert('Eroare de conexiune.'); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '40px' }}>Se încarcă...</div>;

  return (
    <div style={{ maxWidth: '760px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', marginBottom: '6px', color: 'var(--color-text)' }}>Setări</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Setări globale — se aplică tuturor conturilor.</p>

      <div style={{ background: '#fff', border: '1px solid var(--color-cream-darker)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text)' }}>Galerie foto publică pentru invitați</div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
            <strong>Activat:</strong> organizatorii pot porni din dashboard opțiunea „Permite invitaților să vadă galeria foto publică".<br />
            <strong>Dezactivat:</strong> opțiunea dispare din toate dashboard-urile, iar galeria e oprită la toate conturile (invitații nu văd pozele altora).
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          aria-pressed={enabled}
          title={enabled ? 'Dezactivează' : 'Activează'}
          style={{
            flexShrink: 0, width: '58px', height: '32px', borderRadius: '999px', border: 'none',
            cursor: saving ? 'wait' : 'pointer', background: enabled ? 'var(--color-violet)' : '#cbc9d1',
            position: 'relative', transition: 'background 0.2s', opacity: saving ? 0.7 : 1,
          }}
        >
          <span style={{ position: 'absolute', top: '3px', left: enabled ? '29px' : '3px', width: '26px', height: '26px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </button>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
        Stare curentă: <strong style={{ color: enabled ? '#166534' : '#991b1b' }}>{enabled ? 'Activat' : 'Dezactivat'}</strong>
      </p>
    </div>
  );
}
