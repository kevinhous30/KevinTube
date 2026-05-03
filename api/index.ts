import express from 'express';
import yts from 'yt-search';

const app = express();

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

export default app;
