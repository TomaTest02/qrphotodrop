import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from '@/components/admin/AdminSidebar.module.css';

export const metadata = {
  title: 'Admin — QRPhotoDrop',
};

export default function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
