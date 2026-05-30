'use client';

import { useState, useEffect, use } from 'react';
import styles from '../conturi.module.css';

export default function AdminContPage({ params }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    newPassword: '',
    event_name: '',
    event_date: '',
    location: '',
    couple_names: '',
    package_type: '',
    package_tier: ''
  });

  useEffect(() => {
    loadAccount();
  }, [id]);

  async function loadAccount() {
    try {
      const res = await fetch(`/api/admin/accounts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setFormData({
          email: data.user?.email || '',
          phone: data.user?.phone || '',
          newPassword: '',
          event_name: data.event?.event_name || '',
          event_date: data.event?.event_date || '',
          location: data.event?.location || '',
          couple_names: data.event?.couple_names || '',
          package_type: data.event?.package_type || '',
          package_tier: data.event?.package_tier || ''
        });
      }
    } catch (err) {
      console.error(err);
      setMessage('Eroare la preluarea datelor.');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        phone: formData.phone,
        newPassword: formData.newPassword || undefined,
        eventData: {
          event_name: formData.event_name,
          event_date: formData.event_date,
          location: formData.location,
          couple_names: formData.couple_names,
          package_type: formData.package_type,
          package_tier: formData.package_tier
        }
      };

      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage('Date salvate cu succes!');
        setFormData(prev => ({ ...prev, newPassword: '' })); // clear password field
      } else {
        const errorData = await res.json();
        setMessage(`Eroare: ${errorData.error}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Eroare la salvare.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Se încarcă...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href="/admin/conturi" className={styles.backBtn} style={{ color: 'var(--color-violet)', textDecoration: 'none', marginBottom: '10px', display: 'inline-block', fontWeight: 600 }}>← Înapoi la conturi</a>
        <h1 className={styles.title}>
          Editare Cont
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>
          ID: {id}
        </p>
      </div>

      {message && (
        <div style={{
          padding: '16px',
          background: message.includes('succes') ? '#f0fdf4' : '#fef2f2',
          color: message.includes('succes') ? '#166534' : '#991b1b',
          borderRadius: '8px',
          marginBottom: '24px',
          border: `1px solid ${message.includes('succes') ? '#bbf7d0' : '#fecaca'}`
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* Setări Utilizator */}
        <div className={styles.tableCard} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid #eee', paddingBottom: '12px' }}>Date Utilizator</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Email (Doar vizualizare)</label>
            <input type="email" name="email" value={formData.email} disabled style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: '#f9f9f9', color: '#666' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Telefon</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>Forțează Parolă Nouă</label>
            <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="Lasă gol pentru a nu modifica" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #fca5a5' }} />
            <span style={{ fontSize: '11px', color: '#666' }}>Această acțiune schimbă parola utilizatorului fără verificare prin email.</span>
          </div>
        </div>

        {/* Setări Eveniment */}
        <div className={styles.tableCard} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid #eee', paddingBottom: '12px' }}>Date Eveniment</h3>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Nume Eveniment</label>
              <input type="text" name="event_name" value={formData.event_name} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Dată (YYYY-MM-DD)</label>
              <input type="date" name="event_date" value={formData.event_date} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Locație</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Nume Miri / Sărbătoriți</label>
            <input type="text" name="couple_names" value={formData.couple_names} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Tip Pachet</label>
              <select name="package_type" value={formData.package_type} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: 'white' }}>
                <option value="">Alege...</option>
                <option value="nunta">Nuntă</option>
                <option value="botez">Botez</option>
                <option value="aniversare">Aniversare</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Nivel Pachet</label>
              <select name="package_tier" value={formData.package_tier} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: 'white' }}>
                <option value="">Alege...</option>
                <option value="intim">Intim (Basic)</option>
                <option value="complet">Complet (Standard)</option>
                <option value="vis">Vis (Premium)</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="submit" 
            disabled={saving}
            className={`${styles.actionBtn}`} 
            style={{ 
              background: 'var(--color-violet)', 
              color: 'white', 
              padding: '12px 32px', 
              fontSize: '16px',
              opacity: saving ? 0.7 : 1,
              cursor: 'pointer',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600
            }}>
            {saving ? 'Se salvează...' : 'Salvează modificările'}
          </button>
        </div>

      </form>
    </div>
  );
}
