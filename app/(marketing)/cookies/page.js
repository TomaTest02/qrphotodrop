import styles from '../termeni/termeni.module.css';

export const metadata = {
  title: 'Politica de Cookies · QRPhotoDrop',
  description:
    'Ce cookie-uri folosește QRPhotoDrop. Folosim cookie-uri esențiale de autentificare și statistici fără cookie-uri.',
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Politica de Cookies</h1>
      <p className={styles.meta}>Ultima actualizare: 13 iulie 2026</p>

      <div className={styles.disclaimer}>
        <p>
          Pe scurt: QRPhotoDrop folosește <strong>cookie-uri esențiale de autentificare</strong>
          și o soluție de statistici <strong>fără cookie-uri</strong>.
          Nu folosim cookie-uri de publicitate sau de urmărire.
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.h2}>1. Ce sunt cookie-urile</h2>
        <p>
          Cookie-urile sunt fișiere text mici stocate de browser pe dispozitivul tău, care ajută
          un site să funcționeze sau să rețină anumite informații între vizite.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>2. Ce cookie-uri folosim</h2>
        <ul>
          <li>
            <strong>Cookie-uri de autentificare (esențiale):</strong> Supabase poate împărți sesiunea
            în unul sau mai multe cookie-uri tehnice. Sunt persistente și pot rămâne pe dispozitiv
            până la <strong>400 de zile</strong>, fiind actualizate când sesiunea este reîmprospătată.
            Se elimină la deconectare sau la expirare. Fără ele nu te poți autentifica, deci sunt
            strict necesare și nu solicităm consimțământ pentru ele.
          </li>
        </ul>
        <p>
          Invitații care încarcă poze prin codul QR <strong>nu au nevoie de cont</strong> și nu li
          se setează cookie-uri de autentificare.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. Stocarea locală din modul demo</h2>
        <p>
          Paginile demonstrative folosesc <strong>localStorage</strong> pentru a păstra în browser
          datele și conținutul introduse în demo. Aceste informații nu sunt trimise în contul unui
          organizator și rămân până când ștergi datele site-ului din browser.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>4. Statistici fără cookie-uri</h2>
        <p>
          Folosim Vercel Analytics și Speed Insights pentru a înțelege traficul și performanța
          site-ului. Aceste instrumente <strong>nu setează cookie-uri</strong> și colectează date
          agregate (pagină accesată, tip de dispozitiv, performanță), fără a te identifica personal.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>5. Ce NU folosim</h2>
        <p>
          Nu folosim cookie-uri de publicitate, remarketing sau urmărire terță (fără Google
          Analytics, fără Meta/Facebook Pixel, fără instrumente similare).
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. Cum controlezi cookie-urile</h2>
        <p>
          Poți șterge sau bloca cookie-urile din setările browserului. Reține că dezactivarea
          cookie-ului de sesiune te va împiedica să te autentifici în cont.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>7. Contact</h2>
        <div className={styles.contact}>
          <p>
            Întrebări? Scrie-ne la{' '}
            <a href="mailto:qrphotodrop@gmail.com">qrphotodrop@gmail.com</a>. Vezi și{' '}
            <a href="/confidentialitate">Politica de Confidențialitate</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
