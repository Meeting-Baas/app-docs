import * as OpenAPI from 'fumadocs-openapi';
import { rimraf } from 'rimraf';

export async function generateDocs() {
  // Clean up Meeting BaaS API reference directory
  await rimraf('./content/docs/api/reference', {
    filter(v) {
      return !v.endsWith('index.mdx') && !v.endsWith('meta.json');
    },
  });

  // Clean up Speaking Bots API reference directory
  await rimraf('./content/docs/speaking-bots/reference', {
    filter(v) {
      return !v.endsWith('index.mdx') && !v.endsWith('meta.json');
    },
  });

  await Promise.all([
    // Generate Meeting BaaS API docs
    OpenAPI.generateFiles({
      input: ['./openapi.json'],
      output: './content/docs/api/reference',
      per: 'operation',
      includeDescription: true,
      groupBy: 'tag',
    }),

    // Generate Speaking Bots API docs
    OpenAPI.generateFiles({
      input: ['./speaking-bots-openapi.json'],
      output: './content/docs/speaking-bots/reference',
      per: 'operation',
      includeDescription: true,
      groupBy: 'tag',
    }),
  ]);
}
