import fs from 'fs';

const file = '/Users/blueice/Documents/qrPhotoDrop/app/(app)/dashboard/evenimentul-meu/page.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Icons
content = content.replace(
  "import { createClient } from '@/lib/supabase/client';",
  "import { createClient } from '@/lib/supabase/client';\nimport { Check, Package, X, Printer, Sparkle, Pencil } from '@phosphor-icons/react';"
);

// 2. Add State Variables inside EvenimentulMeuPage
const stateInjection = `
  const [userProfile, setUserProfile] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState('Classic Burgundy');
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [cardText, setCardText] = useState('');
  const [cardTextMode, setCardTextMode] = useState('preset');
  const [printLoading, setPrintLoading] = useState(false);

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
`;

content = content.replace(
  'const [deleteLoading, setDeleteLoading] = useState(false);',
  'const [deleteLoading, setDeleteLoading] = useState(false);' + stateInjection
);

// 3. Load user profile in loadData
content = content.replace(
  "const { data: { user } } = await supabase.auth.getUser();\n    if (!user) return;",
  "const { data: { user } } = await supabase.auth.getUser();\n    if (!user) return;\n\n    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();\n    setUserProfile(profile || { email: user.email });"
);

// 4. Inject Design Selection JSX before the QR Section
const designUI = `
      {/* Design Catalog */}
      <div className={styles.designSection} style={{ marginTop: '30px', marginBottom: '20px' }}>
        <h2 className={styles.sectionTitle} style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-burgundy)', marginBottom: '8px' }}>
          Alege un design din catalog
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Alege un model din catalog pentru discuția cu echipa QRPhotoDrop sau descarcă în format digital!
        </p>

        <div className={styles.designGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
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
                style={{
                  border: isSelected ? '2px solid var(--color-gold)' : '1px solid #ddd',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: '#fff'
                }}
              >
                <div style={{ height: '200px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                  <img src={design.image} alt={design.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#333' }}>{design.name}</span>
                  <span style={{ fontSize: '13px', color: isSelected ? 'var(--color-gold)' : '#888', fontWeight: isSelected ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isSelected ? <><Check size={12} weight="bold" /> Selectat</> : 'Alege model'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => { setCardText(PRESET_TEXTS[0]); setPrintModalOpen(true); }}
          style={{
            background: 'var(--color-burgundy)',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Package size={16} /> Cere administratorului să printeze cartonașele (Taxat extra)
        </button>
      </div>

`;

// Insert design UI before QR Section
content = content.replace('{/* QR Section */}', designUI + '      {/* QR Section */}');

// 5. Inject Print Modal before closing </div>
const modalUI = `
      {/* ===== PRINT MODAL ===== */}
      {printModalOpen && (
        <div 
          onClick={() => setPrintModalOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '30px',
              maxWidth: '500px', width: '100%', position: 'relative'
            }}
          >
            <button 
              onClick={() => setPrintModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <Printer size={36} weight="light" style={{ color: 'var(--color-burgundy)', marginBottom: '10px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' }}>Personalizează textul de pe cartonaș</h2>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Alege un mesaj din variantele noastre sau scrie textul tău personalizat — îl vom imprima exact pe cartonașul <strong>{selectedDesign}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f5f5f5', padding: '4px', borderRadius: '8px' }}>
              <button
                onClick={() => { setCardTextMode('preset'); setCardText(PRESET_TEXTS[0]); }}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
                  background: cardTextMode === 'preset' ? '#fff' : 'transparent',
                  boxShadow: cardTextMode === 'preset' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: cardTextMode === 'preset' ? 600 : 400, color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Sparkle size={14} /> Variante
              </button>
              <button
                onClick={() => { setCardTextMode('custom'); setCardText(''); }}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
                  background: cardTextMode === 'custom' ? '#fff' : 'transparent',
                  boxShadow: cardTextMode === 'custom' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: cardTextMode === 'custom' ? 600 : 400, color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Pencil size={14} /> Personalizat
              </button>
            </div>

            {cardTextMode === 'preset' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
                {PRESET_TEXTS.map((text, i) => (
                  <div
                    key={i}
                    onClick={() => setCardText(text)}
                    style={{
                      padding: '12px 16px', borderRadius: '8px', border: cardText === text ? '2px solid var(--color-burgundy)' : '1px solid #ddd',
                      background: cardText === text ? '#fdf8f9' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px'
                    }}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: cardText === text ? '4px solid var(--color-burgundy)' : '2px solid #ccc', marginTop: '2px', flexShrink: 0 }} />
                    <p style={{ fontSize: '13px', color: '#444', lineHeight: 1.4, margin: 0 }}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {cardTextMode === 'custom' && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>Textul tău (maxim 200 caractere)</label>
                <textarea
                  rows={4}
                  maxLength={200}
                  placeholder="Ex: Îți mulțumim că ești alături de noi! Scanează QR-ul și trimite-ne o poză..."
                  value={cardText}
                  onChange={(e) => setCardText(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px',
                    fontSize: '14px', resize: 'none', fontFamily: 'inherit'
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#888', marginTop: '4px' }}>{cardText.length}/200</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setPrintModalOpen(false)}
                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '8px', fontWeight: 600, color: '#444', cursor: 'pointer' }}
              >
                Anulează
              </button>
              <button 
                onClick={handlePrintConfirm}
                disabled={!cardText.trim() || printLoading}
                style={{ flex: 2, padding: '12px', background: 'var(--color-burgundy)', border: 'none', borderRadius: '8px', fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: (!cardText.trim() || printLoading) ? 0.6 : 1 }}
              >
                {printLoading ? 'Se trimite...' : 'Trimite cererea'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('    </div>\n  );\n}', modalUI + '\n    </div>\n  );\n}');

fs.writeFileSync(file, content);
console.log('Done replacing!');
