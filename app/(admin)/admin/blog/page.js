'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './blog-admin.module.css';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', slug: '', category: '', excerpt: '', content: '', published: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPosts(); }, []);

  async function loadPosts() {
    const supabase = createClient();
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }

  const handleSave = async (e) => {
    e.preventDefault();
    const supabase = createClient();
    if (editing) {
      await supabase.from('blog_posts').update(form).eq('id', editing);
    } else {
      await supabase.from('blog_posts').insert(form);
    }
    setEditing(null);
    setForm({ title: '', slug: '', category: '', excerpt: '', content: '', published: false });
    loadPosts();
  };

  const handleEdit = (post) => {
    setEditing(post.id);
    setForm({ title: post.title, slug: post.slug, category: post.category, excerpt: post.excerpt, content: post.content, published: post.published });
  };

  const handleDelete = async (id) => {
    if (!confirm('Sigur vrei să ștergi acest articol?')) return;
    const supabase = createClient();
    await supabase.from('blog_posts').delete().eq('id', id);
    loadPosts();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Blog CMS
        </h1>
        <button
          onClick={() => { setEditing(null); setForm({ title: '', slug: '', category: '', excerpt: '', content: '', published: false }); }}
          className={styles.primaryBtn}
        >
          + Articol Nou
        </button>
      </div>

      {/* Editor */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          {editing ? 'Editează articol' : 'Articol nou'}
        </h3>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Titlu</label>
              <input className={styles.input} value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Slug</label>
              <input className={styles.input} value={form.slug} onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))} required placeholder="url-slug" />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Categorie</label>
              <input className={styles.input} value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} />
            </div>
            <div className={styles.checkboxWrap}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={form.published} onChange={(e) => setForm(p => ({ ...p, published: e.target.checked }))} />
                Publicat
              </label>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Extras</label>
            <input className={styles.input} value={form.excerpt} onChange={(e) => setForm(p => ({ ...p, excerpt: e.target.value }))} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Conținut (Markdown)</label>
            <textarea className={styles.textarea} value={form.content} onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))} />
          </div>
          <button type="submit" className={styles.submitBtn}>
            {editing ? 'Actualizează' : 'Publică'}
          </button>
        </form>
      </div>

      {/* Posts list */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          Articole ({posts.length})
        </h3>
        {loading ? (
          <p className={styles.loadingState}>Se încarcă...</p>
        ) : posts.length === 0 ? (
          <p className={styles.emptyState}>Niciun articol încă</p>
        ) : (
          <div className={styles.postsList}>
            {posts.map((post) => (
              <div key={post.id} className={styles.postItem}>
                <div>
                  <p className={styles.postTitle}>{post.title}</p>
                  <p className={styles.postMeta}>
                    {post.category} · {post.published ? '✅ Publicat' : '📝 Draft'}
                  </p>
                </div>
                <div className={styles.actionsGroup}>
                  <button onClick={() => handleEdit(post)} className={`${styles.actionBtn} ${styles.editBtn}`}>
                    Editează
                  </button>
                  <button onClick={() => handleDelete(post.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`}>
                    Șterge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
