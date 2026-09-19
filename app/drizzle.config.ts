import type { Config } from 'drizzle-kit';

const dbFile = (process.env.DB_FILE ?? 'exceller.sqlite').replace(/[/\\]/g, '_');

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: `data/${dbFile}` },
} satisfies Config;
