export const env = {
  DATABASE_URL: process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL,
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export function validateEnv() {
  const isProd = env.NODE_ENV === 'production';
  const required = [
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    ...(isProd ? ['DATABASE_URL'] as const : []),
  ];

  const missing = required.filter(key => !env[key as keyof typeof env]);

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProd) {
      throw new Error(error);
    } else {
      console.error(error);
    }
  }
}
