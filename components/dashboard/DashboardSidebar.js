'use client';

import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './DashboardSidebar.module.css';

const LINKS = [
  { href: '/dashboard/evenimentul-meu', icon: '📋', label: 'Evenimentul meu' },
  { href: '/dashboard/contul-meu', icon: '👤', label: 'Contul meu' },
];

export default function DashboardSidebar({ userEmail }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className={styles.sidebar}>
      <a href="/" className={styles.logo}>QRPhotoDrop</a>

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
        {userEmail && <p className={styles.user}>{userEmail}</p>}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Deconectează-te
        </button>
      </div>
    </aside>
  );
}
