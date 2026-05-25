import { createClient } from '@/lib/supabase/server';
import styles from './admin.module.css';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Get counts
  const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: pendingUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const { count: activeEvents } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: totalUploads } = await supabase.from('uploads').select('*', { count: 'exact', head: true });

  // Recent orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // Pending requests
  const { data: pendingRequests } = await supabase
    .from('users')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Dashboard Admin
      </h1>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Total Conturi', value: totalUsers || 0, icon: '👥' },
          { label: 'Cereri Noi', value: pendingUsers || 0, icon: '🔔' },
          { label: 'Evenimente Active', value: activeEvents || 0, icon: '📋' },
          { label: 'Total Încărcări', value: totalUploads || 0, icon: '📸' },
        ].map((stat, i) => (
          <div key={i} className={`${styles.card} ${styles.statCard}`}>
            <p className={styles.statIcon}>{stat.icon}</p>
            <p className={styles.statValue}>{stat.value}</p>
            <p className={styles.statLabel}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className={styles.contentGrid}>
        {/* Pending Requests */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Cereri Noi</h3>
            <a href="/admin/conturi" className={styles.cardLink}>Vezi toate →</a>
          </div>
          {(!pendingRequests || pendingRequests.length === 0) ? (
            <p className={styles.emptyText}>Nicio cerere nouă</p>
          ) : (
            <div className={styles.list}>
              {pendingRequests.map((req) => (
                <div key={req.id} className={styles.listItem}>
                  <div>
                    <p className={styles.itemMain}>{req.email}</p>
                    <p className={styles.itemSub}>
                      {new Date(req.created_at).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <span className={styles.statusBadge}>
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Comenzi Recente</h3>
          </div>
          {(!recentOrders || recentOrders.length === 0) ? (
            <p className={styles.emptyText}>Nicio comandă încă</p>
          ) : (
            <div className={styles.list}>
              {recentOrders.map((order) => (
                <div key={order.id} className={styles.listItem}>
                  <div>
                    <p className={styles.itemMain}>{order.package_label || order.package_type}</p>
                    <p className={styles.itemSub}>{order.organizer_email}</p>
                  </div>
                  <span className={styles.price}>
                    {order.amount_total ? (order.amount_total / 100).toFixed(0) : '—'} RON
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
