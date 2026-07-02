'use client';

import { useState, useEffect } from 'react';
import DemoNavBar from '@/components/marketing/DemoNavBar';
import styles from './admin-demo.module.css';

const DEFAULT_ACCOUNTS = [
  { id: 'acc-1', email: 'wedding-planner@gmail.com', status: 'active', event_code: 'NUNTA2026', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },
  { id: 'acc-2', email: 'botez.lux@yahoo.com', status: 'active', event_code: 'BOTEZLUX', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString() },
  { id: 'acc-3', email: 'aniversare.popescu@gmail.com', status: 'blocked', event_code: 'ANIV50', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString() }
];

const DEFAULT_REQUESTS = [
  { id: 'req-1', email: 'mihai.popescu@gmail.com', status: 'pending', created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString() }, // 90 mins ago
  { id: 'req-2', email: 'event.planner.ro@gmail.com', status: 'pending', created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() } // 12 hours ago
];

const DEFAULT_BLOGS = [
  { id: 'blog-1', title: 'Cum să aduni toate pozele de la nuntă într-un singur loc', slug: 'adunare-poze-nunta', excerpt: 'Află cum codurile QR pe mese pot înlocui aparatele foto de unică folosință și gruprile de WhatsApp obositoare.', created_at: new Date().toISOString() }
];

export default function AdminDemoDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, newRequests: 0, activeEvents: 0, totalUploads: 0 });
  const [requests, setRequests] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [supportLogs, setSupportLogs] = useState([]);
  const [approvedAccountInfo, setApprovedAccountInfo] = useState(null); // welcome message info
  const [generatedOtp, setGeneratedOtp] = useState(null); // OTP notification
  
  // Blog CMS Form State
  const [blogTitle, setBlogTitle] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogSuccess, setBlogSuccess] = useState(false);

  useEffect(() => {
    // Load databases from localStorage or initialize with defaults
    const storedAccounts = localStorage.getItem('qrphotodrop_demo_accounts');
    let currentAccounts = [];
    if (!storedAccounts) {
      localStorage.setItem('qrphotodrop_demo_accounts', JSON.stringify(DEFAULT_ACCOUNTS));
      currentAccounts = DEFAULT_ACCOUNTS;
    } else {
      currentAccounts = JSON.parse(storedAccounts);
    }
    setAccounts(currentAccounts);

    const storedRequests = localStorage.getItem('qrphotodrop_demo_requests');
    let currentRequests = [];
    if (!storedRequests) {
      localStorage.setItem('qrphotodrop_demo_requests', JSON.stringify(DEFAULT_REQUESTS));
      currentRequests = DEFAULT_REQUESTS;
    } else {
      currentRequests = JSON.parse(storedRequests);
    }
    setRequests(currentRequests);

    const storedBlogs = localStorage.getItem('qrphotodrop_demo_blogs');
    let currentBlogs = [];
    if (!storedBlogs) {
      localStorage.setItem('qrphotodrop_demo_blogs', JSON.stringify(DEFAULT_BLOGS));
      currentBlogs = DEFAULT_BLOGS;
    } else {
      currentBlogs = JSON.parse(storedBlogs);
    }
    setBlogs(currentBlogs);

    const storedSupport = localStorage.getItem('qrphotodrop_demo_support_logs');
    const currentSupport = storedSupport ? JSON.parse(storedSupport) : [];
    setSupportLogs(currentSupport);

    // Calculate dynamic stats
    const uploadsCount = JSON.parse(localStorage.getItem('qrphotodrop_demo_uploads') || '[]').length;
    setStats({
      totalUsers: currentAccounts.length,
      newRequests: currentRequests.length,
      activeEvents: currentAccounts.filter(a => a.status === 'active').length + 1, // +1 for the main DEMO event
      totalUploads: uploadsCount || 3
    });
  }, []);

  const handleApprove = (reqId, email) => {
    // Generate random password
    const mockPassword = 'ParolaDemo' + Math.floor(1000 + Math.random() * 9000);
    const mockCode = 'EVENT' + Math.floor(100 + Math.random() * 900);

    // Add to accounts list
    const updatedAccounts = [...accounts, {
      id: 'acc-' + Date.now(),
      email,
      status: 'active',
      event_code: mockCode,
      created_at: new Date().toISOString()
    }];
    setAccounts(updatedAccounts);
    localStorage.setItem('qrphotodrop_demo_accounts', JSON.stringify(updatedAccounts));

    // Remove from pending requests
    const updatedRequests = requests.filter(r => r.id !== reqId);
    setRequests(updatedRequests);
    localStorage.setItem('qrphotodrop_demo_requests', JSON.stringify(updatedRequests));

    // Trigger welcome details popup
    setApprovedAccountInfo({
      email,
      password: mockPassword,
      code: mockCode
    });

    // Update stats
    setStats(prev => ({
      ...prev,
      totalUsers: updatedAccounts.length,
      newRequests: updatedRequests.length,
      activeEvents: prev.activeEvents + 1
    }));
  };

  const handleOtp = (email) => {
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString().replace(/(\d{3})(\d{3})/, '$1 $2');
    setGeneratedOtp({ email, otp: mockOtp });
  };

  const handleToggleBlock = (accId) => {
    const updated = accounts.map(a => {
      if (a.id === accId) {
        return { ...a, status: a.status === 'active' ? 'blocked' : 'active' };
      }
      return a;
    });
    setAccounts(updated);
    localStorage.setItem('qrphotodrop_demo_accounts', JSON.stringify(updated));
  };

  const handleDeleteAccount = (accId) => {
    if (!confirm('Sigur dorești să ștergi definitiv acest cont?')) return;
    const updated = accounts.filter(a => a.id !== accId);
    setAccounts(updated);
    localStorage.setItem('qrphotodrop_demo_accounts', JSON.stringify(updated));
    setStats(prev => ({ ...prev, totalUsers: updated.length }));
  };

  const handleAddBlog = (e) => {
    e.preventDefault();
    if (!blogTitle || !blogExcerpt) return;

    const newBlog = {
      id: 'blog-' + Date.now(),
      title: blogTitle,
      slug: blogSlug || blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      excerpt: blogExcerpt,
      created_at: new Date().toISOString()
    };

    const updated = [newBlog, ...blogs];
    setBlogs(updated);
    localStorage.setItem('qrphotodrop_demo_blogs', JSON.stringify(updated));

    // Reset CMS form
    setBlogTitle('');
    setBlogSlug('');
    setBlogExcerpt('');
    setBlogSuccess(true);
    setTimeout(() => setBlogSuccess(false), 4000);
  };

  const handleDeleteBlog = (blogId) => {
    const updated = blogs.filter(b => b.id !== blogId);
    setBlogs(updated);
    localStorage.setItem('qrphotodrop_demo_blogs', JSON.stringify(updated));
  };

  return (
    <>
      <DemoNavBar />
      <div className={styles.wrapper}>
        <div className={styles.container}>
          
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.eyebrow}>Panou Administrator SaaS</span>
            <h1 className={styles.title}>Control Center Admin 👑</h1>
            <p className={styles.subtitle}>
              Monitorizează platforma, aprobă conturi, emite coduri OTP temporare și postează pe blog.
            </p>
          </div>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            {[
              { label: 'Total Conturi', value: stats.totalUsers, icon: '👥' },
              { label: 'Cereri Noi', value: stats.newRequests, icon: '🔔' },
              { label: 'Evenimente Active', value: stats.activeEvents, icon: '📋' },
              { label: 'Total Încărcări', value: stats.totalUploads, icon: '📸' }
            ].map((stat, i) => (
              <div key={i} className={styles.statCard}>
                <span className={styles.statIcon}>{stat.icon}</span>
                <div>
                  <p className={styles.statValue}>{stat.value}</p>
                  <p className={styles.statLabel}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic welcome message block after account approval */}
          {approvedAccountInfo && (
            <div className={styles.welcomeBanner}>
              <h3 className={styles.welcomeHeading}>✓ Cont Autogenerat cu succes!</h3>
              <p className={styles.welcomeDesc}>
                Copiază și trimite următorul mesaj organizatorului pe WhatsApp sau Email:
              </p>
              <div className={styles.welcomeMsgBox}>
                <code>
                  {`Salut! Contul tău a fost creat cu succes pe QRPhotoDrop. Te poți loga pe qrphotodrop.com/login cu emailul ${approvedAccountInfo.email} și parola temporară ${approvedAccountInfo.password}. La prima logare, vei fi solicitat să îți adaugi numărul de telefon și să îți schimbi parola temporară pentru securitate. Codul tău QR și linkul de upload sunt active!`}
                </code>
              </div>
              <button onClick={() => setApprovedAccountInfo(null)} className={styles.welcomeCloseBtn}>
                Închide notificarea
              </button>
            </div>
          )}

          {/* Dynamic OTP notification block */}
          {generatedOtp && (
            <div className={styles.otpBanner}>
              <h3 className={styles.otpHeading}>🔑 Cod OTP Generat</h3>
              <p className={styles.otpDesc}>
                Codul de resetare o singură dată (One Time Password) pentru <strong>{generatedOtp.email}</strong> este:
              </p>
              <div className={styles.otpCode}>
                {generatedOtp.otp}
              </div>
              <p className={styles.otpHelp}>
                Trimite acest cod utilizatorului. Când îl introduce pe pagina de logare, va fi redirecționat automat să își reseteze parola.
              </p>
              <button onClick={() => setGeneratedOtp(null)} className={styles.otpCloseBtn}>
                Închide
              </button>
            </div>
          )}

          {/* Main Grid: Left column handles operations, Right column handles CMS & logs */}
          <div className={styles.mainGrid}>
            
            {/* LEFT COLUMN: Operations (Requests, Accounts) */}
            <div className={styles.colLeft}>
              
              {/* Requests Card */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Cereri înregistrare conturi organizatori</h3>
                <p className={styles.cardDesc}>
                  Organizatorii care au introdus emailul pe site-ul de prezentare pentru activare.
                </p>

                {requests.length === 0 ? (
                  <p className={styles.emptyText}>Nicio cerere în așteptare.</p>
                ) : (
                  <div className={styles.requestList}>
                    {requests.map((req) => (
                      <div key={req.id} className={styles.requestItem}>
                        <div className={styles.requestInfo}>
                          <span className={styles.requestEmail}>{req.email}</span>
                          <span className={styles.requestDate}>
                            Introdus la: {new Date(req.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleApprove(req.id, req.email)}
                          className={styles.approveBtn}
                        >
                          Aprobă & Generează cont ✓
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Accounts Card */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Conturi Organizatori Active</h3>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Email Organizator</th>
                        <th>Status</th>
                        <th>Cod QR</th>
                        <th>Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Hardcoded main DEMO account row to represent our dashboard demo */}
                      <tr className={styles.demoAccountRow}>
                        <td>
                          <strong>demo@qrphotodrop.com</strong>
                          <span className={styles.badgeDemo}>DEMO PORTAL</span>
                        </td>
                        <td><span className={styles.statusActive}>Active</span></td>
                        <td><code>DEMO</code></td>
                        <td>
                          <button onClick={() => handleOtp('demo@qrphotodrop.com')} className={styles.actionBtn}>
                            🔑 OTP
                          </button>
                        </td>
                      </tr>
                      {/* Dynamic accounts from localStorage */}
                      {accounts.map((acc) => (
                        <tr key={acc.id}>
                          <td>{acc.email}</td>
                          <td>
                            <span className={acc.status === 'active' ? styles.statusActive : styles.statusBlocked}>
                              {acc.status === 'active' ? 'Active' : 'Blocked'}
                            </span>
                          </td>
                          <td><code>{acc.event_code}</code></td>
                          <td>
                            <div className={styles.actionGroup}>
                              <button onClick={() => handleOtp(acc.email)} className={styles.actionBtn} title="Generează parolă temporară">
                                🔑 OTP
                              </button>
                              <button onClick={() => handleToggleBlock(acc.id)} className={styles.actionBtn} style={{ color: '#d97706' }}>
                                {acc.status === 'active' ? 'Block' : 'Unblock'}
                              </button>
                              <button onClick={() => handleDeleteAccount(acc.id)} className={styles.actionBtn} style={{ color: '#ef4444' }}>
                                Șterge
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Support logs & CMS Blog */}
            <div className={styles.colRight}>
              
              {/* Support Tickets logs */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Mesaje Suport primite de la Organizatori</h3>
                <p className={styles.cardDesc}>
                  Solicitări trimise prin formularul din dashboard sau cereri de printare cartonașe QR.
                </p>

                {supportLogs.length === 0 ? (
                  <p className={styles.emptyText}>Niciun mesaj în cutia poștală.</p>
                ) : (
                  <div className={styles.supportList}>
                    {supportLogs.map((log) => (
                      <div key={log.id} className={styles.supportItem}>
                        <div className={styles.supportHeader}>
                          <span className={styles.supportSender}>{log.email}</span>
                          <span className={styles.supportType}>{log.type}</span>
                        </div>
                        <p className={styles.supportMessage}>"{log.message}"</p>
                        <span className={styles.supportTime}>
                          Trimiși la: {new Date(log.created_at).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CMS BLOG EDITOR */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>CMS Blog de Prezentare</h3>
                <p className={styles.cardDesc}>Postează articole educative vizibile pe site-ul de prezentare.</p>

                {blogSuccess && (
                  <div className={styles.blogSuccessBanner}>
                    ✓ Articol publicat cu succes în CMS-ul de prezentare!
                  </div>
                )}

                <form onSubmit={handleAddBlog} className={styles.cmsForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Titlu Articol *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 5 Idei pentru fotografii inedite..."
                      value={blogTitle}
                      onChange={(e) => setBlogTitle(e.target.value)}
                      className={styles.cmsInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Link slug (opțional)</label>
                    <input
                      type="text"
                      placeholder="Ex: idei-fotografii-nunta"
                      value={blogSlug}
                      onChange={(e) => setBlogSlug(e.target.value)}
                      className={styles.cmsInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Rezumat / Excerpt *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Scrie un scurt rezumat de 2-3 propoziții care va apărea în catalog..."
                      value={blogExcerpt}
                      onChange={(e) => setBlogExcerpt(e.target.value)}
                      className={styles.cmsTextarea}
                    />
                  </div>

                  <button type="submit" className={styles.cmsBtn}>
                    Publică articolul
                  </button>
                </form>

                {/* Published blogs list */}
                <div className={styles.publishedBlogs}>
                  <h4 className={styles.publishedTitle}>Articole publicate în CMS ({blogs.length})</h4>
                  <div className={styles.blogList}>
                    {blogs.map((b) => (
                      <div key={b.id} className={styles.blogListItem}>
                        <div style={{ textAlign: 'left' }}>
                          <p className={styles.blogListTitle}>{b.title}</p>
                          <p className={styles.blogListSlug}>slug: /{b.slug}</p>
                        </div>
                        <button onClick={() => handleDeleteBlog(b.id)} className={styles.blogDeleteBtn}>
                          Șterge
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </>
  );
}
