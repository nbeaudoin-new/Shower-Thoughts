import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { transcribeAudio } from './transcribe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Allowed audio MIME types
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'video/mp4', // Some browsers report m4a as video/mp4
]);

const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.mp4']);

// Configure multer for temp file storage
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB — Whisper API limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Please upload an MP3, WAV, or M4A file.`));
    }
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided.' });
  }

  const tempPath = req.file.path;
  const originalName = req.file.originalname;

  try {
    console.log(`[transcribe] Processing: ${originalName} (${(req.file.size / 1024).toFixed(1)} KB)`);

    const result = await transcribeAudio(tempPath, originalName);

    console.log(`[transcribe] Done. Organization: ${result.organization}, Clients: ${result.clients.join(', ') || 'none'}`);

    return res.json(result);
  } catch (err) {
    console.error('[transcribe] Error:', err.message);

    // Surface OpenAI API errors clearly
    if (err.status && err.error) {
      return res.status(502).json({
        error: `OpenAI API error: ${err.error.message || err.message}`,
      });
    }

    return res.status(500).json({ error: err.message || 'Transcription failed.' });
  } finally {
    // Always clean up the temp file
    fs.unlink(tempPath, (unlinkErr) => {
      if (unlinkErr) console.warn('[cleanup] Could not delete temp file:', unlinkErr.message);
    });
  }
});

// Multer error handler
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 25 MB.' });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Transcription server running on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY is not set. Transcriptions will fail.');
  }
});
