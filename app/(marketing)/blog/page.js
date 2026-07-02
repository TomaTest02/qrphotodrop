import styles from './blog.module.css';
import { client } from '../../../sanity/lib/client';
import { urlForImage } from '../../../sanity/lib/image';

export const revalidate = 60; // ISR - forced rebuild for CSS

export const metadata = {
  title: 'Blog',
  description: 'Inspirație, sfaturi și tendințe pentru evenimentul tău perfect. Idei pentru nunți, botezuri și aniversări.',
  alternates: {
    canonical: 'https://qrphotodrop.com/blog',
  },
  openGraph: {
    title: 'Blog — QRPhotoDrop',
    description: 'Inspirație, sfaturi și tendințe pentru evenimentul tău perfect.',
    url: 'https://qrphotodrop.com/blog',
    type: 'website',
  },
};

const POSTS_QUERY = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
  title,
  "slug": slug.current,
  category,
  publishedAt,
  excerpt,
  mainImage
}`;

export default async function BlogPage() {
  const posts = await client.fetch(POSTS_QUERY);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Blog</span>
          <h1 className={styles.title}>Inspirație &amp; sfaturi utile</h1>
          <p className={styles.subtitle}>
            Idei, tendințe și povești pentru evenimentul tău perfect.
          </p>
        </div>

        <div className={styles.grid}>
          {posts.map((post) => {
            const dateStr = new Date(post.publishedAt || Date.now()).toLocaleDateString('ro-RO', {
              day: 'numeric', month: 'long', year: 'numeric'
            });

            const hasImage = !!post.mainImage?.asset;

            return (
              <article key={post.slug} className={styles.articleCard}>
                <div className={styles.coverPlaceholder} style={hasImage ? { backgroundImage: `url(${urlForImage(post.mainImage).width(600).url()})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!hasImage && <span className={styles.coverText}>Cover image</span>}
                </div>
                <div className={styles.content}>
                  <div className={styles.meta}>
                    <span className={styles.category}>{post.category || 'General'}</span>
                    <span className={styles.date}>{dateStr}</span>
                  </div>
                  <h2 className={styles.articleTitle}>
                    <a href={`/blog/${post.slug}`} className={styles.articleTitleLink}>{post.title}</a>
                  </h2>
                  <p className={styles.excerpt}>
                    {post.excerpt}
                  </p>
                  <a href={`/blog/${post.slug}`} className={styles.readMore}>
                    Citește articolul →
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
