import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase, getPool } from './config/database.js';
import authRoutes from './routes/auth.js';
import storiesRoutes from './routes/stories.js';
import imagesRoutes from './routes/images.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 auth attempts per 15 minutes
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for image generation (more restrictive due to computational cost)
const imageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 image generations per 15 minutes
  message: { error: 'Too many image generation requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Large limit for story data with images
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Session configuration (will be set up after database connection)
let sessionMiddleware: express.RequestHandler;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes (session middleware will be added dynamically)
app.use('/api/auth', authLimiter, (req, res, next) => {
  if (sessionMiddleware) {
    sessionMiddleware(req, res, next);
  } else {
    res.status(503).json({ error: 'Server not ready' });
  }
}, authRoutes);

app.use('/api/stories', (req, res, next) => {
  if (sessionMiddleware) {
    sessionMiddleware(req, res, next);
  } else {
    res.status(503).json({ error: 'Server not ready' });
  }
}, storiesRoutes);

app.use('/api/images', imageLimiter, imagesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Set up session store with PostgreSQL
    const PgSession = connectPgSimple(session);
    const pool = getPool();

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      throw new Error('SESSION_SECRET environment variable is required');
    }

    sessionMiddleware = session({
      store: new PgSession({
        pool,
        tableName: 'session',
        createTableIfMissing: false, // We already created it in schema.sql
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800000'), // 7 days default
        sameSite: 'lax', // CSRF protection
      },
      name: 'connect.sid',
    });

    console.log('✅ Session middleware configured');

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Secure cookies: ${process.env.NODE_ENV === 'production'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
