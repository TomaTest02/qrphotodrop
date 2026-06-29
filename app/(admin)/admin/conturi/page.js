'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './conturi.module.css';

// ── Constante business ──────────────────────────────────────────
const TIER_LABEL = { intim: 'Basic', complet: 'Standard', vis: 'Premium' };
const TIER_MONTHS = { intim: 1, complet: 2, vis: 3 };
const PACKAGE_PRICES = {
  nunta: { intim: 279, complet: 369, vis: 559 },
  botez: { intim: 249, complet: 329, vis: 489 },
  aniversare: { intim: 249, complet: 329, vis: 489 },
  corporate: { intim: 329, complet: 459, vis: 699 },
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

  useEffect(() => { loadAccounts(); }, []);

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
    const headers = ['Email', 'Telefon', 'Eveniment', 'Tip', 'Data eveniment', 'Cod', 'Pachet', 'Status', 'Plata (RON)', 'Stare plata', 'Stocare folosita (GB)', 'Limita (GB)', 'Poze', 'Clipuri', 'Urari', 'RSVP', 'Expira', 'Creat'];
    const rows = filtered.map((a) => [
      a.email, a.phone || '', a.event_name || '', a.event_type || '', fmtDate(a.event_date), a.event_code || '',
      TIER_LABEL[a.package_tier] || '', a.status || '', a.amount_paid || 0, a.payment_status || 'unpaid',
      fmtGB(a.storage_used), a.max_storage_bytes ? Math.round(a.max_storage_bytes / GB) : '',
      a.photo_count, a.video_count, a.wish_count, a.rsvp_count, fmtDate(getExpiry(a)), fmtDate(a.created_at),
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
    <div className={styles.container}>
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
                    <div style={{ fontWeight: 600 }}>{acc.email}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{acc.phone || 'fără telefon'}</div>
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
                    ) : <span style={{ color: 'var(--color-text-muted)' }}>— neconfigurat</span>}
                  </td>
                  {/* Pachet */}
                  <td className={styles.td}>
                    {acc.package_tier ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{TIER_LABEL[acc.package_tier] || acc.package_tier}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{packagePrice(acc)} RON</div>
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
                      💌 {acc.wish_count} · ✓ {acc.guests_attending}/{acc.rsvp_count} RSVP
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
                    <div className={styles.actionsGroup} style={{ flexWrap: 'wrap', gap: '4px' }}>
                      {acc.status === 'pending' && (
                        <button className={`${styles.actionBtn} ${styles.btnSuccess}`} disabled={busy} onClick={() => handleApprove(acc.id)}>Aprobă</button>
                      )}
                      {acc.status === 'active' && (
                        <button className={styles.actionBtn} disabled={busy} onClick={() => handleSetStatus(acc.id, 'suspended')} style={{ background: '#fef3c7', color: '#92400e' }}>Suspendă</button>
                      )}
                      {acc.status === 'suspended' && (
                        <button className={`${styles.actionBtn} ${styles.btnSuccess}`} disabled={busy} onClick={() => handleSetStatus(acc.id, 'active')}>Reactivează</button>
                      )}
                      {acc.event_id && acc.payment_status !== 'paid' && (
                        <button className={styles.actionBtn} disabled={busy} onClick={() => handleMarkPaid(acc)} style={{ background: '#dcfce7', color: '#166534' }}>Plătit ✓</button>
                      )}
                      {acc.event_code && (
                        <a href={`/upload/${acc.event_code}`} target="_blank" rel="noreferrer" className={styles.actionBtn} style={{ background: 'var(--color-cream)', textDecoration: 'none', color: 'var(--color-text)' }}>Vezi</a>
                      )}
                      <button className={`${styles.actionBtn} ${styles.btnNeutral}`} disabled={busy} onClick={() => handleSendOTP(acc.id)}>OTP</button>
                      <a href={`/admin/conturi/${acc.id}`} className={styles.actionBtn} style={{ background: '#3e405b', color: 'white', textDecoration: 'none' }}>Editează</a>
                      <button className={`${styles.actionBtn} ${styles.btnDanger}`} disabled={busy} onClick={() => handleDelete(acc.id)}>Șterge</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={styles.empty}>Niciun cont găsit</p>}
      </div>
    </div>
  );
}
