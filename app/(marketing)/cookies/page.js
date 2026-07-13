import styles from '../termeni/termeni.module.css';

export const metadata = {
  title: 'Politica de Cookies · QRPhotoDrop',
  description:
    'Ce cookie-uri folosește QRPhotoDrop. Folosim doar un cookie esențial de sesiune și statistici fără cookie-uri.',
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Politica de Cookies</h1>
      <p className={styles.meta}>Ultima actualizare: 12 iulie 2026</p>

      <div className={styles.disclaimer}>
        <p>
          Pe scurt: QRPhotoDrop folosește <strong>doar un cookie esențial de sesiune</strong>
          (necesar pentru autentificare) și o soluție de statistici <strong>fără cookie-uri</strong>.
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
            <strong>Cookie de autentificare (esențial):</strong> setat de Supabase la logare pentru a-ți
            menține sesiunea de organizator. Este un cookie <strong>persistent</strong> (nu se șterge la
            închiderea browserului): rămâne pe dispozitiv până la deconectare sau până la expirarea
            token-ului, fiind reîmprospătat automat cât timp ești activ. Fără el nu te poți loga, deci
            nu necesită consimțământ (strict necesar).
          </li>
        </ul>
        <p>
          Invitații care încarcă poze prin codul QR <strong>nu au nevoie de cont</strong> și nu li
          se setează cookie-uri de autentificare.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. Statistici fără cookie-uri</h2>
        <p>
          Folosim Vercel Analytics și Speed Insights pentru a înțelege traficul și performanța
          site-ului. Aceste instrumente <strong>nu setează cookie-uri</strong> și colectează date
          agregate (pagină accesată, tip de dispozitiv, performanță), fără a te identifica personal.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>4. Ce NU folosim</h2>
        <p>
          Nu folosim cookie-uri de publicitate, remarketing sau urmărire terță (fără Google
          Analytics, fără Meta/Facebook Pixel, fără instrumente similare).
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>5. Cum controlezi cookie-urile</h2>
        <p>
          Poți șterge sau bloca cookie-urile din setările browserului. Reține că dezactivarea
          cookie-ului de sesiune te va împiedica să te autentifici în cont.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. Contact</h2>
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
