import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { connectDB } from './src/config/db.js';
import routes from './src/routes/index.js';
import { notFound, errorHandler } from './src/middleware/error.js';
import { isStorageConfigured } from './src/services/storage.js';
import { corsOrigins } from './src/config/origins.js';
import { sanitizeBody, csrfOriginGuard } from './src/middleware/security.js';

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 4000;

// Refuse to boot on a missing or weak signing secret: a guessable JWT_SECRET
// lets anyone mint an admin token.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random string of at least 32 characters.');
  process.exit(1);
}

const corsOptions = {
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.set('trust proxy', isProd ? 1 : 0);
app.disable('x-powered-by');
// This is a JSON API: it never serves pages, so the strictest CSP applies and
// nothing it returns can be framed or executed as a document.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
  },
  referrerPolicy: { policy: 'no-referrer' },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
}));
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(sanitizeBody);
app.use('/api', csrfOriginGuard(corsOrigins));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.get('/health', (req, res) => res.status(200).json({ ok: true }));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    // Media now lives in Google Cloud Storage. Say so at boot: without a
    // bucket every upload fails with a 503 and it is better to learn that
    // here than from the first admin who tries to add a product photo.
    console.log(
      isStorageConfigured()
        ? `Media storage: GCS bucket "${process.env.GCP_BUCKET_NAME}"`
        : 'Media storage: NOT CONFIGURED — set GCP_BUCKET_NAME to enable uploads'
    );

    await connectDB(process.env.MONGODB_URI);

    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Startup failed', err);
    process.exit(1);
  }
}
start();
