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
        <a href="/dashboard/evenimentul-meu" className={styles.backLink}>
          ← Înapoi la dashboard
        </a>
      </div>
    </aside>
  );
}
