import fs from 'fs';

// 1. Update CSS
const demoCssPath = '/Users/blueice/Documents/qrPhotoDrop/app/dashboard/demo/dashboard-demo.module.css';
const targetCssPath = '/Users/blueice/Documents/qrPhotoDrop/app/(app)/dashboard/evenimentul-meu/dashboard.module.css';

const demoCss = fs.readFileSync(demoCssPath, 'utf8');

const designCatalogCss = demoCss.substring(
  demoCss.indexOf('/* DESIGN CATALOG */'),
  demoCss.indexOf('/* TABS */')
);

const modalCss = demoCss.substring(
  demoCss.indexOf('/* ===== PRINT MODAL ===== */')
);

const targetCss = fs.readFileSync(targetCssPath, 'utf8');

if (!targetCss.includes('/* DESIGN CATALOG */')) {
  fs.writeFileSync(targetCssPath, targetCss + '\n\n' + designCatalogCss + '\n\n' + modalCss);
  console.log('Appended CSS to dashboard.module.css');
}

// 2. Update JSX in page.js
const pagePath = '/Users/blueice/Documents/qrPhotoDrop/app/(app)/dashboard/evenimentul-meu/page.js';
let pageContent = fs.readFileSync(pagePath, 'utf8');

const designUIRegex = /\{\/\* Design Catalog \*\/\}[\s\S]*?(?=\{\/\* QR Section \*\/)/;

const newDesignUI = `
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
                className={\`\${styles.designCard} \${isSelected ? styles.designSelected : ''}\`}
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

      `;

pageContent = pageContent.replace(designUIRegex, newDesignUI);

const modalUIRegex = /\{\/\* ===== PRINT MODAL ===== \*\/\}[\s\S]*?(?=\n    <\/div>\n  \);\n\})/;

const newModalUI = `
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
                className={\`\${styles.modeBtn} \${cardTextMode === 'preset' ? styles.modeBtnActive : ''}\`}
                onClick={() => { setCardTextMode('preset'); setCardText(PRESET_TEXTS[0]); }}
              >
                <Sparkle size={14} weight="light" /> Variante recomandate
              </button>
              <button
                className={\`\${styles.modeBtn} \${cardTextMode === 'custom' ? styles.modeBtnActive : ''}\`}
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
                    className={\`\${styles.presetOption} \${cardText === text ? styles.presetSelected : ''}\`}
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
`;

pageContent = pageContent.replace(modalUIRegex, newModalUI);

fs.writeFileSync(pagePath, pageContent);
console.log('Updated page.js with proper CSS classes');
