import { requireActiveUserPage } from '@/lib/pageAuth';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import styles from '@/components/dashboard/DashboardSidebar.module.css';

export const metadata = {
  title: 'Dashboard — QRPhotoDrop',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }) {
  const { user } = await requireActiveUserPage();

  return (
    <div style={{ display: 'flex' }}>
      <DashboardSidebar userEmail={user?.email || ''} />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
