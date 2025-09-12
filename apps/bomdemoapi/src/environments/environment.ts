export const environment = {
  production: false,
  port: process.env.PORT || 8000,
  apiPrefix: process.env.API_PREFIX || 'api',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    name: process.env.DATABASE_NAME || 'bomdemoapi_dev',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
};
