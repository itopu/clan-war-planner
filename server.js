const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
const PORT = 3000;

// Serve static files from /public
app.use(express.static('public'));

// API route to fetch clan info
app.get('/api/clan/:tag', async (req, res) => {
  const tag = req.params.tag.replace('#', '%23');

  try {
    const response = await fetch(`https://api.clashofclans.com/v1/clans/${tag}`, {
      headers: {
        Authorization: `Bearer ${process.env.COC_API_TOKEN}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Clan not found or invalid token.' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error', detail: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
