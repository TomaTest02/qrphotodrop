import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div>
            <p className={styles.brand}>QRPhotoDrop</p>
            <p className={styles.description}>
              Transformăm fiecare moment surprins de invitați într-o amintire
              prețioasă, adunată frumos într-un singur loc.
            </p>
          </div>

          <div>
            <p className={styles.heading}>Pagini</p>
            <div className={styles.linkList}>
              <a href="/" className={styles.linkItem}>Acasă</a>
              <a href="/preturi" className={styles.linkItem}>Prețuri</a>
              <a href="/blog" className={styles.linkItem}>Blog</a>
              <a href="/contact" className={styles.linkItem}>Contact</a>
            </div>
          </div>

          <div>
            <p className={styles.heading}>Evenimente</p>
            <div className={styles.linkList}>
              <a href="/eveniment/nunta" className={styles.linkItem}>Nuntă</a>
              <a href="/eveniment/botez" className={styles.linkItem}>Botez</a>
              <a href="/eveniment/aniversare" className={styles.linkItem}>Aniversare</a>
              <a href="/eveniment/corporate" className={styles.linkItem}>Corporate</a>
            </div>
          </div>

          <div>
            <p className={styles.heading}>Legal</p>
            <div className={styles.linkList}>
              <a href="/termeni" className={styles.linkItem}>Termeni și condiții</a>
              <a href="#" className={styles.linkItem}>Politica de cookies</a>
              <a href="#" className={styles.linkItem}>Confidențialitate</a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} QRPhotoDrop</span>
          <span>+40 (720) 726 619 · qrphotodrop@gmail.com</span>
        </div>
      </div>
    </footer>
  );
}
