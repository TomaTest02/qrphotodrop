import styles from './post.module.css';
import { PortableText } from '@portabletext/react';
import { client } from '../../../../sanity/lib/client';
import { urlForImage } from '../../../../sanity/lib/image';

export const revalidate = 60; // ISR - forced rebuild

const POST_QUERY = `*[_type == "post" && slug.current == $slug][0] {
  title,
  "slug": slug.current,
  category,
  publishedAt,
  excerpt,
  mainImage,
  content,
  author,
  readTime,
  seoTitle,
  seoDescription,
  canonicalUrl,
  tags
}`;

export async function generateStaticParams() {
  const slugs = await client.fetch(`*[_type == "post" && defined(slug.current)][].slug.current`);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await client.fetch(POST_QUERY, { slug });
  
  if (!post) return { title: 'Articol negăsit' };

  const metaTitle = post.seoTitle || post.title;
  const metaDesc = post.seoDescription || post.excerpt;
  const canonical = post.canonicalUrl || `https://qrphotodrop.ro/blog/${slug}`;
  const ogImage = post.mainImage?.asset ? urlForImage(post.mainImage).width(1200).height(630).url() : undefined;

  return {
    title: metaTitle,
    description: metaDesc,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      title: `${metaTitle} — QRPhotoDrop Blog`,
      description: metaDesc,
      url: `https://qrphotodrop.ro/blog/${slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author || 'QRPhotoDrop Team'],
      tags: post.tags || [post.category, 'evenimente'],
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDesc,
      images: ogImage ? [ogImage] : [],
    },
  };
}

const portableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return null;
      return (
        <div style={{ margin: '2rem 0', borderRadius: '12px', overflow: 'hidden' }}>
          <img
            src={urlForImage(value).width(800).url()}
            alt={value.alt || 'Imagine articol blog'}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            loading="lazy"
          />
        </div>
      );
    },
  },
  block: {
    // Dacă utilizatorul adaugă un H1 în conținut, îl transformăm într-un subtitlu elegant pentru a evita duplicarea vizuală cu titlul paginii
    h1: ({ children }) => (
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: '400', 
        color: '#6B7280', 
        marginTop: 0, 
        marginBottom: '32px',
        lineHeight: '1.4',
        fontFamily: 'var(--font-sans, sans-serif)'
      }}>
        {children}
      </h2>
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const rel = !value.href.startsWith('/') ? 'noreferrer noopener' : undefined;
      return (
        <a href={value.href} rel={rel} target={!value.href.startsWith('/') ? '_blank' : undefined} style={{ color: 'var(--brand)', textDecoration: 'underline' }}>
          {children}
        </a>
      );
    },
  },
};

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await client.fetch(POST_QUERY, { slug });

  if (!post) {
    return (
      <div className={styles.notFound}>
        <h1>Articol negăsit</h1>
      </div>
    );
  }

  const dateStr = new Date(post.publishedAt || Date.now()).toLocaleDateString('ro-RO', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const metaDesc = post.seoDescription || post.excerpt;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.seoTitle || post.title,
    description: metaDesc,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Organization',
      name: post.author || 'QRPhotoDrop Team',
      url: 'https://qrphotodrop.ro',
    },
    publisher: {
      '@type': 'Organization',
      name: 'QRPhotoDrop',
      url: 'https://qrphotodrop.ro',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://qrphotodrop.ro/blog/${slug}`,
    },
    articleSection: post.category,
    inLanguage: 'ro-RO',
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Acasă',
        item: 'https://qrphotodrop.ro/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://qrphotodrop.ro/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.category || 'General',
        item: 'https://qrphotodrop.ro/blog',
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: post.title,
        item: `https://qrphotodrop.ro/blog/${slug}`,
      },
    ],
  };

  return (
    <article className={styles.article}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="breadcrumb" style={{ marginBottom: '32px', fontSize: '14px', fontWeight: '500', color: '#6B7280' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <li style={{ display: 'inline-flex', alignItems: 'center' }}><a href="/" style={{ color: '#4B5563', textDecoration: 'none' }}>Acasă</a></li>
          <li style={{ color: '#D1D5DB', fontSize: '12px' }}>/</li>
          <li style={{ display: 'inline-flex', alignItems: 'center' }}><a href="/blog" style={{ color: '#4B5563', textDecoration: 'none' }}>Blog</a></li>
          {post.category && (
            <>
              <li style={{ color: '#D1D5DB', fontSize: '12px' }}>/</li>
              <li style={{ display: 'inline-flex', alignItems: 'center' }}>{post.category}</li>
            </>
          )}
          <li style={{ color: '#D1D5DB', fontSize: '12px' }}>/</li>
          <li aria-current="page" style={{ color: '#111827', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{post.title}</li>
        </ul>
      </nav>
      
      {post.mainImage?.asset && (
        <div style={{ marginBottom: '2rem', borderRadius: '16px', overflow: 'hidden', maxHeight: '500px' }}>
          <img 
            src={urlForImage(post.mainImage).width(1200).url()} 
            alt={post.mainImage.alt || post.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      <div className={styles.meta}>
        <span className={styles.category}>
          {post.category || 'General'}
        </span>
        <time dateTime={post.publishedAt} className={styles.date}>{dateStr}</time>
        {post.readTime && <span className={styles.date} style={{marginLeft: '1rem'}}>· {post.readTime}</span>}
      </div>
      
      <h1 className={styles.title}>
        {post.title}
      </h1>
      
      <div className={styles.content}>
        {post.content ? (
          <PortableText value={post.content} components={portableTextComponents} />
        ) : (
          <p>Acest articol nu are conținut încă.</p>
        )}
      </div>
      
      <div className={styles.footer}>
        <a href="/blog" className={styles.backLink}>← Înapoi la blog</a>
      </div>
    </article>
  );
}
