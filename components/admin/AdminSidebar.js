'use client';

import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

const LINKS = [
  { href: '/admin', icon: '📊', label: 'Dashboard' },
  { href: '/admin/conturi', icon: '👥', label: 'Conturi' },
  { href: '/admin/blog', icon: '✍️', label: 'Blog CMS' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className={styles.sidebar}>
      <a href="/admin" className={styles.logo}>
        QRPhotoDrop <span className={styles.badge}>Admin</span>
      </a>

      <nav className={styles.nav}>
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
          >
            <span className={styles.icon}>{link.icon}</span>
            {link.label}
          </a>
        ))}
      </nav>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.backLink} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Deconectare
        </button>
      </div>
    </aside>
  );
}
