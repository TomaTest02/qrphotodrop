import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from '@/components/admin/AdminSidebar.module.css';

export const metadata = {
  title: 'Admin — QRPhotoDrop',
};

export default async function AdminLayout({ children }) {
  // Defense-in-depth: verificăm rolul de admin AICI, nu doar în middleware (proxy.js).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await createAdminClient()
    .from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
