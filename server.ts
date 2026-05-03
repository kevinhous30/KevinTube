import express from 'express';
import yts from 'yt-search';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/search', async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      const results = await yts(q);
      res.json(results.videos.slice(0, 40));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to search' });
    }
  });

  app.get('/api/trending', async (req, res) => {
    try {
      const results = await yts('trending');
      res.json(results.videos.slice(0, 40));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load explore data' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
