import 'dotenv/config';

function getString(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getNumber(name: string, fallback?: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  const num = Number(raw);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid number for environment variable ${name}: ${raw}`);
  }
  return num;
}

export const env = {
  NODE_ENV: getString('NODE_ENV', 'development'),
  PORT: getNumber('PORT', 3001),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
  DB_STORAGE: process.env.DB_STORAGE ?? "./data.sqlite",
  JWT_SECRET: getString('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production'),
  JWT_EXPIRES_IN: getString('JWT_EXPIRES_IN', '24h'),
};
