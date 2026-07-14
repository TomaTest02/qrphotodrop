import { requireActiveAdminPage } from '@/lib/pageAuth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from '@/components/admin/AdminSidebar.module.css';

export const metadata = {
  title: 'Admin — QRPhotoDrop',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  // Defense-in-depth: verificăm rolul de admin AICI, nu doar în middleware (proxy.js).
  await requireActiveAdminPage();

  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
