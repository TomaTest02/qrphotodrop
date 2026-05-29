'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './conturi.module.css';

export default function AdminConturiPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const handleApprove = async (userId) => {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) loadAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Sigur vrei să ștergi acest cont?')) return;
    try {
      await fetch('/api/admin/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      loadAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendOTP = async (userId) => {
    try {
      await fetch('/api/admin/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      alert('OTP trimis!');
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filter === 'all' ? accounts : accounts.filter(a => a.status === filter);

  if (loading) return <div className={styles.loading}>Se încarcă...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Conturi ({filtered.length})
        </h1>
        <div className={styles.filterGroup}>
          {['all', 'pending', 'active', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
            >
              {f === 'all' ? 'Toate' : f === 'pending' ? 'Pending' : f === 'active' ? 'Active' : 'Expirate'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Eveniment</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Creat</th>
              <th className={styles.th}>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((acc) => (
              <tr key={acc.id}>
                <td className={styles.td}>{acc.email}</td>
                <td className={styles.td}>
                  {acc.events?.[0]?.event_name || '—'}
                </td>
                <td className={styles.td}>
                  <span className={
                    acc.status === 'active' ? styles.statusActive : 
                    acc.status === 'pending' ? styles.statusPending : 
                    styles.statusError
                  }>
                    {acc.status || 'pending'}
                  </span>
                </td>
                <td className={styles.td}>
                  {new Date(acc.created_at).toLocaleDateString('ro-RO')}
                </td>
                <td className={styles.td}>
                  <div className={styles.actionsGroup}>
                    {acc.status === 'pending' && (
                      <button className={`${styles.actionBtn} ${styles.btnSuccess}`} onClick={() => handleApprove(acc.id)}>Aprobă</button>
                    )}
                    <button className={`${styles.actionBtn} ${styles.btnNeutral}`} onClick={() => handleSendOTP(acc.id)}>OTP</button>
                    <button className={`${styles.actionBtn} ${styles.btnDanger}`} onClick={() => handleDelete(acc.id)}>Șterge</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className={styles.empty}>Niciun cont găsit</p>
        )}
      </div>
    </div>
  );
}
