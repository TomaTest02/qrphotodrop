export const post = {
  name: 'post',
  title: 'Articol Blog',
  type: 'document',
  groups: [
    { name: 'content', title: '📝 Conținut', default: true },
    { name: 'seo', title: '🔍 SEO' },
  ],
  fields: [
    // ==========================================
    // GRUP: CONȚINUT
    // ==========================================
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'language',
      title: 'Language',
      type: 'string',
      group: 'content',
      options: {
        list: [
          { title: 'Română', value: 'ro' },
          { title: 'English', value: 'en' },
        ],
      },
      initialValue: 'ro',
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      group: 'content',
      rows: 3,
      validation: (Rule) => Rule.max(200),
    },
    {
      name: 'mainImage',
      title: 'Cover Image',
      type: 'image',
      group: 'content',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          title: 'Alternative Text',
          description: 'Important for SEO and accessibility',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }
      ]
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'content',
      options: {
        list: [
          { title: 'Nuntă', value: 'Nuntă' },
          { title: 'Botez', value: 'Botez' },
          { title: 'Aniversare', value: 'Aniversare' },
          { title: 'Corporate', value: 'Corporate' },
          { title: 'Sfaturi', value: 'Sfaturi' },
        ],
      },
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'content',
      of: [{ type: 'string' }],
      options: { layout: 'tags' }
    },
    {
      name: 'author',
      title: 'Author',
      type: 'string',
      group: 'content',
      initialValue: 'QRPhotoDrop Team',
    },
    {
      name: 'readTime',
      title: 'Read Time',
      type: 'string',
      group: 'content'
    },
    {
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'content',
      initialValue: () => new Date().toISOString(),
    },
    {
      name: 'content',
      title: 'Body',
      type: 'array',
      group: 'content',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } }
      ],
    },

    // ==========================================
    // GRUP: SEO
    // ==========================================
    {
      name: 'seoTitle',
      title: 'Meta Title',
      type: 'string',
      group: 'seo',
      description: 'Optim: sub 60 de caractere.',
      validation: (Rule) => Rule.max(60).warning('Dacă depășești 60 de caractere, Google ar putea trunchia titlul.'),
    },
    {
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      group: 'seo',
      description: 'Opțional. URL original pentru duplicate content.',
    },
    {
      name: 'seoDescription',
      title: 'Meta Description',
      type: 'text',
      group: 'seo',
      rows: 3,
      description: 'Apare în Google. Optim: sub 160 de caractere.',
      validation: (Rule) => Rule.max(160).warning('O descriere prea lungă va fi tăiată de Google (...).'),
    }
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
      subtitle: 'category',
    },
  },
};
