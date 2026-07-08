'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createClient } from '@/lib/supabase/client';
import { Check, Package, X, Printer, Sparkle, Pencil, DownloadSimple, CaretLeft, CaretRight, MapPin, Calendar, PencilSimple, ArrowUp, Copy, Clock, CloudArrowUp, WhatsappLogo } from '@phosphor-icons/react';
import styles from './dashboard.module.css';
import pricingStyles from '@/components/marketing/PricingSection.module.css';
import cardStyles from '@/components/marketing/PricingCard.module.css';
import PricingCard from '@/components/marketing/PricingCard';

const GB = 1024 * 1024 * 1024;
const TIER_MONTHS = { intim: 1, complet: 2, vis: 3 };
const TIER_LABEL = { intim: 'Basic', complet: 'Standard', vis: 'Premium' };
const fmtSize = (b) => (b >= GB ? `${(b / GB).toFixed(1)} GB` : `${(b / (1024 * 1024)).toFixed(0)} MB`);

export default function EvenimentulMeuPage() {
  const [event, setEvent] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [activeTab, setActiveTab] = useState('poze');
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState('Classic Burgundy');
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [cardText, setCardText] = useState('');
  const [cardTextMode, setCardTextMode] = useState('preset');
  const [printLoading, setPrintLoading] = useState(false);
  const [lightbox, setLightbox] = useState(null);      // index în lista de poze
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ event_name: '', couple_names: '', location: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waSaving, setWaSaving] = useState(false);

  const PRESET_TEXTS = [
    'Vrem să ne vedem povestea prin ochii tăi! Scanează codul QR pentru a ne trimite instant pozele de la eveniment.',
    'Captureaz-ne ziua din perspectiva ta! Scanează codul QR și trimite-ne pozele preferate.',
    'Fiecare amintire contează! Scanează codul QR și adaugă-ți pozele la galeria noastră de nuntă.',
  ];

  const handlePrintConfirm = async () => {
    if (!cardText.trim()) return;
    setPrintLoading(true);
    try {
      const res = await fetch('/api/contact/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userProfile?.email || '',
          phone: userProfile?.phone || '',
          name: event?.event_name || '',
          eventName: event?.event_name || '',
          design: selectedDesign,
          cardText: cardText.trim()
        })
      });
      if (res.ok) {
        setPrintModalOpen(false);
        setTimeout(() => alert('Cererea ta de printare a fost trimisă cu succes! Echipa te va contacta în scurt timp.'), 300);
      } else {
        alert('A apărut o eroare. Te rugăm să încerci din nou.');
      }
    } catch(err) {
      alert('Eroare conexiune.');
    }
    setPrintLoading(false);
  };


  useEffect(() => {
    loadData();
  }, []);

  // Navigare lightbox cu tastatura
  useEffect(() => {
    if (lightbox === null) return undefined;
    const count = uploads.filter((u) => u.file_type === 'photo').length;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      else if (e.key === 'ArrowLeft') setLightbox((i) => (i > 0 ? i - 1 : i));
      else if (e.key === 'ArrowRight') setLightbox((i) => (i !== null && i < count - 1 ? i + 1 : i));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, uploads]);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    setUserProfile(profile || { email: user.email });

    // Get event
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (eventData) {
      setEvent(eventData);

      // Get uploads
      const { data: uploadsData } = await supabase
        .from('uploads')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });
      setUploads(uploadsData || []);

      // Get wishes
      const { data: wishesData } = await supabase
        .from('wishes')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });
      setWishes(wishesData || []);
    }
    setLoading(false);
  }

  const handleArchive = async () => {
    setArchiveLoading(true);
    try {
      const res = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      });
      if (res.ok) {
        alert('Arhiva este în curs de generare. Vei fi notificat pe email când este gata.');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert('Eroare la generarea arhivei: ' + (errData.error || 'Încearcă din nou.'));
      }
    } catch {
      alert('Eroare de conexiune. Încearcă din nou.');
    }
    setArchiveLoading(false);
  };

  const togglePublicGallery = async () => {
    const supabase = createClient();
    const newVal = !event.is_gallery_public;
    const { error } = await supabase
      .from('events')
      .update({ is_gallery_public: newVal })
      .eq('id', event.id);
      
    if (!error) {
      setEvent({ ...event, is_gallery_public: newVal });
    } else {
      alert('Eroare la actualizarea setării.');
    }
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const defaultWaMessage = () => `Salutare! 📸 Ajută-ne să adunăm toate amintirile de la ${event.event_name}. Scanează sau deschide linkul și încarcă pozele tale:`;

  const shareWhatsApp = (url) => {
    const body = (event.whatsapp_message && event.whatsapp_message.trim()) || defaultWaMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(`${body}\n${url}`)}`, '_blank');
  };

  const openWaEdit = () => {
    setWaMessage(event.whatsapp_message || defaultWaMessage());
    setWaOpen(true);
  };

  const saveWaMessage = async (e) => {
    e.preventDefault();
    setWaSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('events').update({ whatsapp_message: waMessage.trim() || null }).eq('id', event.id);
    if (!error) {
      setEvent({ ...event, whatsapp_message: waMessage.trim() || null });
      setWaOpen(false);
    } else {
      alert('Nu am putut salva mesajul. Încearcă din nou.');
    }
    setWaSaving(false);
  };

  const downloadQR = async (url) => {
    try {
      const res = await fetch(`/api/qrcode?text=${encodeURIComponent(url)}&size=800`);
      const blob = await res.blob();
      saveAs(blob, `QR_${event.event_code}.png`);
    } catch {
      alert('Nu am putut descărca codul QR. Încearcă din nou.');
    }
  };

  const printQR = (url) => {
    const qrSrc = `${window.location.origin}/api/qrcode?text=${encodeURIComponent(url)}&size=600`;
    const w = window.open('', '_blank', 'width=700,height=900');
    if (!w) return;
    w.document.write(`
      <html><head><title>Cartonaș QR — ${event.event_name}</title>
      <style>
        @page { margin: 0; }
        body { margin:0; font-family: Georgia, serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#faf7f2; }
        .card { width:380px; padding:48px 40px; text-align:center; background:#fff; border:2px solid #bc965c; border-radius:18px; }
        .eyebrow { letter-spacing:3px; text-transform:uppercase; font-size:11px; color:#bc965c; margin-bottom:14px; }
        h1 { font-size:30px; color:#710927; margin:0 0 6px; }
        .date { font-size:14px; color:#777; margin-bottom:26px; }
        img { width:240px; height:240px; }
        .msg { font-size:14px; color:#333; line-height:1.5; margin:22px 8px 6px; }
        .code { margin-top:14px; font-size:13px; color:#999; letter-spacing:1px; }
      </style></head>
      <body><div class="card">
        <div class="eyebrow">Scanează & împărtășește</div>
        <h1>${event.event_name}</h1>
        <div class="date">${new Date(event.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <img src="${qrSrc}" alt="QR" />
        <p class="msg">Scanează codul și trimite-ne pozele tale de la eveniment — fără aplicație, fără cont.</p>
        <div class="code">Cod: ${event.event_code}</div>
      </div>
      <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); }<\/script>
      </body></html>`);
    w.document.close();
  };

  const openEdit = () => {
    setEditForm({
      event_name: event.event_name || '',
      couple_names: event.couple_names || '',
      location: event.location || '',
    });
    setEditOpen(true);
  };

  const saveEventDetails = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('events')
      .update({
        event_name: editForm.event_name.trim() || event.event_name,
        couple_names: editForm.couple_names.trim() || null,
        location: editForm.location.trim() || null,
      })
      .eq('id', event.id);
    if (!error) {
      setEvent({ ...event, ...editForm, event_name: editForm.event_name.trim() || event.event_name });
      setEditOpen(false);
    } else {
      alert('Nu am putut salva. Încearcă din nou.');
    }
    setEditSaving(false);
  };

  const requestUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: userProfile?.email || 'Client',
          lastName: '',
          email: userProfile?.email || '',
          phone: userProfile?.phone || '',
          eventType: 'Cerere Upgrade',
          message: `CERERE UPGRADE / EXTINDERE pentru evenimentul "${event.event_name}" (cod ${event.event_code}). Pachet curent: ${TIER_LABEL[event.package_tier] || event.package_tier}.`,
        }),
      });
      setUpgradeOpen(false);
      alert('Cererea ta a fost trimisă. Te contactăm în curând!');
    } catch {
      alert('Eroare la trimitere. Încearcă din nou.');
    }
    setUpgradeLoading(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (items) => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Ștergi ${selectedIds.size} fișier(e)? Această acțiune nu poate fi anulată.`)) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/upload/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setUploads(prev => prev.filter(u => !selectedIds.has(u.id)));
        setSelectedIds(new Set());
      } else {
        const err = await res.json();
        alert('Eroare: ' + err.error);
      }
    } catch { alert('Eroare la ștergere.'); }
    setDeleteLoading(false);
  };

  const downloadSelected = async (items) => {
    const toDownload = selectedIds.size > 0
      ? items.filter(i => selectedIds.has(i.id))
      : items;

    if (toDownload.length === 0) return;

    setDownloadLoading(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      
      for (let i = 0; i < toDownload.length; i++) {
        const item = toDownload[i];
        const originalUrl = item.public_url || `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/${item.r2_key}`;
        
        // Pass through our proxy to bypass CORS
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(originalUrl)}`;
        
        try {
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const blob = await response.blob();
          const filename = item.original_name || `photo_${item.id}.jpg`;
          zip.file(filename, blob);
        } catch (e) {
          console.error(`Eroare la descărcarea fișierului ${item.id}:`, e);
        }
        
        setDownloadProgress(Math.round(((i + 1) / toDownload.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `Poze_Eveniment_${event?.event_code || 'QRPhotoDrop'}.zip`);
    } catch (error) {
      console.error('Eroare la generarea arhivei:', error);
      alert('Eroare la descărcarea arhivei. Vă rugăm să încercați din nou.');
    } finally {
      setDownloadLoading(false);
      setDownloadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Se încarcă...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <EventSetupForm onCreated={loadData} />
    );
  }

  const uploadUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/upload/${event.event_code}`;
  const photos = uploads.filter(u => u.file_type === 'photo');
  const videos = uploads.filter(u => u.file_type === 'video');

  // Stocare + retenție
  const storageUsed = uploads.reduce((s, u) => s + (u.size_bytes || 0), 0);
  const storageLimit = event.max_storage_bytes || 0;
  const storagePct = storageLimit ? Math.min(100, Math.round((storageUsed / storageLimit) * 100)) : 0;
  let storageColor = 'var(--color-violet)';
  if (storagePct > 90) storageColor = '#dc2626';
  else if (storagePct > 70) storageColor = '#d97706';
  const expiry = event.expires_at
    ? new Date(event.expires_at)
    : (() => { const d = new Date(event.event_date); d.setMonth(d.getMonth() + (TIER_MONTHS[event.package_tier] || 3)); return d; })();
  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);

  return (
    <div className={styles.page}>
      {/* Cover header */}
      <div className={styles.cover}>
        <div className={styles.coverInfo}>
          <span className={styles.coverEyebrow}>Albumul evenimentului</span>
          <h1 className={styles.coverTitle}>{event.couple_names || event.event_name}</h1>
          <p className={styles.coverMeta}>
            <span style={{ textTransform: 'capitalize' }}>{event.event_type}</span>
            <span className={styles.coverDot}>·</span>
            {new Date(event.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
            {event.location ? <><span className={styles.coverDot}>·</span>{event.location}</> : null}
          </p>
        </div>
        <div className={styles.coverActions}>
          <button className={styles.editBtn} onClick={openEdit}>
            <PencilSimple size={16} weight="bold" /> Editează detalii
          </button>
          <a className={styles.editBtn} href={`/slideshow/${event.event_code}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            📺 Slideshow TV
          </a>
          <button className={styles.archiveBtn} onClick={handleArchive} disabled={archiveLoading}>
            {archiveLoading ? '⏳ Se generează...' : '📦 Arhivă pe email'}
          </button>
        </div>
      </div>

      {/* Stocare + retenție */}
      <div className={styles.heroGrid}>
        <div className={styles.heroCard}>
          <div className={styles.heroCardHead}>
            <span className={styles.heroLabel}><CloudArrowUp size={18} weight="light" /> Stocare folosită</span>
            <span className={styles.heroBadge}>{TIER_LABEL[event.package_tier] || event.package_tier}</span>
          </div>
          <div className={styles.heroValue}>{fmtSize(storageUsed)} <span>/ {Math.round(storageLimit / GB)} GB</span></div>
          <div className={styles.storageTrack}><div className={styles.storageFill} style={{ width: `${storagePct}%`, background: storageColor }} /></div>
          <div className={styles.heroFoot}>
            <span>{storagePct}% folosit</span>
            {storagePct > 80 && (
              <button className={styles.upgradeLink} onClick={() => setUpgradeOpen(true)}><ArrowUp size={13} weight="bold" /> Extinde spațiul</button>
            )}
          </div>
        </div>

        <div className={styles.heroCard}>
          <div className={styles.heroCardHead}>
            <span className={styles.heroLabel}><Clock size={18} weight="light" /> Disponibilitate</span>
          </div>
          <div className={styles.heroValue} style={{ color: daysLeft <= 7 ? '#dc2626' : daysLeft <= 30 ? '#b45309' : undefined }}>
            {daysLeft > 0 ? `${daysLeft} zile` : 'Expirat'}
          </div>
          <p className={styles.retentionText}>
            {daysLeft > 0
              ? <>Pozele rămân salvate până pe <strong>{expiry.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, apoi se șterg definitiv.</>
              : <>Perioada de stocare a expirat. Contactează-ne pentru a o prelungi.</>}
          </p>
          <div className={styles.heroFoot}>
            <button className={styles.upgradeLink} onClick={() => setUpgradeOpen(true)}><ArrowUp size={13} weight="bold" /> Prelungește perioada</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{photos.length}</p>
          <p className={styles.statLabel}>Fotografii</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{videos.length}</p>
          <p className={styles.statLabel}>Clipuri</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{wishes.length}</p>
          <p className={styles.statLabel}>Urări</p>
        </div>
      </div>

      
      
      {/* QR Section */}
      <div className={styles.qrSection}>
        <div className={styles.qrCard}>
          <div className={styles.qrImgWrap}>
            <img
              src={`/api/qrcode?text=${encodeURIComponent(uploadUrl)}&size=300`}
              alt={`Cod QR pentru ${event.event_name}`}
              className={styles.qrImg}
            />
          </div>
          <div className={styles.qrInfo}>
            <p className={styles.qrLabel}>Codul tău QR pentru invitați</p>
            <p className={styles.qrHint}>Scanat de invitați, îi duce direct la pagina de încărcat poze. Printează-l și pune-l pe mese.</p>

            <div className={styles.qrActions}>
              <button className={styles.qrWhatsappBtn} onClick={() => shareWhatsApp(uploadUrl)}>
                <WhatsappLogo size={16} weight="fill" /> Trimite pe WhatsApp
              </button>
              <button className={styles.qrSecondaryBtn} onClick={openWaEdit} title="Personalizează mesajul de WhatsApp">
                <PencilSimple size={16} weight="bold" /> Editează mesajul
              </button>
              <button className={styles.qrPrimaryBtn} onClick={() => downloadQR(uploadUrl)}>
                <DownloadSimple size={16} weight="bold" /> Descarcă QR
              </button>
              <button className={styles.qrSecondaryBtn} onClick={() => printQR(uploadUrl)}>
                <Printer size={16} weight="bold" /> Printează cartonaș
              </button>
            </div>

            <div className={styles.qrLinkWrap}>
              <code className={styles.qrLink}>{uploadUrl}</code>
              <button className={styles.copyBtn} onClick={() => copyLink(uploadUrl)}>
                {copied ? <><Check size={14} weight="bold" /> Copiat</> : <><Copy size={14} weight="bold" /> Copiază</>}
              </button>
            </div>
            <p className={styles.qrCode}>Cod eveniment: <strong>{event.event_code}</strong></p>

            <label className={styles.galleryToggle}>
              <input type="checkbox" checked={!!event.is_gallery_public} onChange={togglePublicGallery} />
              <span>Permite invitaților să vadă galeria foto publică</span>
            </label>
          </div>
        </div>
      </div>

      {/* Design Catalog */}
      <div className={styles.designSection}>
        <h2 className={styles.sectionTitle}>
          Alege un design din catalog
        </h2>
        <p className={styles.sectionSubtitle}>
          Alege un model din catalog pentru discuția cu echipa QRPhotoDrop sau descarcă în format digital!
        </p>

        <div className={styles.designGrid}>
          {[
            { name: 'Classic Burgundy', image: '/images/mockups/classic_burgundy.png' },
            { name: 'Cream Elegant', image: '/images/mockups/cream_elegant.png' },
            { name: 'Gold Minimalist', image: '/images/mockups/gold_minimalist.png' }
          ].map((design) => {
            const isSelected = selectedDesign === design.name;
            return (
              <div 
                key={design.name} 
                onClick={() => setSelectedDesign(design.name)}
                className={`${styles.designCard} ${isSelected ? styles.designSelected : ''}`}
              >
                <div className={styles.designPreview}>
                  <img src={design.image} alt={design.name} className={styles.designPreviewImg} />
                </div>
                <div className={styles.designCardInfo}>
                  <span className={styles.designCardName}>{design.name}</span>
                  <span className={styles.designCardStatus}>
                    {isSelected ? <><Check size={12} weight="bold" /> Selectat</> : 'Alege model'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.designActions}>
          <button 
            onClick={() => { setCardText(PRESET_TEXTS[0]); setPrintModalOpen(true); }}
            className={styles.printBtn}
          >
            <Package size={16} weight="light" /> Cere administratorului să printeze cartonașele (Taxat extra)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'poze' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('poze')}
        >
          📸 Fotografii ({photos.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'clipuri' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('clipuri')}
        >
          🎬 Clipuri ({videos.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'urari' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('urari')}
        >
          💌 Urări ({wishes.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'poze' && (
        <div>
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              <button
                onClick={() => selectAll(photos)}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--color-cream)', border: '1px solid var(--color-cream-darker)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                {selectedIds.size === photos.length ? '✗ Deselectează tot' : '✓ Selectează tot'}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{selectedIds.size} selectate</span>
                  <button
                    onClick={() => downloadSelected(photos)}
                    disabled={downloadLoading}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--color-violet-ultra)', color: 'var(--color-violet)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: downloadLoading ? 0.7 : 1 }}
                  >
                    {downloadLoading ? `⏳ Se descarcă (${downloadProgress}%)` : '⬇ Descarcă selectate'}
                  </button>
                  <button
                    onClick={deleteSelected}
                    disabled={deleteLoading}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    {deleteLoading ? '⏳ Se șterge...' : '🗑 Șterge selectate'}
                  </button>
                </>
              )}
              {selectedIds.size === 0 && (
                <button
                  onClick={() => downloadSelected(photos)}
                  disabled={downloadLoading}
                  style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--color-violet-ultra)', color: 'var(--color-violet)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: downloadLoading ? 0.7 : 1 }}
                >
                  {downloadLoading ? `⏳ Se descarcă (${downloadProgress}%)` : '⬇ Descarcă tot'}
                </button>
              )}
            </div>
          )}
          {photos.length === 0 ? (
            <EmptyGallery uploadUrl={uploadUrl} onCopy={() => copyLink(uploadUrl)} copied={copied} />
          ) : (
            <div className={styles.masonry}>
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className={styles.masonryItem}
                  style={{ outline: selectedIds.has(photo.id) ? '3px solid var(--color-violet)' : 'none', outlineOffset: '2px' }}
                >
                  <button
                    type="button"
                    aria-label={selectedIds.has(photo.id) ? 'Deselectează' : 'Selectează'}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                    style={{
                      position: 'absolute', top: '8px', left: '8px', zIndex: 2,
                      width: '24px', height: '24px', borderRadius: '7px', padding: 0,
                      background: selectedIds.has(photo.id) ? 'var(--color-violet)' : 'rgba(255,255,255,0.92)',
                      border: selectedIds.has(photo.id) ? '2px solid var(--color-violet)' : '2px solid rgba(0,0,0,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease', cursor: 'pointer',
                    }}
                  >
                    {selectedIds.has(photo.id) && <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>✓</span>}
                  </button>
                  <img
                    src={photo.public_url || `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/${photo.r2_key}`}
                    alt={photo.original_name}
                    className={styles.masonryImg}
                    loading="lazy"
                    onClick={() => setLightbox(idx)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'clipuri' && (
        <div>
          {videos.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              <button
                onClick={() => selectAll(videos)}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--color-cream)', border: '1px solid var(--color-cream-darker)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                {selectedIds.size === videos.length ? '✗ Deselectează tot' : '✓ Selectează tot'}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{selectedIds.size} selectate</span>
                  <button
                    onClick={deleteSelected}
                    disabled={deleteLoading}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    {deleteLoading ? '⏳ Se șterge...' : '🗑 Șterge selectate'}
                  </button>
                </>
              )}
            </div>
          )}
          <div className={styles.photoGrid}>
            {videos.length === 0 ? (
              <p className={styles.emptyTab}>Niciun clip încă.</p>
            ) : (
              videos.map((video) => (
                <div
                  key={video.id}
                  className={styles.photoItem}
                  style={{ position: 'relative', outline: selectedIds.has(video.id) ? '3px solid var(--color-violet)' : 'none', outlineOffset: '2px' }}
                  onClick={() => toggleSelect(video.id)}
                >
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px', zIndex: 2,
                    width: '22px', height: '22px', borderRadius: '6px',
                    background: selectedIds.has(video.id) ? 'var(--color-violet)' : 'rgba(255,255,255,0.9)',
                    border: selectedIds.has(video.id) ? '2px solid var(--color-violet)' : '2px solid rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease', cursor: 'pointer',
                  }}>
                    {selectedIds.has(video.id) && <span style={{ color: 'white', fontSize: '13px', fontWeight: 700 }}>✓</span>}
                  </div>
                  <video
                    src={video.public_url || `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/${video.r2_key}`}
                    className={styles.photoImg}
                    controls
                    preload="metadata"
                    style={{ cursor: 'pointer' }}
                  />
                  <p className={styles.photoName}>{video.original_name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'urari' && (
        <div className={styles.wishesList}>
          {wishes.length === 0 ? (
            <p className={styles.emptyTab}>Nicio urare încă.</p>
          ) : (
            wishes.map((wish) => (
              <div key={wish.id} className={styles.wishCard}>
                <div className={styles.wishHeader}>
                  <span className={styles.wishAuthor}>{wish.first_name} {wish.last_name}</span>
                  <span className={styles.wishDate}>
                    {new Date(wish.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className={styles.wishMessage}>{wish.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      
      {/* ===== PRINT MODAL ===== */}
      {printModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setPrintModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            
            <button className={styles.modalClose} onClick={() => setPrintModalOpen(false)}><X size={16} weight="light" /></button>

            <div className={styles.modalHeader}>
              <span className={styles.modalEmoji}><Printer size={36} weight="light" style={{ color: '#710927' }} /></span>
              <h2 className={styles.modalTitle}>Personalizează textul de pe cartonaș</h2>
              <p className={styles.modalSubtitle}>
                Alege un mesaj din variantele noastre sau scrie textul tău personalizat — îl vom imprima exact pe cartonașul <strong>{selectedDesign}</strong>.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className={styles.modeSwitcher}>
              <button
                className={`${styles.modeBtn} ${cardTextMode === 'preset' ? styles.modeBtnActive : ''}`}
                onClick={() => { setCardTextMode('preset'); setCardText(PRESET_TEXTS[0]); }}
              >
                <Sparkle size={14} weight="light" /> Variante recomandate
              </button>
              <button
                className={`${styles.modeBtn} ${cardTextMode === 'custom' ? styles.modeBtnActive : ''}`}
                onClick={() => { setCardTextMode('custom'); setCardText(''); }}
              >
                <Pencil size={14} weight="light" /> Text personalizat
              </button>
            </div>

            {/* Preset Options */}
            {cardTextMode === 'preset' && (
              <div className={styles.presetList}>
                {PRESET_TEXTS.map((text, i) => (
                  <div
                    key={i}
                    className={`${styles.presetOption} ${cardText === text ? styles.presetSelected : ''}`}
                    onClick={() => setCardText(text)}
                  >
                    <div className={styles.presetRadio}>
                      <span className={styles.presetRadioDot} />
                    </div>
                    <p className={styles.presetText}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Text */}
            {cardTextMode === 'custom' && (
              <div className={styles.customTextArea}>
                <label className={styles.customLabel}>Textul tău (maxim 200 caractere)</label>
                <textarea
                  className={styles.customTextarea}
                  rows={4}
                  maxLength={200}
                  placeholder="Ex: Îți mulțumim că ești alături de noi! Scanează QR-ul și trimite-ne o poză..."
                  value={cardText}
                  onChange={(e) => setCardText(e.target.value)}
                />
                <span className={styles.charCount}>{cardText.length}/200</span>
              </div>
            )}

            {/* Preview Card */}
            {cardText.trim() && (
              <div className={styles.cardPreviewWrap}>
                <p className={styles.previewLabel}>Previzualizare cartonaș:</p>
                <div className={styles.cardPreview}>
                  <div className={styles.cardPreviewInner}>
                    <p className={styles.cardPreviewText}>{cardText}</p>
                    <div className={styles.cardPreviewQr}>
                      <div className={styles.cardPreviewQrGrid} />
                      <span className={styles.cardPreviewQrLabel}>QR CODE</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setPrintModalOpen(false)}>
                Anulează
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handlePrintConfirm}
                disabled={!cardText.trim() || printLoading}
              >
                <Package size={15} weight="light" /> {printLoading ? 'Se trimite...' : 'Trimite cererea de printare'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== LIGHTBOX ===== */}
      {lightbox !== null && photos[lightbox] && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <button className={styles.lbClose} onClick={() => setLightbox(null)} aria-label="Închide"><X size={22} weight="bold" /></button>
          {lightbox > 0 && (
            <button className={styles.lbNav} style={{ left: '16px' }} onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }} aria-label="Anterioara"><CaretLeft size={26} weight="bold" /></button>
          )}
          {lightbox < photos.length - 1 && (
            <button className={styles.lbNav} style={{ right: '16px' }} onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }} aria-label="Următoarea"><CaretRight size={26} weight="bold" /></button>
          )}
          <img
            className={styles.lbImg}
            src={photos[lightbox].public_url || `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/${photos[lightbox].r2_key}`}
            alt={photos[lightbox].original_name}
            onClick={(e) => e.stopPropagation()}
          />
          <div className={styles.lbBar} onClick={(e) => e.stopPropagation()}>
            <span>{lightbox + 1} / {photos.length}</span>
            <a className={styles.lbDownload} href={`/api/proxy?url=${encodeURIComponent(photos[lightbox].public_url || '')}`} download={photos[lightbox].original_name || 'poza.jpg'}>
              <DownloadSimple size={16} weight="bold" /> Descarcă
            </a>
          </div>
        </div>
      )}

      {/* ===== EDIT DETALII ===== */}
      {editOpen && (
        <div className={styles.modalOverlay} onClick={() => setEditOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setEditOpen(false)}><X size={16} weight="light" /></button>
            <div className={styles.modalHeader}>
              <span className={styles.modalEmoji}><PencilSimple size={32} weight="light" style={{ color: '#710927' }} /></span>
              <h2 className={styles.modalTitle}>Editează detaliile evenimentului</h2>
              <p className={styles.modalSubtitle}>Pachetul și data sunt fixate. Pentru a le schimba, contactează echipa.</p>
            </div>
            <form onSubmit={saveEventDetails} className={styles.editForm}>
              <label className={styles.editLabel}>Numele evenimentului
                <input className={styles.editInput} value={editForm.event_name} onChange={(e) => setEditForm({ ...editForm, event_name: e.target.value })} required />
              </label>
              <label className={styles.editLabel}>Numele mirilor / sărbătoriților
                <input className={styles.editInput} value={editForm.couple_names} onChange={(e) => setEditForm({ ...editForm, couple_names: e.target.value })} placeholder="Ex: Ana & Mihai" />
              </label>
              <label className={styles.editLabel}>Locația
                <input className={styles.editInput} value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="Ex: Restaurant Noblesse, București" />
              </label>
              <div className={styles.editLocked}>
                <span>Pachet: <strong>{TIER_LABEL[event.package_tier] || event.package_tier}</strong></span>
                <span>Data: <strong>{new Date(event.event_date).toLocaleDateString('ro-RO')}</strong></span>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.modalCancelBtn} onClick={() => setEditOpen(false)}>Anulează</button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={editSaving}>{editSaving ? 'Se salvează...' : 'Salvează'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== EDITARE MESAJ WHATSAPP ===== */}
      {waOpen && (
        <div className={styles.modalOverlay} onClick={() => setWaOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setWaOpen(false)}><X size={16} weight="light" /></button>
            <div className={styles.modalHeader}>
              <span className={styles.modalEmoji}><WhatsappLogo size={34} weight="fill" style={{ color: '#25D366' }} /></span>
              <h2 className={styles.modalTitle}>Personalizează mesajul de WhatsApp</h2>
              <p className={styles.modalSubtitle}>Scrie mesajul cu care le trimiți invitaților linkul. Adăugăm automat linkul la final.</p>
            </div>
            <form onSubmit={saveWaMessage} className={styles.editForm}>
              <textarea
                className={styles.editInput}
                rows={4}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                placeholder="Ex: Salutare! Ajută-ne să adunăm pozele de la nunta noastră..."
                style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}
              />
              <div className={styles.editLocked} style={{ fontStyle: 'italic' }}>
                Previzualizare: „{(waMessage || '').trim() || 'mesajul tău'}\n{uploadUrl}"
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.modalCancelBtn} onClick={() => { setWaMessage(defaultWaMessage()); }}>Revino la textul implicit</button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={waSaving}>{waSaving ? 'Se salvează...' : 'Salvează mesajul'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== UPGRADE ===== */}
      {upgradeOpen && (
        <div className={styles.modalOverlay} onClick={() => setUpgradeOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setUpgradeOpen(false)}><X size={16} weight="light" /></button>
            <div className={styles.modalHeader}>
              <span className={styles.modalEmoji}><ArrowUp size={32} weight="light" style={{ color: '#710927' }} /></span>
              <h2 className={styles.modalTitle}>Extinde spațiul sau perioada</h2>
              <p className={styles.modalSubtitle}>Ai nevoie de mai mult spațiu sau de mai mult timp pentru poze? Trimitem cererea echipei și te contactăm cu opțiunile.</p>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setUpgradeOpen(false)}>Anulează</button>
              <button type="button" className={styles.modalConfirmBtn} onClick={requestUpgrade} disabled={upgradeLoading}>
                {upgradeLoading ? 'Se trimite...' : 'Trimite cererea'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function EmptyGallery({ uploadUrl, onCopy, copied }) {
  return (
    <div className={styles.galleryEmpty}>
      <div className={styles.galleryEmptyIcon}><CloudArrowUp size={40} weight="light" /></div>
      <h3 className={styles.galleryEmptyTitle}>Galeria așteaptă primele amintiri</h3>
      <p className={styles.galleryEmptyText}>Distribuie linkul sau codul QR invitaților. Pozele lor apar aici automat, în timp real.</p>
      <div className={styles.emptyLinkRow}>
        <code className={styles.qrLink}>{uploadUrl}</code>
        <button className={styles.copyBtn} onClick={onCopy}>
          {copied ? <><Check size={14} weight="bold" /> Copiat</> : <><Copy size={14} weight="bold" /> Copiază</>}
        </button>
      </div>
    </div>
  );
}

function EventSetupForm({ onCreated }) {
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState('nunta');
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [coupleNames, setCoupleNames] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPreselected() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        if (user.user_metadata.plan_type) setEventType(user.user_metadata.plan_type);
      }
    }
    loadPreselected();
  }, []);

  // Set the plan after eventType is loaded, if available
  useEffect(() => {
    async function setPlan() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.plan && PACKAGES[eventType]) {
        const p = PACKAGES[eventType].find(pkg => pkg.key === user.user_metadata.plan);
        if (p) setSelectedPlan(p);
      }
    }
    setPlan();
  }, [eventType]);

  // Stocare și disponibilitate per nivel (identice pentru toate tipurile)
  const TIER_STORAGE = { intim: 60, complet: 150, vis: 200 };
  const TIER_DURATION = { intim: '1 lună', complet: '2 luni', vis: '3 luni' };
  const tierFeatures = (tier) => [
    'Album Digital & QR unic',
    'Catalog & Design QR',
    'Poze, urări și clipuri video (max. 2 min)',
    `${TIER_STORAGE[tier]} GB stocare`,
    `Disponibil ${TIER_DURATION[tier]} după eveniment`,
  ];

  const PACKAGES = {
    nunta: [
      { key: 'intim',   name: 'Basic',    price: 27900, guests: 100, storageGB: TIER_STORAGE.intim,   subLabel: 'ideal pentru evenimente până în 100 invitați', features: tierFeatures('intim') },
      { key: 'complet', name: 'Standard', price: 39900, guests: 250, storageGB: TIER_STORAGE.complet, subLabel: 'ideal pentru evenimente până în 250 invitați', popular: true, features: tierFeatures('complet') },
      { key: 'vis',     name: 'Premium',  price: 64900, guests: 500, storageGB: TIER_STORAGE.vis,     subLabel: 'ideal pentru evenimente până în 500 invitați', features: tierFeatures('vis') },
    ],
    botez: [
      { key: 'intim',   name: 'Basic',    price: 27900, guests: 50,  storageGB: TIER_STORAGE.intim,   subLabel: 'ideal pentru evenimente până în 50 invitați',  features: tierFeatures('intim') },
      { key: 'complet', name: 'Standard', price: 39900, guests: 150, storageGB: TIER_STORAGE.complet, subLabel: 'ideal pentru evenimente până în 150 invitați', popular: true, features: tierFeatures('complet') },
      { key: 'vis',     name: 'Premium',  price: 64900, guests: 300, storageGB: TIER_STORAGE.vis,     subLabel: 'ideal pentru evenimente până în 300 invitați', features: tierFeatures('vis') },
    ],
    aniversare: [
      { key: 'intim',   name: 'Basic',    price: 24900, guests: 50,  storageGB: TIER_STORAGE.intim,   subLabel: 'ideal pentru evenimente până în 50 invitați',  features: tierFeatures('intim') },
      { key: 'complet', name: 'Standard', price: 32900, guests: 150, storageGB: TIER_STORAGE.complet, subLabel: 'ideal pentru evenimente până în 150 invitați', popular: true, features: tierFeatures('complet') },
      { key: 'vis',     name: 'Premium',  price: 48900, guests: 300, storageGB: TIER_STORAGE.vis,     subLabel: 'ideal pentru evenimente până în 300 invitați', features: tierFeatures('vis') },
    ],
    corporate: [
      { key: 'intim',   name: 'Basic',    price: 32900, guests: 100, storageGB: TIER_STORAGE.intim,   subLabel: 'ideal pentru evenimente până în 100 invitați', features: tierFeatures('intim') },
      { key: 'complet', name: 'Standard', price: 45900, guests: 300, storageGB: TIER_STORAGE.complet, subLabel: 'ideal pentru evenimente până în 300 invitați', popular: true, features: tierFeatures('complet') },
      { key: 'vis',     name: 'Premium',  price: 69900, guests: 600, storageGB: TIER_STORAGE.vis,     subLabel: 'ideal pentru evenimente până în 600 invitați', features: tierFeatures('vis') },
    ],
  };

  const TABS = [
    { key: 'nunta', label: 'Nuntă' },
    { key: 'botez', label: 'Botez' },
    { key: 'aniversare', label: 'Aniversare' },
    { key: 'corporate', label: 'Corporate' },
  ];

  const plans = PACKAGES[eventType];

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Nu ești autentificat.'); setSaving(false); return; }

      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          eventType,
          eventDate,
          coupleNames: coupleNames || null,
          location: location || null,
          maxGuests: selectedPlan?.guests || 100,
          maxStorageBytes: (selectedPlan?.storageGB || 25) * 1024 * 1024 * 1024,
          packageType: eventType,
          packageTier: selectedPlan?.key || 'complet',
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error('Event creation error:', result.error);
        setError(`Eroare: ${result.error}`);
        setSaving(false);
        return;
      }

      onCreated();
    } catch (err) {
      console.error(err);
      setError('Eroare neașteptată. Încearcă din nou.');
      setSaving(false);
    }
  };

  const fieldStyle = {
    padding: '14px 16px', border: '1px solid var(--color-cream-darker)',
    borderRadius: 'var(--radius-md)', fontSize: '15px', fontFamily: 'var(--font-sans)',
    outline: 'none', width: '100%', background: '#ffffff'
  };

  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '6px'
  };

  if (step === 1) {
    return (
      <div style={{ padding: 'var(--space-2xl) 0', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
        <div className={pricingStyles.header}>
          <span className={pricingStyles.eyebrow}>Configurare Cont</span>
          <h2 className={pricingStyles.title}>Alege pachetul potrivit</h2>
          <p className={pricingStyles.subtitle}>
            Selectează tipul evenimentului și planul de care ai nevoie pentru a-ți activa colecția.
          </p>
        </div>

        <div className={pricingStyles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${pricingStyles.tab} ${eventType === tab.key ? pricingStyles.tabActive : ''}`}
              onClick={() => { setEventType(tab.key); setSelectedPlan(null); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={pricingStyles.grid}>
          {plans.map((plan) => (
            <div key={plan.key} style={{ height: '100%' }}>
              <PricingCard
                name={plan.name}
                price={plan.price}
                subLabel={plan.subLabel}
                features={plan.features}
                isPopular={plan.popular}
                buttonText="Alege acest pachet →"
                onSelect={() => { setSelectedPlan(plan); setStep(2); }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-2xl) 0' }}>
      <button
        onClick={() => setStep(1)}
        style={{
          background: 'none', border: 'none', color: 'var(--color-violet)',
          fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          marginBottom: '24px', fontFamily: 'var(--font-sans)', display: 'inline-flex', gap: '8px'
        }}
      >
        ← Schimbă pachetul
      </button>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', color: 'var(--color-text)', marginBottom: '8px' }}>
          Detalii eveniment
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
          Pachet ales: <strong>{selectedPlan?.name}</strong> la {Math.round(selectedPlan?.price / 100)} RON
        </p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid rgba(181,140,79,0.3)', borderRadius: 'var(--radius-lg)', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Numele evenimentului *</label>
            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required placeholder="Ex: Nunta Ana & Mihai" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Data evenimentului *</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Numele mirilor / Organizator</label>
            <input type="text" value={coupleNames} onChange={(e) => setCoupleNames(e.target.value)} placeholder="Ex: Ana & Mihai" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Locația</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Restaurant Noblesse, București" style={fieldStyle} />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'var(--color-burgundy)', color: 'white', border: 'none',
              padding: '16px', fontSize: '15px', fontWeight: 600, borderRadius: 'var(--radius-md)',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: '8px',
              transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)'
            }}
          >
            {saving ? 'Se creează...' : '🚀 Finalizează și Activează QR-ul'}
          </button>
        </form>
      </div>
    </div>
  );
}

