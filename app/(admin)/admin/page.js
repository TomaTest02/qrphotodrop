import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

const TIER_MONTHS = { intim: 1, complet: 2, vis: 3 };
const GB = 1024 * 1024 * 1024;
const TYPE_LABEL = { nunta: 'Nuntă', botez: 'Botez', aniversare: 'Aniversare', corporate: 'Corporate' };

function expiryOf(r) {
  if (!r.event_id) return null;
  if (r.expires_at) return new Date(r.expires_at);
  if (!r.event_date) return null;
  const d = new Date(r.event_date);
  d.setMonth(d.getMonth() + (TIER_MONTHS[r.package_tier] || 3));
  return d;
}

export default async function AdminDashboard() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Toate conturile cu agregate (un singur query la view)
  const { data: rows = [] } = await supabase.from('admin_account_overview').select('*');
  const accounts = rows || [];

  // Cereri de printare nerezolvate
  const { data: printRequests } = await supabase
    .from('contact_messages')
    .select('*')
    .eq('event_type', 'Comandă Printare')
    .order('created_at', { ascending: false })
    .limit(5);

  // ── Metrici ───────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalUsers = accounts.length;
  const pending = accounts.filter((a) => a.status === 'pending').length;
  const active = accounts.filter((a) => a.status === 'active').length;
  const suspended = accounts.filter((a) => a.status === 'suspended').length;

  const revenue = accounts.reduce((s, a) => s + (a.amount_paid || 0), 0);
  const revenueMonth = accounts
    .filter((a) => a.paid_at && new Date(a.paid_at) >= monthStart)
    .reduce((s, a) => s + (a.amount_paid || 0), 0);
  const unpaidActive = accounts.filter((a) => a.event_id && a.payment_status !== 'paid').length;

  const storageTotal = accounts.reduce((s, a) => s + Number(a.storage_used || 0), 0);
  const totalPhotos = accounts.reduce((s, a) => s + Number(a.photo_count || 0), 0);
  const totalVideos = accounts.reduce((s, a) => s + Number(a.video_count || 0), 0);
  const activeEvents = accounts.filter((a) => a.event_id && a.event_status === 'active').length;

  const expiringSoon = accounts.filter((a) => {
    const e = expiryOf(a);
    if (!e) return false;
    const dl = Math.ceil((e.getTime() - now.getTime()) / 86400000);
    return dl >= 0 && dl <= 30;
  });

  const byType = ['nunta', 'botez', 'aniversare', 'corporate'].map((t) => ({
    type: t,
    count: accounts.filter((a) => a.event_type === t).length,
  }));

  const recentSignups = [...accounts]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // ── Serii pe ultimele 6 luni (venituri + conturi noi) ─────────
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString('ro-RO', { month: 'short' }), y: d.getFullYear(), m: d.getMonth() });
  }
  const revenueByMonth = months.map((mm) => accounts
    .filter((a) => a.paid_at && new Date(a.paid_at).getFullYear() === mm.y && new Date(a.paid_at).getMonth() === mm.m)
    .reduce((s, a) => s + (a.amount_paid || 0), 0));
  const signupsByMonth = months.map((mm) => accounts
    .filter((a) => { const c = new Date(a.created_at); return c.getFullYear() === mm.y && c.getMonth() === mm.m; }).length);
  const maxRev = Math.max(1, ...revenueByMonth);
  const maxSignups = Math.max(1, ...signupsByMonth);
  const revLastM = revenueByMonth[4] || 0;
  const revTrend = revLastM > 0 ? Math.round(((revenueByMonth[5] - revLastM) / revLastM) * 100) : (revenueByMonth[5] > 0 ? 100 : 0);

  const stats = [
    { label: 'Venituri totale', value: `${revenue.toLocaleString('ro-RO')} RON`, icon: '💰' },
    { label: 'Venituri luna asta', value: `${revenueMonth.toLocaleString('ro-RO')} RON`, icon: '📈' },
    { label: 'Conturi active', value: active, icon: '✅' },
    { label: 'Cereri noi (pending)', value: pending, icon: '🔔' },
    { label: 'Neplătite', value: unpaidActive, icon: '⚠️' },
    { label: 'Expiră ≤30 zile', value: expiringSoon.length, icon: '⏳' },
    { label: 'Stocare folosită', value: `${(storageTotal / GB).toFixed(1)} GB`, icon: '☁️' },
    { label: 'Total fișiere', value: totalPhotos + totalVideos, icon: '📸' },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard Admin</h1>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={`${styles.card} ${styles.statCard}`}>
            <p className={styles.statIcon}>{stat.icon}</p>
            <p className={styles.statValue}>{stat.value}</p>
            <p className={styles.statLabel}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Grafice pe 6 luni */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', margin: '24px 0' }}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Venituri · ultimele 6 luni</h3>
            <span style={{ fontSize: '13px', fontWeight: 700, color: revTrend >= 0 ? '#166534' : '#991b1b' }}>
              {revTrend >= 0 ? '↑' : '↓'} {Math.abs(revTrend)}% vs luna trecută
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '150px', paddingTop: '12px' }}>
            {revenueByMonth.map((v, i) => (
              <div key={months[i].label + i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>{v > 0 ? v.toLocaleString('ro-RO') : ''}</span>
                <div style={{ width: '100%', maxWidth: '38px', height: `${Math.max(4, (v / maxRev) * 110)}px`, background: 'linear-gradient(180deg, #bc965c, #a8854c)', borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease' }} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{months[i].label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Conturi noi · ultimele 6 luni</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '150px', paddingTop: '12px' }}>
            {signupsByMonth.map((v, i) => (
              <div key={months[i].label + i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>{v > 0 ? v : ''}</span>
                <div style={{ width: '100%', maxWidth: '38px', height: `${Math.max(4, (v / maxSignups) * 110)}px`, background: 'linear-gradient(180deg, var(--color-violet), #4a2b6b)', borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease' }} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{months[i].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Conturi care expiră curând */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Expiră în ≤30 zile</h3>
            <a href="/admin/conturi" className={styles.cardLink}>Vezi toate →</a>
          </div>
          {expiringSoon.length === 0 ? (
            <p className={styles.emptyText}>Niciun cont nu expiră curând</p>
          ) : (
            <div className={styles.list}>
              {expiringSoon.slice(0, 6).map((a) => {
                const e = expiryOf(a);
                const dl = Math.ceil((e.getTime() - now.getTime()) / 86400000);
                return (
                  <div key={a.id} className={styles.listItem}>
                    <div>
                      <p className={styles.itemMain}>{a.event_name || a.email}</p>
                      <p className={styles.itemSub}>{a.email}</p>
                    </div>
                    <span className={styles.statusBadge} style={{ background: dl <= 7 ? '#fee2e2' : '#fef3c7', color: dl <= 7 ? '#991b1b' : '#92400e' }}>
                      {dl} zile
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Înregistrări recente */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Conturi recente</h3>
            <a href="/admin/conturi" className={styles.cardLink}>Vezi toate →</a>
          </div>
          {recentSignups.length === 0 ? (
            <p className={styles.emptyText}>Niciun cont încă</p>
          ) : (
            <div className={styles.list}>
              {recentSignups.map((a) => (
                <div key={a.id} className={styles.listItem}>
                  <div>
                    <p className={styles.itemMain}>{a.email}</p>
                    <p className={styles.itemSub}>{new Date(a.created_at).toLocaleDateString('ro-RO')}</p>
                  </div>
                  <span className={styles.statusBadge} style={a.status === 'active' ? { background: '#dcfce7', color: '#166534' } : a.status === 'suspended' ? { background: '#fee2e2', color: '#991b1b' } : {}}>
                    {a.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Defalcare pe tip eveniment */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Evenimente pe tip</h3>
          </div>
          <div className={styles.list}>
            {byType.map((t) => (
              <div key={t.type} className={styles.listItem}>
                <p className={styles.itemMain}>{TYPE_LABEL[t.type]}</p>
                <span className={styles.price}>{t.count}</span>
              </div>
            ))}
            <div className={styles.listItem} style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
              <p className={styles.itemMain} style={{ fontWeight: 700 }}>Total evenimente active</p>
              <span className={styles.price}>{activeEvents}</span>
            </div>
          </div>
        </div>

        {/* Cereri printare */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Cereri printare cartonașe</h3>
            <a href="/admin/printari" className={styles.cardLink}>Vezi toate →</a>
          </div>
          {(!printRequests || printRequests.length === 0) ? (
            <p className={styles.emptyText}>Nicio cerere de printare</p>
          ) : (
            <div className={styles.list}>
              {printRequests.map((req) => {
                const lines = req.message.split('\n');
                const eventLine = lines.find((l) => l.startsWith('Eveniment:')) || '';
                const designLine = lines.find((l) => l.startsWith('Design:')) || '';
                return (
                  <div key={req.id} className={styles.listItem} style={{ alignItems: 'flex-start' }}>
                    <div>
                      <p className={styles.itemMain}>{req.email}</p>
                      <p className={styles.itemSub} style={{ marginTop: '4px' }}>{eventLine}<br />{designLine}</p>
                    </div>
                    <span className={styles.statusBadge} style={{ background: 'var(--color-violet-pale)', color: 'var(--color-violet)' }}>Nouă</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sumar conturi pe status */}
      <div style={{ display: 'flex', gap: '24px', marginTop: '24px', flexWrap: 'wrap', color: 'var(--color-text-muted)', fontSize: '14px' }}>
        <span>Total conturi: <strong>{totalUsers}</strong></span>
        <span>Active: <strong>{active}</strong></span>
        <span>Pending: <strong>{pending}</strong></span>
        <span>Suspendate: <strong>{suspended}</strong></span>
        <span>Foto: <strong>{totalPhotos}</strong> · Video: <strong>{totalVideos}</strong></span>
      </div>
    </div>
  );
}
