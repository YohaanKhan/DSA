/** The database always lives under app/data/ — only the file name is configurable. */
export function dbFileName(): string {
  const raw = process.env.DB_FILE ?? 'exceller.sqlite';
  // Never let an env var walk out of the data directory.
  return raw.replace(/[/\\]/g, '_');
}
