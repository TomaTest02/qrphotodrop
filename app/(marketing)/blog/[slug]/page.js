const POSTS = {
  '5-idei-creative-poze-invitati': {
    title: '5 idei creative pentru a colecta pozele de la invitați',
    category: 'Nuntă',
    date: '15 Mai 2026',
    content: `
## 1. Codul QR pe cartonașe elegante

Printează codul QR pe cartonașe elegante și pune-le pe fiecare masă. Invitații le scanează direct cu camera telefonului și încarcă poze în câteva secunde.

## 2. Panou decorativ cu QR

Un panou mare la intrare, coordonat cu tema evenimentului, care invită oaspeții să scaneze și să contribuie la albumul digital.

## 3. Link pe WhatsApp

Trimite linkul direct pe grupul de WhatsApp al evenimentului. Simplu, rapid, fără aplicații suplimentare.

## 4. Ecran digital interactiv

Afișează codul QR pe un ecran la photobooth sau lângă candy bar. Invitații pot scana și încărca instant.

## 5. Meniuri personalizate

Integrează codul QR în meniul evenimentului — invitații îl văd natural în timp ce răsfoiesc opțiunile culinare.
    `,
  },
  'cum-sa-organizezi-botez-memorabil': {
    title: 'Cum să organizezi un botez memorabil',
    category: 'Botez',
    date: '8 Mai 2026',
    content: `
## Planificarea perfectă

Un botez memorabil începe cu o planificare atentă. Stabilește tema, locația și lista de invitați cu cel puțin 3 luni înainte.

## Detalii care contează

Atenția la detalii face diferența: de la candy bar tematic până la cartonașe cu QR code pentru colectarea pozelor.

## Amintiri digitale

Cu QRPhotoDrop, nașii și bunicii pot trimite poze și urări direct din browser. Totul se adună automat într-un album digital frumos.
    `,
  },
  'cod-qr-viitorul-evenimentelor': {
    title: 'De ce codul QR este viitorul evenimentelor',
    category: 'Sfaturi',
    date: '28 Aprilie 2026',
    content: `
## Simplu și universal

Fiecare smartphone modern poate scana un cod QR fără aplicații suplimentare. Zero fricțiune pentru invitați.

## Calitate superioară

Spre deosebire de WhatsApp care comprimă pozele, QRPhotoDrop păstrează calitatea originală a fiecărei fotografii.

## Totul centralizat

Nu mai cauți prin 10 grupuri de WhatsApp. Toate pozele, clipurile și urările sunt într-un singur loc, accesibil instant.
    `,
  },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = POSTS[slug];
  return {
    title: post ? `${post.title} — QRPhotoDrop Blog` : 'Articol negăsit',
    description: post ? post.content.slice(0, 160) : '',
  };
}

import styles from './post.module.css';

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = POSTS[slug];

  if (!post) {
    return (
      <div className={styles.notFound}>
        <h1>Articol negăsit</h1>
      </div>
    );
  }

  return (
    <article className={styles.article}>
      <div className={styles.meta}>
        <span className={styles.category}>
          {post.category}
        </span>
        <span className={styles.date}>{post.date}</span>
      </div>
      <h1 className={styles.title}>
        {post.title}
      </h1>
      <div
        className={styles.content}
        dangerouslySetInnerHTML={{
          __html: post.content
            .replace(/## (.*)/g, '<h2>$1</h2>')
            .replace(/\n\n/g, '</p><p>')
        }}
      />
      <div className={styles.footer}>
        <a href="/blog" className={styles.backLink}>← Înapoi la blog</a>
      </div>
    </article>
  );
}
