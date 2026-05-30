'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SquaresFour, Users, PenNib, SignOut, Printer } from '@phosphor-icons/react';
import styles from './AdminSidebar.module.css';

const LINKS = [
  { href: '/admin', icon: SquaresFour, label: 'Dashboard' },
  { href: '/admin/conturi', icon: Users, label: 'Conturi' },
  { href: '/admin/printari', icon: Printer, label: 'Printări' },
  { href: '/admin/blog', icon: PenNib, label: 'Blog CMS' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ pendingAccounts: 0, pendingPrints: 0 });

  useEffect(() => {
    fetch('/api/admin/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCounts({ pendingAccounts: data.pendingAccounts, pendingPrints: data.pendingPrints });
        }
      })
      .catch(console.error);
  }, [pathname]);

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
        {LINKS.map((link) => {
          const Icon = link.icon;
          // Determine count based on link
          let badgeCount = 0;
          if (link.href === '/admin/conturi') badgeCount = counts.pendingAccounts || 0;
          if (link.href === '/admin/printari') badgeCount = counts.pendingPrints || 0;

          return (
            <a
              key={link.href}
              href={link.href}
              className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
              style={{ position: 'relative' }}
            >
              <span className={styles.icon}>
                <Icon size={24} weight={pathname === link.href ? "fill" : "regular"} />
              </span>
              {link.label}
              
              {badgeCount > 0 && (
                <span className={styles.notificationBadge}>
                  {badgeCount}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.backLink} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SignOut size={20} weight="regular" />
          Deconectare
        </button>
      </div>
    </aside>
  );
}
