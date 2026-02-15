export const env = {
  DATABASE_URL: process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL,
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export function validateEnv() {
  const isProd = env.NODE_ENV === 'production';
  const required = [
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ];

  if (isProd) {
    required.push('DATABASE_URL');
  }

  const missing = required.filter(key => !env[key as keyof typeof env]);

  if (missing.length > 0) {
    const error = `❌ Missing required environment variables: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(error);
    } else {
      console.error(error);
    }
  }

  if (!env.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY is not set. AI features will not work.');
  }
}
