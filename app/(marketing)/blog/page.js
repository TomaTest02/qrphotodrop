import styles from './blog.module.css';

export const metadata = {
  title: 'Blog — QRPhotoDrop',
  description: 'Inspirație, sfaturi și tendințe pentru evenimentul tău perfect.',
};

const POSTS = [
  { slug: '5-idei-creative-poze-invitati', category: 'Nuntă', title: '5 idei creative pentru a colecta pozele de la invitați', excerpt: 'Descoperă metode moderne de a aduna cele mai frumoase amintiri de la nunta ta.', date: '15 Mai 2026' },
  { slug: 'cum-sa-organizezi-botez-memorabil', category: 'Botez', title: 'Cum să organizezi un botez memorabil', excerpt: 'Ghidul complet pentru organizatorii care vor să surprindă prin eleganță.', date: '8 Mai 2026' },
  { slug: 'cod-qr-viitorul-evenimentelor', category: 'Sfaturi', title: 'De ce codul QR este viitorul evenimentelor', excerpt: 'Un simplu cod poate transforma complet felul în care colectezi amintiri.', date: '28 Aprilie 2026' },
];

export default function BlogPage() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Blog</span>
          <h1 className={styles.title}>Inspirație & sfaturi utile</h1>
          <p className={styles.subtitle}>
            Idei, tendințe și povești pentru evenimentul tău perfect.
          </p>
        </div>

        <div className={styles.grid}>
          {POSTS.map((post) => (
            <article key={post.slug} className={styles.articleCard}>
              <div className={styles.coverPlaceholder}>
                <span className={styles.coverText}>Cover image</span>
              </div>
              <div className={styles.content}>
                <div className={styles.meta}>
                  <span className={styles.category}>{post.category}</span>
                  <span className={styles.date}>{post.date}</span>
                </div>
                <h3 className={styles.articleTitle}>
                  <a href={`/blog/${post.slug}`} className={styles.articleTitleLink}>{post.title}</a>
                </h3>
                <p className={styles.excerpt}>
                  {post.excerpt}
                </p>
                <a href={`/blog/${post.slug}`} className={styles.readMore}>
                  Citește articolul →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
