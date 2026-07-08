'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './conturi.module.css';

// ── Constante business ──────────────────────────────────────────
const TIER_LABEL = { intim: 'Basic', complet: 'Standard', vis: 'Premium' };
const TIER_MONTHS = { intim: 1, complet: 2, vis: 3 };
const PACKAGE_PRICES = {
  nunta: { intim: 279, complet: 399, vis: 649 },
  botez: { intim: 279, complet: 399, vis: 649 },
  aniversare: { intim: 279, complet: 399, vis: 649 },
  corporate: { intim: 279, complet: 399, vis: 649 },
};

// ── Helperi ─────────────────────────────────────────────────────
const GB = 1024 * 1024 * 1024;
const fmtGB = (bytes) => (Number(bytes || 0) / GB).toFixed(bytes > GB ? 1 : 2);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ro-RO') : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function packagePrice(acc) {
  if (acc.amount_paid) return acc.amount_paid;
  return PACKAGE_PRICES[acc.package_type]?.[acc.package_tier] || PACKAGE_PRICES[acc.event_type]?.[acc.package_tier] || 0;
}

function getExpiry(acc) {
  if (!acc.event_id) return null;
  if (acc.expires_at) return new Date(acc.expires_at);
  if (!acc.event_date) return null;
  const months = TIER_MONTHS[acc.package_tier] || 3;
  const d = new Date(acc.event_date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function daysLeft(expiry) {
  if (!expiry) return null;
  return Math.ceil((expiry.getTime() - Date.now()) / 86400000);
}
const isExpired = (acc) => {
  const e = getExpiry(acc);
  return e ? e.getTime() < Date.now() : false;
};

export default function AdminConturiPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [busyId, setBusyId] = useState(null);
  const [menu, setMenu] = useState(null); // { acc, top, left }
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [planners, setPlanners] = useState([]);
  const [createForm, setCreateForm] = useState({
    email: '', password: '', phone: '', eventName: '', eventType: 'nunta', packageTier: 'complet', eventDate: '', referredBy: '',
  });

  useEffect(() => { loadAccounts(); loadPlanners(); }, []);

  async function loadPlanners() {
    try {
      const res = await fetch('/api/admin/planners');
      if (res.ok) {
        const { planners } = await res.json();
        setPlanners(planners || []);
      }
    } catch { /* opțional — dropdown-ul rămâne gol */ }
  }

  const submitCreate = async (e) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateErr('');
    try {
      const res = await fetch('/api/admin/create-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateOpen(false);
        setCreateForm({ email: '', password: '', phone: '', eventName: '', eventType: 'nunta', packageTier: 'complet', eventDate: '', referredBy: '' });
        await loadAccounts();
      } else {
        setCreateErr(data.error || 'Eroare la creare.');
      }
    } catch {
      setCreateErr('Eroare de conexiune.');
    }
    setCreateSaving(false);
  };

  // Închide meniul de acțiuni la scroll / resize / Escape
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const openMenu = (e, acc) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ acc, top: r.bottom + 6, left: Math.max(8, r.right - 210) });
  };

  async function loadAccounts() {
    try {
      const res = await fetch('/api/admin/accounts');
      if (res.ok) {
        const { accounts } = await res.json();
        setAccounts(accounts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Acțiuni ───────────────────────────────────────────────────
  const handleApprove = async (userId) => {
    setBusyId(userId);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) await loadAccounts();
    } catch (err) { console.error(err); }
    setBusyId(null);
  };

  const handleSetStatus = async (userId, status) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/accounts/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await loadAccounts();
    } catch (err) { console.error(err); }
    setBusyId(null);
  };

  const handleMarkPaid = async (acc) => {
    setBusyId(acc.id);
    try {
      const res = await fetch(`/api/admin/accounts/${acc.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment: { payment_status: 'paid', amount_paid: packagePrice(acc) } }),
      });
      if (res.ok) await loadAccounts();
    } catch (err) { console.error(err); }
    setBusyId(null);
  };

  const handleDelete = async (userId) => {
    if (!confirm('Sigur vrei să ștergi acest cont? Acțiunea este definitivă.')) return;
    setBusyId(userId);
    try {
      await fetch('/api/admin/accounts', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      await loadAccounts();
    } catch (err) { console.error(err); }
    setBusyId(null);
  };

  const handleSendOTP = async (userId) => {
    setBusyId(userId);
    try {
      await fetch('/api/admin/otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      alert('Parolă temporară generată/trimisă.');
    } catch (err) { console.error(err); }
    setBusyId(null);
  };

  const exportCSV = () => {
    const headers = ['Email', 'Telefon', 'Eveniment', 'Tip', 'Data eveniment', 'Cod', 'Pachet', 'Status', 'Plata (RON)', 'Stare plata', 'Stocare folosita (GB)', 'Limita (GB)', 'Poze', 'Clipuri', 'Urari', 'Expira', 'Creat'];
    const rows = filtered.map((a) => [
      a.email, a.phone || '', a.event_name || '', a.event_type || '', fmtDate(a.event_date), a.event_code || '',
      TIER_LABEL[a.package_tier] || '', a.status || '', a.amount_paid || 0, a.payment_status || 'unpaid',
      fmtGB(a.storage_used), a.max_storage_bytes ? Math.round(a.max_storage_bytes / GB) : '',
      a.photo_count, a.video_count, a.wish_count, fmtDate(getExpiry(a)), fmtDate(a.created_at),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conturi_qrphotodrop_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Filtrare + căutare + sortare ──────────────────────────────
  const filtered = useMemo(() => {
    let list = [...accounts];

    if (filter === 'expired') list = list.filter(isExpired);
    else if (filter !== 'all') list = list.filter((a) => (a.status || 'pending') === filter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        (a.email || '').toLowerCase().includes(q) ||
        (a.event_name || '').toLowerCase().includes(q) ||
        (a.couple_names || '').toLowerCase().includes(q) ||
        (a.event_code || '').toLowerCase().includes(q) ||
        (a.phone || '').includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'storage') return Number(b.storage_used || 0) - Number(a.storage_used || 0);
      if (sortBy === 'unpaid') return (a.payment_status === 'paid' ? 1 : 0) - (b.payment_status === 'paid' ? 1 : 0);
      if (sortBy === 'expiry') {
        const ea = getExpiry(a), eb = getExpiry(b);
        if (!ea) return 1;
        if (!eb) return -1;
        return ea - eb;
      }
      return 0;
    });
    return list;
  }, [accounts, filter, search, sortBy]);

  // ── KPI-uri ───────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = accounts.length;
    const pending = accounts.filter((a) => a.status === 'pending').length;
    const active = accounts.filter((a) => a.status === 'active').length;
    const suspended = accounts.filter((a) => a.status === 'suspended').length;
    const expiringSoon = accounts.filter((a) => {
      const dl = daysLeft(getExpiry(a));
      return dl !== null && dl >= 0 && dl <= 30;
    }).length;
    const revenue = accounts.reduce((s, a) => s + (a.amount_paid || 0), 0);
    const storage = accounts.reduce((s, a) => s + Number(a.storage_used || 0), 0);
    return { total, pending, active, suspended, expiringSoon, revenue, storage };
  }, [accounts]);

  if (loading) return <div className={styles.loading}>Se încarcă...</div>;

  const kpiCards = [
    { label: 'Total conturi', value: kpis.total },
    { label: 'În așteptare', value: kpis.pending, accent: kpis.pending ? '#b45309' : undefined },
    { label: 'Active', value: kpis.active, accent: '#166534' },
    { label: 'Suspendate', value: kpis.suspended, accent: kpis.suspended ? '#991b1b' : undefined },
    { label: 'Expiră ≤30 zile', value: kpis.expiringSoon, accent: kpis.expiringSoon ? '#b45309' : undefined },
    { label: 'Venituri (RON)', value: kpis.revenue.toLocaleString('ro-RO'), accent: '#166534' },
    { label: 'Stocare folosită', value: `${fmtGB(kpis.storage)} GB` },
  ];

  return (
    <div className={styles.container} style={{ maxWidth: '1500px' }}>
      {/* KPI-uri */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {kpiCards.map((k) => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid var(--color-cream-darker)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: k.accent || 'var(--color-text)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Header + controale */}
      <div className={styles.header} style={{ flexWrap: 'wrap', gap: '12px' }}>
        <h1 className={styles.title}>Conturi ({filtered.length})</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Caută email, nume, cod..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--color-cream-darker)', fontSize: '14px', minWidth: '220px', fontFamily: 'var(--font-sans)' }}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--color-cream-darker)', fontSize: '14px', background: '#fff', cursor: 'pointer' }}>
            <option value="recent">Sortare: Recente</option>
            <option value="expiry">Sortare: Expiră curând</option>
            <option value="storage">Sortare: Stocare folosită</option>
            <option value="unpaid">Sortare: Neplătite întâi</option>
          </select>
          <button onClick={exportCSV} className={styles.actionBtn} style={{ background: '#3e405b', color: '#fff', border: 'none', cursor: 'pointer', padding: '9px 16px', borderRadius: '8px', fontWeight: 600 }}>
            ⬇ Export CSV
          </button>
          <button onClick={() => { setCreateErr(''); setCreateOpen(true); }} className={styles.actionBtn} style={{ background: 'var(--color-violet)', color: '#fff', border: 'none', cursor: 'pointer', padding: '9px 16px', borderRadius: '8px', fontWeight: 600 }}>
            + Creează cont
          </button>
        </div>
      </div>

      {/* Filtre */}
      <div className={styles.filterGroup} style={{ marginBottom: '16px' }}>
        {[
          { k: 'all', l: 'Toate' },
          { k: 'pending', l: 'Pending' },
          { k: 'active', l: 'Active' },
          { k: 'suspended', l: 'Suspendate' },
          { k: 'expired', l: 'Expirate' },
        ].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`${styles.filterBtn} ${filter === f.k ? styles.filterBtnActive : ''}`}>
            {f.l}
          </button>
        ))}
      </div>

      <div className={styles.tableCard} style={{ overflowX: 'auto' }}>
        <table className={styles.table} style={{ minWidth: '1100px' }}>
          <thead>
            <tr>
              <th className={styles.th}>Contact</th>
              <th className={styles.th}>Eveniment</th>
              <th className={styles.th}>Pachet</th>
              <th className={styles.th}>Plată</th>
              <th className={styles.th}>Stocare</th>
              <th className={styles.th}>Conținut</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Expiră</th>
              <th className={styles.th}>Ultima logare</th>
              <th className={styles.th}>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((acc) => {
              const expiry = getExpiry(acc);
              const dl = daysLeft(expiry);
              const expired = isExpired(acc);
              const usedPct = acc.max_storage_bytes ? Math.min(100, Math.round((Number(acc.storage_used || 0) / Number(acc.max_storage_bytes)) * 100)) : 0;
              const busy = busyId === acc.id;
              return (
                <tr key={acc.id} style={{ opacity: busy ? 0.5 : 1 }}>
                  {/* Contact */}
                  <td className={styles.td}>
                    <a href={`/admin/conturi/${acc.id}`} style={{ fontWeight: 600, color: 'var(--color-violet)', textDecoration: 'none' }} title="Vezi detalii cont">
                      {acc.email}
                    </a>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{acc.phone || 'fără telefon'}</div>
                    {(acc.referrer_name || acc.referred_by_name) && (
                      <div style={{ fontSize: '11px', color: acc.referrer_name ? 'var(--color-violet)' : '#b45309' }} title="Wedding planner care a recomandat">
                        ↳ {acc.referrer_name || acc.referred_by_name}{!acc.referrer_name ? ' (neatribuit)' : ''}
                      </div>
                    )}
                    {acc.role === 'admin' && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-violet)' }}>ADMIN</span>}
                  </td>
                  {/* Eveniment */}
                  <td className={styles.td}>
                    {acc.event_id ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{acc.event_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                          {acc.event_type} · {fmtDate(acc.event_date)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Cod: <strong>{acc.event_code}</strong></div>
                      </>
                    ) : acc.requested_event_date || acc.requested_event_name ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{acc.requested_event_name || '—'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                          {acc.requested_event_type} · {fmtDate(acc.requested_event_date)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>cerere (neaprobat)</div>
                      </>
                    ) : <span style={{ color: 'var(--color-text-muted)' }}>— neconfigurat</span>}
                  </td>
                  {/* Pachet */}
                  <td className={styles.td}>
                    {acc.package_tier ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{TIER_LABEL[acc.package_tier] || acc.package_tier}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{packagePrice(acc)} RON</div>
                      </>
                    ) : acc.requested_package_tier ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{TIER_LABEL[acc.requested_package_tier] || acc.requested_package_tier}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {(PACKAGE_PRICES[acc.requested_event_type]?.[acc.requested_package_tier]) || '—'} RON · cerut
                        </div>
                      </>
                    ) : '—'}
                  </td>
                  {/* Plată */}
                  <td className={styles.td}>
                    <span style={{
                      padding: '3px 9px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                      background: acc.payment_status === 'paid' ? '#dcfce7' : acc.payment_status === 'partial' ? '#fef9c3' : '#fee2e2',
                      color: acc.payment_status === 'paid' ? '#166534' : acc.payment_status === 'partial' ? '#854d0e' : '#991b1b',
                    }}>
                      {acc.payment_status === 'paid' ? '✓ Plătit' : acc.payment_status === 'partial' ? 'Parțial' : 'Neplătit'}
                    </span>
                    {acc.amount_paid ? <div style={{ fontSize: '12px', marginTop: '4px' }}>{acc.amount_paid} RON</div> : null}
                  </td>
                  {/* Stocare */}
                  <td className={styles.td}>
                    <div style={{ fontSize: '13px' }}>{fmtGB(acc.storage_used)} / {acc.max_storage_bytes ? Math.round(acc.max_storage_bytes / GB) : '?'} GB</div>
                    <div style={{ height: '6px', background: '#eee', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${usedPct}%`, height: '100%', background: usedPct > 90 ? '#dc2626' : usedPct > 70 ? '#d97706' : 'var(--color-violet)' }} />
                    </div>
                  </td>
                  {/* Conținut */}
                  <td className={styles.td}>
                    <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                      📸 {acc.photo_count} · 🎬 {acc.video_count}<br />
                      💌 {acc.wish_count} urări
                    </div>
                  </td>
                  {/* Status */}
                  <td className={styles.td}>
                    <span className={
                      acc.status === 'active' ? styles.statusActive :
                      acc.status === 'pending' ? styles.statusPending : styles.statusError
                    }>
                      {acc.status || 'pending'}
                    </span>
                    {acc.is_gallery_public && <div style={{ fontSize: '10px', color: 'var(--color-violet)', marginTop: '2px' }}>galerie publică</div>}
                  </td>
                  {/* Expiră */}
                  <td className={styles.td}>
                    {expiry ? (
                      <div style={{ fontSize: '13px', color: expired ? '#dc2626' : dl <= 30 ? '#d97706' : 'var(--color-text)' }}>
                        {fmtDate(expiry)}
                        <div style={{ fontSize: '11px' }}>{expired ? 'expirat' : `${dl} zile`}</div>
                      </div>
                    ) : '—'}
                  </td>
                  {/* Ultima logare */}
                  <td className={styles.td}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{fmtDateTime(acc.last_sign_in_at)}</span>
                  </td>
                  {/* Acțiuni */}
                  <td className={styles.td}>
                    <button className={styles.actionsTrigger} disabled={busy} onClick={(e) => openMenu(e, acc)}>
                      Acțiuni ▾
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={styles.empty}>Niciun cont găsit</p>}
      </div>

      {/* Meniu acțiuni (dropdown poziționat fix) */}
      {menu && (
        <>
          <div className={styles.menuOverlay} onClick={() => setMenu(null)} />
          <div className={styles.menu} style={{ top: menu.top, left: menu.left }}>
            {menu.acc.status === 'pending' && (
              <button className={styles.menuItem} style={{ color: '#166534' }} onClick={() => { setMenu(null); handleApprove(menu.acc.id); }}>✓ Aprobă cont</button>
            )}
            {menu.acc.status === 'active' && (
              <button className={styles.menuItem} style={{ color: '#92400e' }} onClick={() => { setMenu(null); handleSetStatus(menu.acc.id, 'suspended'); }}>⏸ Suspendă</button>
            )}
            {menu.acc.status === 'suspended' && (
              <button className={styles.menuItem} style={{ color: '#166534' }} onClick={() => { setMenu(null); handleSetStatus(menu.acc.id, 'active'); }}>▶ Reactivează</button>
            )}
            {menu.acc.event_id && menu.acc.payment_status !== 'paid' && (
              <button className={styles.menuItem} style={{ color: '#166534' }} onClick={() => { setMenu(null); handleMarkPaid(menu.acc); }}>💰 Marchează plătit</button>
            )}
            {menu.acc.event_code && (
              <a className={styles.menuItem} href={`/upload/${menu.acc.event_code}`} target="_blank" rel="noreferrer" onClick={() => setMenu(null)}>🖼 Pagina invitaților</a>
            )}
            <button className={styles.menuItem} onClick={() => { setMenu(null); handleSendOTP(menu.acc.id); }}>🔑 Resetează parola (OTP)</button>
            <a className={styles.menuItem} href={`/admin/conturi/${menu.acc.id}`}>✎ Editează cont</a>
            <div className={styles.menuDivider} />
            <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { setMenu(null); handleDelete(menu.acc.id); }}>🗑 Șterge cont</button>
          </div>
        </>
      )}

      {/* Modal creare cont manual */}
      {createOpen && (
        <div onClick={() => setCreateOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(20,16,24,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', marginBottom: '4px', color: 'var(--color-text)' }}>Creează cont nou</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>Contul e activ imediat, cu evenimentul și codul QR create automat.</p>
            {createErr && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '11px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>{createErr}</div>}
            <form onSubmit={submitCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { k: 'email', l: 'Email', type: 'email', full: true },
                { k: 'password', l: 'Parolă (min 6)', type: 'text' },
                { k: 'phone', l: 'Telefon', type: 'tel' },
                { k: 'eventName', l: 'Nume eveniment', type: 'text', full: true },
                { k: 'eventDate', l: 'Data evenimentului', type: 'date' },
              ].map((f) => (
                <label key={f.k} style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', gridColumn: f.full ? '1 / -1' : 'auto' }}>
                  {f.l}
                  <input
                    type={f.type} required={f.k !== 'phone'}
                    value={createForm[f.k]}
                    onChange={(e) => setCreateForm({ ...createForm, [f.k]: e.target.value })}
                    style={{ padding: '10px 12px', border: '1px solid var(--color-cream-darker)', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-sans)' }}
                  />
                </label>
              ))}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Tip eveniment
                <select value={createForm.eventType} onChange={(e) => setCreateForm({ ...createForm, eventType: e.target.value })} style={{ padding: '10px 12px', border: '1px solid var(--color-cream-darker)', borderRadius: '8px', fontSize: '14px', background: '#fff' }}>
                  <option value="nunta">Nuntă</option>
                  <option value="botez">Botez</option>
                  <option value="aniversare">Aniversare</option>
                  <option value="corporate">Corporate</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Pachet
                <select value={createForm.packageTier} onChange={(e) => setCreateForm({ ...createForm, packageTier: e.target.value })} style={{ padding: '10px 12px', border: '1px solid var(--color-cream-darker)', borderRadius: '8px', fontSize: '14px', background: '#fff' }}>
                  <option value="intim">Basic (60 GB)</option>
                  <option value="complet">Standard (150 GB)</option>
                  <option value="vis">Premium (200 GB)</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>
                Recomandat de (wedding planner)
                <select value={createForm.referredBy} onChange={(e) => setCreateForm({ ...createForm, referredBy: e.target.value })} style={{ padding: '10px 12px', border: '1px solid var(--color-cream-darker)', borderRadius: '8px', fontSize: '14px', background: '#fff' }}>
                  <option value="">— Niciunul —</option>
                  {planners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({Math.round(Number(p.commission_rate || 0) * 100)}%)</option>
                  ))}
                </select>
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setCreateOpen(false)} className={styles.actionBtn} style={{ background: 'var(--color-cream)', border: '1px solid var(--color-cream-darker)', cursor: 'pointer', padding: '11px 20px', borderRadius: '8px', fontWeight: 600 }}>Anulează</button>
                <button type="submit" disabled={createSaving} className={styles.actionBtn} style={{ background: 'var(--color-violet)', color: '#fff', border: 'none', cursor: 'pointer', padding: '11px 20px', borderRadius: '8px', fontWeight: 600 }}>{createSaving ? 'Se creează...' : 'Creează cont'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
