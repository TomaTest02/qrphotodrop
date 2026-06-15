import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schema } from './sanity/schema';
import { projectId, dataset } from './sanity/env';

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  
  title: 'QRPhotoDrop CMS',

  plugins: [
    structureTool(),
  ],

  schema: {
    types: schema.types,
  },
});
