import styles from './termeni.module.css';

export const metadata = {
  title: 'Termeni și Condiții · QRPhotoDrop',
  description:
    'Termenii și condițiile de utilizare a platformei QRPhotoDrop. Serviciul este furnizat „ca atare", iar utilizatorul își asumă riscul folosirii.',
  robots: { index: true, follow: true },
};

export default function TermeniPage() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Termeni și Condiții</h1>
      <p className={styles.meta}>Ultima actualizare: 11 iulie 2026</p>

      <div className={styles.disclaimer}>
        <p>
          Pe scurt: QRPhotoDrop este un serviciu de colectare a fotografiilor și clipurilor
          la evenimente, furnizat <strong>„ca atare" (as is)</strong>, fără nicio garanție.
          Prin utilizarea platformei, îți asumi integral riscul folosirii, iar QRPhotoDrop
          <strong> nu răspunde</strong> pentru pierderea datelor, întreruperi, indisponibilitate
          sau orice prejudiciu rezultat din utilizare, în măsura maximă permisă de lege. Ești
          responsabil să păstrezi propriile copii ale fișierelor importante.
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.h2}>1. Cine suntem</h2>
        <p>
          Platforma QRPhotoDrop (denumită în continuare „Platforma", „Serviciul" sau
          „QRPhotoDrop"), disponibilă la adresa qrphotodrop.com, este deținută și operată de{' '}
          <strong>CYBERNOVA SYSTEMS S.R.L.</strong> (CIF 52112503, Reg. com. J2025049555001),
          denumită în continuare „Operatorul" sau „noi". Ne poți contacta la{' '}
          <a href="mailto:qrphotodrop@gmail.com">qrphotodrop@gmail.com</a>.
        </p>
        <p>
          Acești Termeni și Condiții („Termenii") reglementează relația dintre Operator și
          orice persoană care creează un cont, administrează un eveniment sau încarcă
          conținut prin intermediul Platformei („Utilizatorul", „tu").
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>2. Acceptarea Termenilor</h2>
        <p>
          Crearea unui cont și utilizarea Platformei presupun <strong>acceptarea expresă și
          integrală</strong> a acestor Termeni. La înregistrare, bifarea căsuței de acceptare
          confirmă că ai citit, ai înțeles și ești de acord cu prezentul document. Dacă nu
          ești de acord cu oricare dintre prevederi, te rugăm să nu folosești Platforma.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. Descrierea Serviciului</h2>
        <p>
          QRPhotoDrop permite organizatorilor de evenimente (nunți, botezuri, aniversări,
          evenimente corporate) să creeze o pagină și un cod QR prin care invitații pot
          încărca fotografii, clipuri video și mesaje. Conținutul este stocat la furnizori
          terți de infrastructură și poate fi vizualizat într-o galerie asociată evenimentului.
        </p>
        <p>
          Serviciul este oferit în limitele pachetului ales (spațiu de stocare, număr de
          invitați etc.) și poate fi modificat, suspendat sau întrerupt, integral sau parțial,
          în orice moment, fără notificare prealabilă.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>4. Contul și eligibilitatea</h2>
        <ul>
          <li>Trebuie să ai cel puțin 18 ani și capacitate deplină de exercițiu pentru a crea un cont.</li>
          <li>Ești responsabil pentru exactitatea datelor furnizate la înregistrare.</li>
          <li>Ești singurul responsabil pentru confidențialitatea parolei și pentru toate activitățile desfășurate prin contul tău.</li>
          <li>Conturile noi pot fi supuse aprobării manuale; nu garantăm activarea oricărui cont.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>5. Serviciul este furnizat „ca atare"</h2>
        <p>
          În măsura maximă permisă de legea aplicabilă, Serviciul este furnizat{' '}
          <strong>„ca atare" (as is) și „așa cum este disponibil" (as available)</strong>, fără
          garanții de niciun fel, exprese sau implicite. Operatorul nu garantează că:
        </p>
        <ul>
          <li>Serviciul va funcționa neîntrerupt, la timp, în siguranță sau fără erori;</li>
          <li>fișierele încărcate vor fi păstrate, stocate corect, integre sau recuperabile;</li>
          <li>eventualele defecte vor fi corectate;</li>
          <li>Serviciul va îndeplini așteptările sau cerințele tale specifice.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. Disponibilitate, întreruperi și pierderea datelor</h2>
        <p>
          Nu oferim nicio garanție de disponibilitate (uptime). Serviciul poate fi indisponibil
          din cauza mentenanței, actualizărilor, limitărilor furnizorilor terți, incidentelor
          tehnice sau a altor cauze aflate în afara controlului nostru.
        </p>
        <p>
          <strong>QRPhotoDrop nu este un serviciu de backup.</strong> Ești pe deplin responsabil
          să descarci și să păstrezi propriile copii ale fotografiilor, clipurilor și mesajelor
          importante. Nu răspundem pentru pierderea, coruperea, ștergerea sau imposibilitatea de
          a recupera conținutul, indiferent de cauză.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>7. Stocarea la parteneri terți</h2>
        <p>
          Pentru a furniza Serviciul, folosim furnizori terți de încredere pentru găzduire,
          bază de date și stocarea fișierelor (de exemplu Cloudflare, Supabase, Vercel).
          Conținutul și datele sunt stocate pe infrastructura acestor parteneri.
        </p>
        <p>
          Deși alegem furnizori de renume, <strong>nu controlăm și nu răspundem</strong> pentru
          disponibilitatea, securitatea, întreruperile, pierderile de date sau breșele produse
          la nivelul acestor terți. Utilizarea Platformei implică acceptarea acestui model de
          stocare la parteneri.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>8. Responsabilitățile Utilizatorului asupra conținutului</h2>
        <p>Ești singurul responsabil pentru tot conținutul asociat evenimentului tău. În mod expres, garantezi că:</p>
        <ul>
          <li>deții toate drepturile necesare asupra conținutului încărcat sau colectat și că acesta nu încalcă drepturi de autor, mărci sau alte drepturi ale terților;</li>
          <li>ai obținut <strong>consimțământul persoanelor</strong> care apar în fotografii și clipuri pentru colectarea și afișarea acestora, conform legislației aplicabile;</li>
          <li>conținutul nu este ilegal, defăimător, obscen, ofensator și nu încalcă drepturile sau demnitatea vreunei persoane;</li>
          <li>vei informa invitații cu privire la modul în care sunt colectate și folosite fotografiile lor;</li>
          <li><strong>promovarea evenimentului către invitați îți revine exclusiv ție</strong> — afișarea codului QR/link-ului, anunțarea invitaților și încurajarea lor să încarce poze și clipuri. QRPhotoDrop pune la dispoziție platforma, dar nu garantează și nu influențează câți invitați încarcă conținut.</li>
        </ul>
        <p>
          Ne rezervăm dreptul, fără a avea însă obligația, de a elimina orice conținut care
          încalcă acești Termeni sau legea.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>9. Conținutul încărcat de invitați</h2>
        <p>
          Paginile de încărcare pot fi accesate de invitații evenimentului prin cod QR sau link.
          Conținutul încărcat de invitați este furnizat de aceștia pe propria răspundere.
          Operatorul nu monitorizează, nu verifică și nu răspunde pentru conținutul încărcat de
          invitați. În calitate de organizator, ești responsabil pentru gestionarea și
          moderarea conținutului evenimentului tău.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>10. Limitarea răspunderii</h2>
        <p>
          În măsura maximă permisă de legea aplicabilă, Operatorul, administratorii, angajații
          și partenerii săi <strong>nu vor fi răspunzători</strong> pentru niciun fel de daune
          directe, indirecte, incidentale, speciale, punitive sau subsecvente, incluzând, fără
          limitare:
        </p>
        <ul>
          <li>pierderea, coruperea sau indisponibilitatea fotografiilor, clipurilor, mesajelor sau a oricăror date;</li>
          <li>pierderea unor amintiri, oportunități, profit, fond comercial sau economii anticipate;</li>
          <li>întreruperi ale Serviciului sau imposibilitatea de a-l accesa;</li>
          <li>fapte, omisiuni sau incidente ale furnizorilor terți;</li>
          <li>accesul neautorizat la conținutul sau datele tale.</li>
        </ul>
        <p>
          Acolo unde legea nu permite excluderea totală a răspunderii, răspunderea Operatorului
          este limitată la <strong>suma efectiv plătită de tine către QRPhotoDrop în ultimele 3
          luni</strong> pentru serviciul în cauză, aceasta fiind și limita maximă agregată a
          răspunderii noastre.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>11. Asumarea riscului</h2>
        <p>
          Înțelegi și accepți în mod expres că utilizarea Platformei se face pe{' '}
          <strong>riscul tău exclusiv</strong>. Ești conștient că orice serviciu digital poate
          prezenta erori, întreruperi sau pierderi de date și îți asumi integral acest risc,
          inclusiv riscul de a nu putea recupera conținutul unui eveniment.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>12. Despăgubire</h2>
        <p>
          Ești de acord să aperi, să despăgubești și să menții indemn Operatorul și partenerii
          săi împotriva oricăror pretenții, cereri, pierderi, cheltuieli sau costuri (inclusiv
          onorarii avocațiale rezonabile) care decurg din: (a) utilizarea de către tine a
          Platformei; (b) conținutul asociat evenimentului tău; (c) încălcarea acestor Termeni;
          sau (d) încălcarea drepturilor unui terț, inclusiv lipsa consimțământului persoanelor
          din fotografii.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>13. Date cu caracter personal (GDPR)</h2>
        <p>
          Prelucrăm datele personale conform legislației aplicabile privind protecția datelor
          (Regulamentul UE 2016/679 – GDPR). Furnizorii terți de infrastructură acționează în
          calitate de persoane împuternicite pentru stocarea datelor.
        </p>
        <p>
          În calitate de organizator care colectează fotografii și date ale invitaților, ai
          propriile obligații legale față de aceștia (informare și, unde este cazul, obținerea
          consimțământului). Prezenta clauză nu înlătură drepturile imperative pe care legislația
          privind protecția datelor le acordă persoanelor vizate.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>14. Păstrarea și ștergerea datelor</h2>
        <p>
          Conținutul asociat unui eveniment este păstrat pe o perioadă limitată de timp, după
          care poate fi șters definitiv fără notificare. Îți recomandăm să descarci și să
          arhivezi conținutul important cât mai curând după eveniment. Putem șterge conturi și
          conținut inactive sau care încalcă acești Termeni.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>15. Plăți și pachete</h2>
        <p>
          Accesul la anumite funcționalități depinde de pachetul ales. Detaliile privind
          prețurile și modalitatea de plată sunt comunicate separat. Cu excepția cazurilor
          prevăzute expres de lege, sumele achitate nu sunt rambursabile.
        </p>
        <p>
          Prețul acoperă accesul la Serviciu (pagina evenimentului, codul QR și spațiul de
          stocare al pachetului), <strong>nu un rezultat garantat</strong>. Câte poze sau clipuri
          încarcă invitații depinde exclusiv de modul în care îți promovezi evenimentul.
          <strong> Participarea redusă sau lipsa încărcărilor din partea invitaților NU constituie
          motiv de rambursare</strong>, atât timp cât platforma a fost disponibilă și funcțională.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>16. Forță majoră</h2>
        <p>
          Operatorul nu răspunde pentru neexecutarea sau executarea necorespunzătoare a
          obligațiilor cauzate de evenimente aflate în afara controlului său rezonabil,
          incluzând, fără limitare: pene de curent sau internet, defecțiuni ale furnizorilor
          terți, atacuri cibernetice, calamități, dispoziții ale autorităților sau alte cazuri
          de forță majoră.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>17. Modificarea Termenilor</h2>
        <p>
          Putem modifica acești Termeni oricând. Versiunea actualizată devine aplicabilă din
          momentul publicării pe această pagină. Continuarea utilizării Platformei după
          publicare constituie acceptarea noilor Termeni.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>18. Suspendarea și încetarea</h2>
        <p>
          Putem suspenda sau închide accesul la cont, integral sau parțial, imediat și fără
          notificare, în cazul încălcării acestor Termeni, al utilizării abuzive a Serviciului
          sau din motive tehnice ori legale.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>19. Legea aplicabilă și litigiile</h2>
        <p>
          Acești Termeni sunt guvernați de legea română. Orice litigiu decurgând din sau în
          legătură cu utilizarea Platformei va fi soluționat pe cale amiabilă, iar în lipsa unei
          soluții, de către instanțele competente din România. Dacă o clauză este considerată
          nulă sau inaplicabilă, celelalte clauze rămân în vigoare.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>20. Contact</h2>
        <div className={styles.contact}>
          <p>
            Pentru întrebări legate de acești Termeni ne poți contacta la:{' '}
            <a href="mailto:qrphotodrop@gmail.com">qrphotodrop@gmail.com</a> · +40 (720) 726 619.
          </p>
        </div>
      </section>
    </div>
  );
}
