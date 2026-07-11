'use client';

import { useState, useEffect } from 'react';

// Etichete + descrieri pentru câmpurile numerice
const NUM_FIELDS = [
  { key: 'max_photo_mb', label: 'Mărime max / poză (MB)', hint: 'Peste această valoare, poza e respinsă.' },
  { key: 'max_video_mb', label: 'Mărime max / clip video (MB)', hint: '1536 MB = 1.5 GB. Clipurile mari folosesc upload multipart.' },
  { key: 'max_photos_per_upload', label: 'Max poze / o încărcare', hint: 'Câte poze poate trimite un invitat odată.' },
  { key: 'max_videos_per_upload', label: 'Max clipuri / o încărcare', hint: 'Câte clipuri poate trimite un invitat odată.' },
];
const RETENTION_FIELDS = [
  { key: 'retention_months_intim', label: 'Intim (luni)' },
  { key: 'retention_months_complet', label: 'Complet (luni)' },
  { key: 'retention_months_vis', label: 'Vis (luni)' },
];

const card = { background: '#fff', border: '1px solid var(--color-cream-darker)', borderRadius: '12px', padding: '24px', marginBottom: '20px' };
const inputStyle = { width: '110px', padding: '8px 10px', border: '1px solid var(--color-cream-darker)', borderRadius: '8px', fontSize: '15px' };
const labelStyle = { fontWeight: 600, fontSize: '15px', color: 'var(--color-text)' };
const hintStyle = { fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' };

function Toggle({ on, onClick, disabled, color = 'var(--color-violet)' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      style={{
        flexShrink: 0, width: '58px', height: '32px', borderRadius: '999px', border: 'none',
        cursor: disabled ? 'wait' : 'pointer', background: on ? color : '#cbc9d1',
        position: 'relative', transition: 'background 0.2s', opacity: disabled ? 0.7 : 1,
      }}
    >
      <span style={{ position: 'absolute', top: '3px', left: on ? '29px' : '3px', width: '26px', height: '26px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

export default function AdminSetariPage() {
  const [s, setS] = useState(null);           // harta setărilor (string values)
  const [storageUsedGb, setStorageUsedGb] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => { setS(d.settings || {}); setStorageUsedGb(d.storageUsedGb || 0); })
      .catch(() => setMsg('Eroare la încărcarea setărilor.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setS((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Eroare la salvare.'); }
      else { setS(d.settings); setMsg('Salvat ✓'); }
    } catch { setMsg('Eroare de conexiune.'); }
    setSaving(false);
  };

  if (loading || !s) return <div style={{ padding: '40px' }}>Se încarcă...</div>;

  const paused = s.uploads_paused === 'true';
  const alertGb = Number(s.storage_alert_gb) || 0;
  const storageOver = storageUsedGb >= alertGb;

  return (
    <div style={{ maxWidth: '760px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', marginBottom: '6px', color: 'var(--color-text)' }}>Setări</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Setări globale — se aplică tuturor conturilor.</p>

      {/* Kill-switch upload */}
      <div style={{ ...card, borderColor: paused ? '#dc2626' : 'var(--color-cream-darker)', background: paused ? '#fef2f2' : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={labelStyle}>🚧 Pauză upload (mentenanță)</div>
          <div style={{ ...hintStyle, lineHeight: 1.5 }}>
            {paused
              ? 'ACTIV: invitații NU pot încărca — văd un mesaj de mentenanță. Folosește doar în urgențe.'
              : 'Oprește temporar toate încărcările fără redeploy. Invitații văd un mesaj prietenos.'}
          </div>
        </div>
        <Toggle on={paused} onClick={() => set('uploads_paused', paused ? 'false' : 'true')} color="#dc2626" />
      </div>

      {/* Galerie publică */}
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={labelStyle}>Galerie foto publică pentru invitați</div>
          <div style={{ ...hintStyle, lineHeight: 1.5 }}>
            Când e oprit, opțiunea dispare din toate dashboard-urile și galeria e off la toate conturile.
          </div>
        </div>
        <Toggle on={s.public_gallery_enabled === 'true'} onClick={() => set('public_gallery_enabled', s.public_gallery_enabled === 'true' ? 'false' : 'true')} />
      </div>

      {/* Limite upload */}
      <div style={card}>
        <div style={{ ...labelStyle, marginBottom: '4px' }}>Limite upload</div>
        <div style={{ ...hintStyle, marginBottom: '16px' }}>Se aplică la toate paginile de încărcare (verificate și pe server).</div>
        {NUM_FIELDS.map((f) => (
          <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '10px 0', borderTop: '1px solid var(--color-cream)' }}>
            <div>
              <div style={{ fontSize: '15px', color: 'var(--color-text)' }}>{f.label}</div>
              <div style={hintStyle}>{f.hint}</div>
            </div>
            <input type="number" style={inputStyle} value={s[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ))}
      </div>

      {/* Retenție */}
      <div style={card}>
        <div style={{ ...labelStyle, marginBottom: '4px' }}>Retenție fișiere (auto-ștergere)</div>
        <div style={{ ...hintStyle, marginBottom: '16px' }}>Câte luni după data evenimentului se păstrează pozele/clipurile, per pachet. Contul și urările rămân.</div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {RETENTION_FIELDS.map((f) => (
            <div key={f.key}>
              <div style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '6px' }}>{f.label}</div>
              <input type="number" style={inputStyle} value={s[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Alertă stocare */}
      <div style={{ ...card, borderColor: storageOver ? '#d97706' : 'var(--color-cream-darker)', background: storageOver ? '#fffbeb' : '#fff' }}>
        <div style={{ ...labelStyle, marginBottom: '4px' }}>Alertă stocare R2</div>
        <div style={{ ...hintStyle, marginBottom: '16px' }}>Când stocarea totală depășește pragul, apare o avertizare în dashboard-ul admin.</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '15px', color: 'var(--color-text)' }}>Prag alertă (GB)</div>
            <div style={hintStyle}>
              Folosit acum: <strong style={{ color: storageOver ? '#b45309' : '#166534' }}>{storageUsedGb} GB</strong>
              {storageOver ? ' — prag depășit ⚠️' : ' ✓'}
            </div>
          </div>
          <input type="number" style={inputStyle} value={s.storage_alert_gb ?? ''} onChange={(e) => set('storage_alert_gb', e.target.value)} />
        </div>
      </div>

      {/* Salvare */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: '12px 28px', background: 'var(--color-violet)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Se salvează...' : 'Salvează setările'}
        </button>
        {msg && <span style={{ fontSize: '14px', fontWeight: 600, color: msg.includes('✓') ? '#166534' : '#991b1b' }}>{msg}</span>}
      </div>
    </div>
  );
}
