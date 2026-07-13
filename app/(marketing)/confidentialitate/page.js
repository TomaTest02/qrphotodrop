import styles from '../termeni/termeni.module.css';

export const metadata = {
  title: 'Politica de Confidențialitate · QRPhotoDrop',
  description:
    'Cum colectează, folosește și protejează QRPhotoDrop datele personale, conform GDPR (Regulamentul UE 2016/679).',
  robots: { index: true, follow: true },
};

export default function ConfidentialitatePage() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Politica de Confidențialitate</h1>
      <p className={styles.meta}>Ultima actualizare: 12 iulie 2026</p>

      <div className={styles.disclaimer}>
        <p>
          Această politică explică ce date personale prelucrăm prin platforma QRPhotoDrop, în ce
          scop, cui le divulgăm, cât timp le păstrăm și ce drepturi ai. Prelucrăm datele conform
          Regulamentului (UE) 2016/679 (GDPR).
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.h2}>1. Operatorul datelor</h2>
        <p>
          Platforma QRPhotoDrop (qrphotodrop.com) este operată de echipa QRPhotoDrop
          („Operatorul", „noi"). Pentru orice întrebare privind datele personale ne poți contacta
          la <a href="mailto:qrphotodrop@gmail.com">qrphotodrop@gmail.com</a> sau la
          +40 (720) 726 619.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>2. Ce date colectăm</h2>
        <p><strong>De la organizatori (titularii de cont):</strong></p>
        <ul>
          <li>nume, adresă de email, număr de telefon;</li>
          <li>detaliile evenimentului (nume eveniment, tip, dată, numele cuplului, locație);</li>
          <li>parola (stocată doar sub formă criptată/hash, niciodată în clar).</li>
        </ul>
        <p><strong>De la invitați:</strong></p>
        <ul>
          <li>fotografiile și clipurile video pe care le încarcă (care pot conține imagini ale unor persoane);</li>
          <li>urările lăsate: prenume, nume, email (opțional) și mesajul.</li>
        </ul>
        <p><strong>Din formularul de contact / cererile de printare:</strong> nume, email, telefon și mesajul transmis.</p>
        <p><strong>Date tehnice:</strong> un cookie de sesiune necesar autentificării; adresa IP este folosită temporar, doar pentru prevenirea abuzurilor, și <strong>nu este stocată</strong> în baza de date. Folosim Vercel Analytics, o soluție de statistici <strong>fără cookie-uri</strong>. Nu folosim instrumente de urmărire publicitară (Google Analytics, Meta Pixel etc.).</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. Scopurile și temeiul legal</h2>
        <ul>
          <li><strong>Furnizarea serviciului</strong> (crearea paginii de eveniment, colectarea și afișarea conținutului) — executarea contractului;</li>
          <li><strong>Gestionarea contului</strong> și comunicările legate de serviciu — executarea contractului;</li>
          <li><strong>Securitate și prevenirea abuzurilor</strong> — interesul nostru legitim;</li>
          <li><strong>Respectarea obligațiilor legale</strong> — obligație legală.</li>
        </ul>
        <p>
          Fotografiile invitaților sunt colectate la inițiativa și pe răspunderea organizatorului
          evenimentului, care are obligația de a informa persoanele implicate și, unde este cazul,
          de a obține consimțământul lor.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>4. Cui divulgăm datele (procesatori)</h2>
        <p>Pentru a furniza serviciul, folosim furnizori terți de încredere care acționează ca persoane împuternicite:</p>
        <ul>
          <li><strong>Supabase</strong> — bază de date și autentificare;</li>
          <li><strong>Cloudflare R2</strong> — stocarea fotografiilor și clipurilor;</li>
          <li><strong>Vercel</strong> — găzduirea platformei și statistici de trafic;</li>
          <li><strong>Resend</strong> — trimiterea emailurilor tranzacționale.</li>
        </ul>
        <p>Nu vindem și nu închiriem datele personale nimănui.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>5. Transferuri internaționale</h2>
        <p>
          Unii dintre furnizorii de mai sus pot prelucra date pe servere aflate în afara Uniunii
          Europene. În aceste cazuri, transferul se face pe baza garanțiilor prevăzute de GDPR
          (de exemplu, clauzele contractuale standard ale Comisiei Europene).
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. Cât timp păstrăm datele</h2>
        <ul>
          <li><strong>Fotografii și clipuri:</strong> o perioadă limitată, în funcție de pachetul ales, după care sunt șterse automat. Îți recomandăm să descarci arhiva înainte de expirare.</li>
          <li><strong>Datele contului:</strong> pe durata existenței contului; le ștergem la cererea ta sau când contul devine inactiv.</li>
          <li><strong>Mesaje de contact:</strong> atât cât este necesar pentru a răspunde solicitării.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>7. Drepturile tale</h2>
        <p>Conform GDPR, ai dreptul la: acces, rectificare, ștergere („dreptul de a fi uitat"), restricționarea prelucrării, opoziție și portabilitatea datelor.</p>
        <p>
          Îți poți exercita drepturile trimițând un email la{' '}
          <a href="mailto:qrphotodrop@gmail.com">qrphotodrop@gmail.com</a>. Ai, de asemenea,
          dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării
          Datelor cu Caracter Personal (ANSPDCP).
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>8. Securitatea datelor</h2>
        <p>
          Folosim conexiuni criptate (HTTPS), acces restricționat la nivel de rând în baza de date,
          coduri unice per eveniment și încărcări securizate direct către stocare. Cu toate acestea,
          niciun sistem nu este 100% sigur — vezi și Termenii și Condițiile.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>9. Cookie-uri</h2>
        <p>
          Folosim doar un cookie esențial de sesiune (pentru autentificare) și statistici fără
          cookie-uri. Detalii în <a href="/cookies">Politica de Cookies</a>.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>10. Copii</h2>
        <p>
          Platforma se adresează adulților (organizatori de evenimente). Fotografiile încărcate de
          invitați pot include copii; responsabilitatea de a obține acordul părinților/tutorilor
          revine organizatorului și persoanei care încarcă.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>11. Modificări</h2>
        <p>
          Putem actualiza această politică. Versiunea în vigoare este cea publicată pe această
          pagină, cu data ultimei actualizări afișată sus.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>12. Contact</h2>
        <div className={styles.contact}>
          <p>
            Pentru orice întrebare privind datele personale:{' '}
            <a href="mailto:qrphotodrop@gmail.com">qrphotodrop@gmail.com</a> · +40 (720) 726 619.
          </p>
        </div>
      </section>
    </div>
  );
}
