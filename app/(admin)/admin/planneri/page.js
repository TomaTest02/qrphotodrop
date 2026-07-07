'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from '../conturi/conturi.module.css';

const TIER_LABEL = { intim: 'Basic', complet: 'Standard', vis: 'Premium' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ro-RO') : '—');
const RON = (n) => `${Math.round(Number(n || 0)).toLocaleString('ro-RO')} RON`;
const pct = (rate) => `${Math.round(Number(rate || 0) * 100)}%`;

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
