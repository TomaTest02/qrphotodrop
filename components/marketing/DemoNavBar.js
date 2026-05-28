'use client';

import { usePathname } from 'next/navigation';
import { Camera, LayoutDashboard } from 'lucide-react';
import styles from './DemoNavBar.module.css';

export default function DemoNavBar() {
  const pathname = usePathname();

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.badge}>
          <span className={styles.pulse}></span>
          MOD DEMO INTERACTIV
        </div>
        <div className={styles.menu}>
          <a
            href="/upload/DEMO"
            className={`${styles.link} ${pathname?.includes('/upload/DEMO') ? styles.active : ''}`}
          >
            <Camera size={14} strokeWidth={2} />
            1. Perspectivă Invitat
          </a>
          <a
            href="/dashboard/demo"
            className={`${styles.link} ${pathname?.includes('/dashboard/demo') ? styles.active : ''}`}
          >
            <LayoutDashboard size={14} strokeWidth={2} />
            2. Perspectivă Organizator
          </a>
        </div>
      </div>
    </div>
  );
}
