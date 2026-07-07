'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from '../conturi/conturi.module.css';

const TIER_LABEL = { intim: 'Basic', complet: 'Standard', vis: 'Premium' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ro-RO') : '—');
const RON = (n) => `${Math.round(Number(n || 0)).toLocaleString('ro-RO')} RON`;
const pct = (rate) => `${Math.round(Number(rate || 0) * 100)}%`;
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const EMPTY_FORM = { name: '', email: '', phone: '', commissionPct: '15', notes: '' };

export default function AdminPlanneriPage() {
  const [planners, setPlanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Detaliu (conturi per planner selectat)
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null); // { planner, accounts }
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal creare / editare
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = creare
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  useEffect(() => { setOrigin(window.location.origin); loadPlanners(); }, []);
  useEffect(() => { if (selectedId) loadDetail(selectedId); else setDetail(null); }, [selectedId]);

  async function loadPlanners() {
    try {
      const res = await fetch('/api/admin/planners');
      if (res.ok) {
        const { planners } = await res.json();
        setPlanners(planners || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadDetail(id) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/planners/${id}`);
      if (res.ok) setDetail(await res.json());
    } catch (err) { console.error(err); }
    finally { setDetailLoading(false); }
  }

  const refLink = (slug) => `${origin}/register/${slug}`;

  const copyLink = async (planner) => {
    try {
      await navigator.clipboard.writeText(refLink(planner.slug));
      setCopiedId(planner.id);
      setTimeout(() => setCopiedId((c) => (c === planner.id ? null : c)), 1800);
    } catch { /* clipboard indisponibil */ }
  };

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setFormErr(''); setModalOpen(true); };
  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name || '', email: p.email || '', phone: p.phone || '', commissionPct: String(Math.round(Number(p.commission_rate || 0) * 100)), notes: p.notes || '' });
    setFormErr('');
    setModalOpen(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true); setFormErr('');
    try {
      const url = editingId ? `/api/admin/planners/${editingId}` : '/api/admin/planners';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        await loadPlanners();
        if (editingId && selectedId === editingId) await loadDetail(editingId);
      } else {
        setFormErr(data.error || 'Eroare.');
      }
    } catch { setFormErr('Eroare de conexiune.'); }
    setSaving(false);
  };

  const toggleActive = async (p) => {
    setBusyId(p.id);
    try {
      await fetch(`/api/admin/planners/${p.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      });
      await loadPlanners();
    } catch (err) { console.error(err); }
    setBusyId(null);
  };

  const deletePlanner = async (p) => {
    if (!confirm(`Ștergi plannerul „${p.name}"? Conturile aduse rămân, dar nu mai sunt atribuite lui.`)) return;
    setBusyId(p.id);
    try {
      await fetch(`/api/admin/planners/${p.id}`, { method: 'DELETE' });
      if (selectedId === p.id) setSelectedId('');
      await loadPlanners();
    } catch (err) { console.error(err); }
    setBusyId(null);
  };

  // ── Agregate de sus ───────────────────────────────────────────
  const totals = useMemo(() => ({
    planners: planners.length,
    accounts: planners.reduce((s, p) => s + (p.accountCount || 0), 0),
    paid: planners.reduce((s, p) => s + (p.paidCount || 0), 0),
    commission: planners.reduce((s, p) => s + (p.commission || 0), 0),
  }), [planners]);

  // Comisionul pe un cont individual (doar dacă e plătit)
  const accCommission = (acc) =>
    acc.payment_status === 'paid'
      ? Math.round(Number(acc.amount_paid || 0) * Number(detail?.planner?.commission_rate || 0))
      : 0;

  // ── Export desfășurător PDF (via print-to-PDF într-o fereastră nouă) ──
  const exportPdf = () => {
    if (!detail) return;
    const p = detail.planner;
    const accs = detail.accounts || [];
    const rate = Number(p.commission_rate || 0);
    const paidAccs = accs.filter((a) => a.payment_status === 'paid');
    const totalRevenue = paidAccs.reduce((s, a) => s + Number(a.amount_paid || 0), 0);
    const totalCommission = Math.round(totalRevenue * rate);
    const now = new Date().toLocaleString('ro-RO');
    const payLabel = (s) => (s === 'paid' ? 'Plătit' : s === 'partial' ? 'Parțial' : 'Neplătit');

    const rows = accs.map((a) => {
      const com = accCommission(a);
      return `<tr>
        <td>${escapeHtml(a.email)}<div class="sub">${escapeHtml(a.phone || '')}</div></td>
        <td>${escapeHtml(a.event_name || '—')}<div class="sub">${escapeHtml(a.event_type || '')} · ${fmtDate(a.event_date)}</div></td>
        <td>${escapeHtml(TIER_LABEL[a.package_tier] || a.package_tier || '—')}</td>
        <td class="num">${a.amount_paid ? RON(a.amount_paid) : '—'}</td>
        <td>${payLabel(a.payment_status)}</td>
        <td class="num">${com ? RON(com) : '—'}</td>
      </tr>`;
    }).join('');

    const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8">
<title>Desfasurator comision - ${escapeHtml(p.name)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1420;margin:32px}
  h1{font-size:22px;margin:0 0 4px}
  .muted{color:#666;font-size:13px;line-height:1.5}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #4a2b6b;padding-bottom:16px;margin-bottom:20px}
  .brand{font-weight:700;color:#4a2b6b;font-size:16px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e5e0ea;vertical-align:top}
  th{background:#f5f2f8;font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:#555}
  td.num,th.num{text-align:right;white-space:nowrap}
  .sub{color:#999;font-size:11px}
  tfoot td{font-weight:700;border-top:2px solid #4a2b6b;border-bottom:none}
  .totals{margin-top:22px;display:flex;gap:16px;flex-wrap:wrap}
  .tot{background:#f5f2f8;border-radius:10px;padding:12px 18px;min-width:130px}
  .tot .l{font-size:11px;text-transform:uppercase;color:#666}
  .tot .v{font-size:20px;font-weight:700;margin-top:2px}
  .big{background:#4a2b6b;color:#fff}.big .l{color:#e5d9f2}
  .note{margin-top:16px;font-size:12px;color:#888}
  @media print{body{margin:12mm}button{display:none}}
</style></head><body>
  <div class="head">
    <div>
      <h1>Desfășurător comision</h1>
      <div class="muted">Wedding planner: <strong>${escapeHtml(p.name)}</strong>${p.email ? ' · ' + escapeHtml(p.email) : ''}${p.phone ? ' · ' + escapeHtml(p.phone) : ''}<br>
      Comision: <strong>${Math.round(rate * 100)}%</strong> din suma încasată · Generat: ${escapeHtml(now)}</div>
    </div>
    <div class="brand">QRPhotoDrop</div>
  </div>
  <table>
    <thead><tr><th>Client</th><th>Eveniment</th><th>Pachet</th><th class="num">Sumă plătită</th><th>Stare plată</th><th class="num">Comision</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">Niciun cont adus.</td></tr>'}</tbody>
    <tfoot><tr><td colspan="3">Total (${accs.length} conturi, ${paidAccs.length} plătite)</td><td class="num">${RON(totalRevenue)}</td><td></td><td class="num">${RON(totalCommission)}</td></tr></tfoot>
  </table>
  <div class="totals">
    <div class="tot"><div class="l">Conturi aduse</div><div class="v">${accs.length}</div></div>
    <div class="tot"><div class="l">Conturi plătite</div><div class="v">${paidAccs.length}</div></div>
    <div class="tot"><div class="l">Total încasat</div><div class="v">${RON(totalRevenue)}</div></div>
    <div class="tot big"><div class="l">Comision total de plată</div><div class="v">${RON(totalCommission)}</div></div>
  </div>
  <p class="note">Comisionul se calculează doar pe conturile marcate „plătit". Document informativ generat automat din QRPhotoDrop.</p>
  <button onclick="window.print()" style="margin-top:20px;padding:10px 18px;font-size:14px;border:none;border-radius:8px;background:#4a2b6b;color:#fff;cursor:pointer">Printează / Salvează PDF</button>
  <script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) { alert('Permite ferestrele pop-up pentru a exporta PDF-ul.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  if (loading) return <div className={styles.loading}>Se încarcă...</div>;

  const cards = [
    { label: 'Wedding planneri', value: totals.planners },
    { label: 'Conturi aduse', value: totals.accounts },
    { label: 'Conturi plătite', value: totals.paid, accent: '#166534' },
    { label: 'Comision total de plată', value: RON(totals.commission), accent: '#b45309' },
  ];

  return (
    <div className={styles.container} style={{ maxWidth: '1500px' }}>
      {/* Agregate */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid var(--color-cream-darker)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>{c.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: c.accent || 'var(--color-text)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className={styles.header} style={{ flexWrap: 'wrap', gap: '12px' }}>
        <h1 className={styles.title}>Wedding Planneri ({planners.length})</h1>
        <button onClick={openCreate} className={styles.actionBtn} style={{ background: 'var(--color-violet)', color: '#fff', border: 'none', cursor: 'pointer', padding: '9px 16px', borderRadius: '8px', fontWeight: 600 }}>
          + Adaugă planner
        </button>
      </div>

      {/* Tabel planneri */}
      <div className={styles.tableCard} style={{ overflowX: 'auto', marginBottom: '32px' }}>
        <table className={styles.table} style={{ minWidth: '1000px' }}>
          <thead>
            <tr>
              <th className={styles.th}>Planner</th>
              <th className={styles.th}>Link de recomandare</th>
              <th className={styles.th}>Conturi</th>
              <th className={styles.th}>Plătite</th>
              <th className={styles.th}>Venit încasat</th>
              <th className={styles.th}>Comision</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {planners.map((p) => {
              const busy = busyId === p.id;
              return (
                <tr key={p.id} style={{ opacity: busy ? 0.5 : 1 }}>
                  <td className={styles.td}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{p.email || p.phone || '—'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{pct(p.commission_rate)} comision</div>
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ fontSize: '12px', background: 'var(--color-cream)', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        /register/{p.slug}
                      </code>
                      <button onClick={() => copyLink(p)} className={styles.actionBtn} style={{ background: 'var(--color-cream)', border: '1px solid var(--color-cream-darker)', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {copiedId === p.id ? '✓ Copiat' : '⧉ Copiază'}
                      </button>
                    </div>
                  </td>
                  <td className={styles.td} style={{ fontWeight: 600 }}>{p.accountCount}</td>
                  <td className={styles.td}>{p.paidCount}</td>
                  <td className={styles.td}>{RON(p.revenue)}</td>
                  <td className={styles.td} style={{ fontWeight: 700, color: '#b45309' }}>{RON(p.commission)}</td>
                  <td className={styles.td}>
                    <span className={p.active ? styles.statusActive : styles.statusError}>{p.active ? 'activ' : 'inactiv'}</span>
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => setSelectedId(p.id)} className={styles.actionBtn} style={{ background: 'var(--color-violet-pale)', color: 'var(--color-violet)', border: 'none', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>Vezi conturi</button>
                      <button onClick={() => openEdit(p)} className={styles.actionBtn} style={{ background: 'var(--color-cream)', border: '1px solid var(--color-cream-darker)', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '12px' }}>✎</button>
                      <button onClick={() => toggleActive(p)} className={styles.actionBtn} style={{ background: 'var(--color-cream)', border: '1px solid var(--color-cream-darker)', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '12px' }}>{p.active ? '⏸' : '▶'}</button>
                      <button onClick={() => deletePlanner(p)} className={styles.actionBtn} style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '12px' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {planners.length === 0 && <p className={styles.empty}>Niciun wedding planner încă. Apasă „Adaugă planner".</p>}
      </div>

      {/* Detaliu: conturi per planner selectat */}
      <div className={styles.tableCard} style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <h2 className={styles.title} style={{ fontSize: '20px', margin: 0 }}>Conturi per planner</h2>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--color-cream-darker)', fontSize: '14px', background: '#fff', cursor: 'pointer', minWidth: '240px' }}
          >
            <option value="">— Selectează un planner —</option>
            {planners.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.accountCount} conturi)</option>
            ))}
          </select>
          {detail && (
            <button onClick={exportPdf} className={styles.actionBtn} style={{ background: '#3e405b', color: '#fff', border: 'none', cursor: 'pointer', padding: '9px 14px', borderRadius: '8px', fontWeight: 600 }}>
              ⬇ Export PDF (desfășurător)
            </button>
          )}
        </div>

        {!selectedId ? (
          <p className={styles.emptyText}>Alege un planner din listă ca să vezi conturile aduse și comisionul.</p>
        ) : detailLoading ? (
          <p className={styles.emptyText}>Se încarcă...</p>
        ) : detail && detail.accounts.length > 0 ? (
          <>
            <table className={styles.table} style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th className={styles.th}>Client</th>
                  <th className={styles.th}>Eveniment</th>
                  <th className={styles.th}>Pachet</th>
                  <th className={styles.th}>Sumă plătită</th>
                  <th className={styles.th}>Stare plată</th>
                  <th className={styles.th}>Comision ({pct(detail.planner.commission_rate)})</th>
                  <th className={styles.th}>Înregistrat</th>
                </tr>
              </thead>
              <tbody>
                {detail.accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td className={styles.td}>
                      <div style={{ fontWeight: 600 }}>{acc.email}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{acc.phone || '—'}</div>
                    </td>
                    <td className={styles.td}>
                      <div>{acc.event_name || acc.requested_event_name || '—'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{acc.event_type || '—'} · {fmtDate(acc.event_date)}</div>
                    </td>
                    <td className={styles.td}>{TIER_LABEL[acc.package_tier] || acc.package_tier || '—'}</td>
                    <td className={styles.td}>{acc.amount_paid ? RON(acc.amount_paid) : '—'}</td>
                    <td className={styles.td}>
                      <span style={{
                        padding: '3px 9px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                        background: acc.payment_status === 'paid' ? '#dcfce7' : acc.payment_status === 'partial' ? '#fef9c3' : '#fee2e2',
                        color: acc.payment_status === 'paid' ? '#166534' : acc.payment_status === 'partial' ? '#854d0e' : '#991b1b',
                      }}>
                        {acc.payment_status === 'paid' ? '✓ Plătit' : acc.payment_status === 'partial' ? 'Parțial' : 'Neplătit'}
                      </span>
                    </td>
                    <td className={styles.td} style={{ fontWeight: 700, color: accCommission(acc) ? '#b45309' : 'var(--color-text-muted)' }}>
                      {accCommission(acc) ? RON(accCommission(acc)) : '—'}
                    </td>
                    <td className={styles.td} style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{fmtDate(acc.created_at)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-cream-darker)', fontWeight: 700 }}>
                  <td className={styles.td} colSpan={3}>Total ({detail.accounts.length} conturi, {detail.accounts.filter((a) => a.payment_status === 'paid').length} plătite)</td>
                  <td className={styles.td}>{RON(detail.accounts.reduce((s, a) => s + (a.payment_status === 'paid' ? Number(a.amount_paid || 0) : 0), 0))}</td>
                  <td className={styles.td}></td>
                  <td className={styles.td} style={{ color: '#b45309' }}>{RON(detail.accounts.reduce((s, a) => s + accCommission(a), 0))}</td>
                  <td className={styles.td}></td>
                </tr>
              </tfoot>
            </table>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
              Comisionul se calculează doar pe conturile marcate <strong>plătit</strong> (din Conturi → Marchează plătit). {pct(detail.planner.commission_rate)} din suma încasată.
            </p>
          </>
        ) : (
          <p className={styles.emptyText}>Acest planner nu a adus încă niciun cont.</p>
        )}
      </div>

      {/* Modal creare/editare planner */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(20,16,24,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', marginBottom: '4px', color: 'var(--color-text)' }}>
              {editingId ? 'Editează planner' : 'Adaugă wedding planner'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              {editingId ? 'Link-ul de recomandare rămâne neschimbat.' : 'Se generează automat un link de recomandare din nume.'}
            </p>
            {formErr && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '11px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>{formErr}</div>}
            <form onSubmit={submitForm} style={{ display: 'grid', gap: '14px' }}>
              {[
                { k: 'name', l: 'Nume planner', type: 'text', required: true, ph: 'Ex: Mariana Events' },
                { k: 'email', l: 'Email (opțional)', type: 'email' },
                { k: 'phone', l: 'Telefon (opțional)', type: 'tel' },
                { k: 'commissionPct', l: 'Comision (%)', type: 'number' },
                { k: 'notes', l: 'Notițe (opțional)', type: 'text' },
              ].map((f) => (
                <label key={f.k} style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  {f.l}
                  <input
                    type={f.type} required={f.required}
                    min={f.type === 'number' ? 0 : undefined} max={f.type === 'number' ? 100 : undefined} step={f.type === 'number' ? 1 : undefined}
                    placeholder={f.ph}
                    value={form[f.k]}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    style={{ padding: '10px 12px', border: '1px solid var(--color-cream-darker)', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-sans)' }}
                  />
                </label>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setModalOpen(false)} className={styles.actionBtn} style={{ background: 'var(--color-cream)', border: '1px solid var(--color-cream-darker)', cursor: 'pointer', padding: '11px 20px', borderRadius: '8px', fontWeight: 600 }}>Anulează</button>
                <button type="submit" disabled={saving} className={styles.actionBtn} style={{ background: 'var(--color-violet)', color: '#fff', border: 'none', cursor: 'pointer', padding: '11px 20px', borderRadius: '8px', fontWeight: 600 }}>{saving ? 'Se salvează...' : (editingId ? 'Salvează' : 'Adaugă')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
