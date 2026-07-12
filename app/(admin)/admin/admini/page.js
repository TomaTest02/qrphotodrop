'use client';

import { useState, useEffect } from 'react';

const card = { background: '#fff', border: '1px solid var(--color-cream-darker)', borderRadius: '12px', padding: '24px', marginBottom: '20px' };
const badge = (bg, color) => ({ background: bg, color, borderRadius: '999px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 });

export default function AdminAdminiPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    fetch('/api/admin/admins')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setMsg('Eroare la încărcare.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const act = async (body, okMsg) => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Eroare.'); }
      else { setData(d); setMsg(okMsg || 'Salvat ✓'); if (body.action === 'grant') setEmail(''); }
    } catch { setMsg('Eroare de conexiune.'); }
    setBusy(false);
  };

  if (loading || !data) return <div style={{ padding: '40px' }}>Se încarcă...</div>;

  const { admins, canManage } = data;

  return (
    <div style={{ maxWidth: '760px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', marginBottom: '6px', color: 'var(--color-text)' }}>Administratori</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        Administratorii au acces complet la panou (conturi, venituri, setări, ștergere date). Acordă dreptul doar persoanelor de deplină încredere.
      </p>

      {!canManage && (
        <div style={{ ...card, background: '#f8fafc', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Vezi lista, dar doar <strong>proprietarul</strong> sau <strong>managerii</strong> pot acorda/retrage drepturi.
        </div>
      )}

      {/* Adaugă admin */}
      {canManage && (
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '4px' }}>Fă administrator un cont existent</div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>Contul trebuie să existe deja și să fie activ. Introdu emailul lui.</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="email@exemplu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '10px 12px', border: '1px solid var(--color-cream-darker)', borderRadius: '8px', fontSize: '15px' }}
            />
            <button
              onClick={() => email.trim() && act({ action: 'grant', email }, 'Administrator adăugat ✓')}
              disabled={busy || !email.trim()}
              style={{ padding: '10px 20px', background: 'var(--color-violet)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy || !email.trim() ? 0.6 : 1 }}
            >
              Fă administrator
            </button>
          </div>
        </div>
      )}

      {/* Lista adminilor */}
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '14px' }}>Administratori actuali ({admins.length})</div>
        {admins.map((a) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '12px 0', borderTop: '1px solid var(--color-cream)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', color: 'var(--color-text)' }}>{a.email}</span>
              {a.isOwner && <span style={badge('#fef3c7', '#92400e')}>Proprietar</span>}
              {a.isManager && !a.isOwner && <span style={badge('var(--color-violet-pale)', 'var(--color-violet)')}>Manager</span>}
              {a.isYou && <span style={badge('#e5e7eb', '#374151')}>Tu</span>}
            </div>

            {canManage && !a.isOwner && !a.isYou && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={a.isManager}
                    disabled={busy}
                    onChange={(e) => act({ action: 'setManager', userId: a.id, value: e.target.checked }, 'Actualizat ✓')}
                  />
                  Poate gestiona admini
                </label>
                <button
                  onClick={() => confirm(`Retragi dreptul de admin pentru ${a.email}?`) && act({ action: 'revoke', userId: a.id }, 'Drept retras ✓')}
                  disabled={busy}
                  style={{ padding: '6px 14px', background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}
                >
                  Retrage
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {msg && <p style={{ fontSize: '14px', fontWeight: 600, color: msg.includes('✓') ? '#166534' : '#991b1b' }}>{msg}</p>}
    </div>
  );
}
