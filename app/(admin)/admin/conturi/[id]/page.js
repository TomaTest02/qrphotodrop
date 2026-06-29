'use client';

import { useState, useEffect, use } from 'react';
import styles from '../conturi.module.css';

const TIER_LABEL = { intim: 'Basic', complet: 'Standard', vis: 'Premium' };
const TIER_MONTHS = { intim: 1, complet: 2, vis: 3 };
const GB = 1024 * 1024 * 1024;
const fmtGB = (b) => (Number(b || 0) / GB).toFixed(b > GB ? 1 : 2);
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('ro-RO') : '—');
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

function computeExpiry(event) {
  if (!event) return null;
  if (event.expires_at) return new Date(event.expires_at);
  if (!event.event_date) return null;
  const months = TIER_MONTHS[event.package_tier] || 3;
  const d = new Date(event.event_date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const card = { background: '#fff', border: '1px solid var(--color-cream-darker)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' };
const label = { fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' };
const input = { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'var(--font-sans)' };

export default function AdminContPage({ params }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);

  const [formData, setFormData] = useState({
    phone: '', newPassword: '',
    event_name: '', event_date: '', location: '', couple_names: '',
    package_type: '', package_tier: '', expires_at: '',
  });
  const [payment, setPayment] = useState({ amount_paid: 0, payment_status: 'unpaid' });

  useEffect(() => { loadAccount(); }, [id]);

  async function loadAccount() {
    try {
      const res = await fetch(`/api/admin/accounts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        setEvent(data.event || null);
        setStats(data.stats || null);
        setFormData({
          phone: data.user?.phone || '',
          newPassword: '',
          event_name: data.event?.event_name || '',
          event_date: toDateInput(data.event?.event_date),
          location: data.event?.location || '',
          couple_names: data.event?.couple_names || '',
          package_type: data.event?.package_type || '',
          package_tier: data.event?.package_tier || '',
          expires_at: toDateInput(data.event?.expires_at),
        });
        setPayment({
          amount_paid: data.event?.amount_paid || 0,
          payment_status: data.event?.payment_status || 'unpaid',
        });
      }
    } catch (err) {
      console.error(err);
      setMessage('Eroare la preluarea datelor.');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  async function putAccount(payload, successMsg) {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage(successMsg || 'Salvat cu succes!');
        await loadAccount();
      } else {
        const e = await res.json();
        setMessage(`Eroare: ${e.error}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Eroare la salvare.');
    } finally {
      setSaving(false);
    }
  }

  const handleSaveDetails = (e) => {
    e.preventDefault();
    putAccount({
      phone: formData.phone,
      newPassword: formData.newPassword || undefined,
      eventData: {
        event_name: formData.event_name,
        event_date: formData.event_date,
        location: formData.location,
        couple_names: formData.couple_names,
        package_type: formData.package_type,
        package_tier: formData.package_tier,
        expires_at: formData.expires_at || null,
      },
    }, 'Date salvate cu succes!');
    setFormData((p) => ({ ...p, newPassword: '' }));
  };

  const savePayment = () => putAccount({ payment }, 'Plată actualizată!');
  const setStatus = (status) => putAccount({ status }, 'Status actualizat!');
  const approve = async () => {
    setSaving(true);
    await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) });
    await loadAccount();
    setSaving(false);
  };
  const sendOTP = async () => {
    await fetch('/api/admin/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) });
    alert('Parolă temporară generată/trimisă.');
  };

  if (loading) return <div className={styles.loading}>Se încarcă...</div>;

  const expiry = computeExpiry(event);
  const usedPct = event?.max_storage_bytes ? Math.min(100, Math.round((Number(stats?.storage_used || 0) / Number(event.max_storage_bytes)) * 100)) : 0;

  const statItems = [
    { l: 'Stocare', v: `${fmtGB(stats?.storage_used)} / ${event?.max_storage_bytes ? Math.round(event.max_storage_bytes / GB) : '?'} GB (${usedPct}%)` },
    { l: 'Fotografii', v: stats?.photo_count ?? 0 },
    { l: 'Clipuri', v: stats?.video_count ?? 0 },
    { l: 'Urări', v: stats?.wish_count ?? 0 },
    { l: 'RSVP (prezenți/total)', v: `${stats?.guests_attending ?? 0} / ${stats?.rsvp_count ?? 0}` },
    { l: 'Cont creat', v: user?.created_at ? new Date(user.created_at).toLocaleDateString('ro-RO') : '—' },
    { l: 'Ultima logare', v: fmtDateTime(user?.last_sign_in_at) },
    { l: 'Expiră stocare', v: expiry ? expiry.toLocaleDateString('ro-RO') : '—' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
        <a href="/admin/conturi" style={{ color: 'var(--color-violet)', textDecoration: 'none', fontWeight: 600 }}>← Înapoi la conturi</a>
        <h1 className={styles.title} style={{ marginTop: '6px' }}>{user?.email}</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={user?.status === 'active' ? styles.statusActive : user?.status === 'pending' ? styles.statusPending : styles.statusError}>{user?.status || 'pending'}</span>
          {event?.event_code && <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Cod: <strong>{event.event_code}</strong></span>}
          {user?.role === 'admin' && <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-violet)' }}>ADMIN</span>}
        </div>
      </div>

      {message && (
        <div style={{ padding: '14px', background: message.includes('succes') || message.includes('actualiz') ? '#f0fdf4' : '#fef2f2', color: message.includes('succes') || message.includes('actualiz') ? '#166534' : '#991b1b', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${message.includes('succes') || message.includes('actualiz') ? '#bbf7d0' : '#fecaca'}` }}>
          {message}
        </div>
      )}

      {/* Bara de acțiuni rapide */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {user?.status === 'pending' && <button onClick={approve} disabled={saving} className={`${styles.actionBtn} ${styles.btnSuccess}`}>Aprobă cont</button>}
        {user?.status === 'active' && <button onClick={() => setStatus('suspended')} disabled={saving} className={styles.actionBtn} style={{ background: '#fef3c7', color: '#92400e' }}>Suspendă</button>}
        {user?.status === 'suspended' && <button onClick={() => setStatus('active')} disabled={saving} className={`${styles.actionBtn} ${styles.btnSuccess}`}>Reactivează</button>}
        <button onClick={sendOTP} disabled={saving} className={`${styles.actionBtn} ${styles.btnNeutral}`}>Resetează parola (OTP)</button>
        {event?.event_code && <a href={`/upload/${event.event_code}`} target="_blank" rel="noreferrer" className={styles.actionBtn} style={{ background: 'var(--color-cream)', textDecoration: 'none', color: 'var(--color-text)' }}>Vezi pagina invitaților</a>}
        {event?.event_code && <a href={`/invitatie/${event.event_code}`} target="_blank" rel="noreferrer" className={styles.actionBtn} style={{ background: 'var(--color-cream)', textDecoration: 'none', color: 'var(--color-text)' }}>Vezi invitația</a>}
      </div>

      {/* Statistici */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {statItems.map((s) => (
          <div key={s.l} style={{ background: '#fff', border: '1px solid var(--color-cream-darker)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{s.l}</div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Plată */}
        <div style={card}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid #eee', paddingBottom: '12px' }}>💰 Plată</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={label}>Sumă plătită (RON)</label>
            <input type="number" min="0" style={input} value={payment.amount_paid} onChange={(e) => setPayment((p) => ({ ...p, amount_paid: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={label}>Stare plată</label>
            <select style={{ ...input, background: '#fff' }} value={payment.payment_status} onChange={(e) => setPayment((p) => ({ ...p, payment_status: e.target.value }))}>
              <option value="unpaid">Neplătit</option>
              <option value="partial">Parțial</option>
              <option value="paid">Plătit</option>
            </select>
          </div>
          {event?.paid_at && <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Marcat plătit: {fmtDateTime(event.paid_at)}</span>}
          <button onClick={savePayment} disabled={saving || !event} className={styles.actionBtn} style={{ background: 'var(--color-violet)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Se salvează...' : 'Salvează plata'}
          </button>
          {!event && <span style={{ fontSize: '12px', color: '#991b1b' }}>Contul nu are încă un eveniment configurat.</span>}
        </div>

        {/* Date utilizator */}
        <div style={card}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid #eee', paddingBottom: '12px' }}>👤 Date utilizator</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={label}>Email (doar vizualizare)</label>
            <input type="email" value={user?.email || ''} disabled style={{ ...input, background: '#f9f9f9', color: '#666' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={label}>Telefon</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={input} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ ...label, color: '#991b1b' }}>Forțează parolă nouă</label>
            <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="Lasă gol pentru a nu modifica" style={{ ...input, border: '1px solid #fca5a5' }} />
          </div>
        </div>
      </div>

      {/* Date eveniment */}
      <form onSubmit={handleSaveDetails} style={{ marginTop: '24px' }}>
        <div style={card}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid #eee', paddingBottom: '12px' }}>🎉 Date eveniment</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
              <label style={label}>Nume eveniment</label>
              <input type="text" name="event_name" value={formData.event_name} onChange={handleChange} style={input} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
              <label style={label}>Data evenimentului</label>
              <input type="date" name="event_date" value={formData.event_date} onChange={handleChange} style={input} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
              <label style={label}>Locație</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} style={input} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
              <label style={label}>Nume miri / sărbătoriți</label>
              <input type="text" name="couple_names" value={formData.couple_names} onChange={handleChange} style={input} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
              <label style={label}>Tip pachet</label>
              <select name="package_type" value={formData.package_type} onChange={handleChange} style={{ ...input, background: '#fff' }}>
                <option value="">Alege...</option>
                <option value="nunta">Nuntă</option>
                <option value="botez">Botez</option>
                <option value="aniversare">Aniversare</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
              <label style={label}>Nivel pachet</label>
              <select name="package_tier" value={formData.package_tier} onChange={handleChange} style={{ ...input, background: '#fff' }}>
                <option value="">Alege...</option>
                <option value="intim">{TIER_LABEL.intim}</option>
                <option value="complet">{TIER_LABEL.complet}</option>
                <option value="vis">{TIER_LABEL.vis}</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
              <label style={label}>Expirare (override)</label>
              <input type="date" name="expires_at" value={formData.expires_at} onChange={handleChange} style={input} />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Gol = calculată automat din data evenimentului + nivel.</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className={styles.actionBtn} style={{ background: 'var(--color-violet)', color: 'white', padding: '12px 32px', fontSize: '16px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Se salvează...' : 'Salvează modificările'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
