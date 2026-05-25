import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import styles from '@/components/dashboard/DashboardSidebar.module.css';

export const metadata = {
  title: 'Dashboard — QRPhotoDrop',
};

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div style={{ display: 'flex' }}>
      <DashboardSidebar userEmail={user?.email || ''} />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
