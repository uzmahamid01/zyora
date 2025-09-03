const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(400).send('Failed to fetch image');
    res.set('Content-Type', response.headers.get('content-type'));
    response.body.pipe(res);
  } catch (e) {
    res.status(500).send('Proxy error');
  }
});

app.listen(3001, () => console.log('Proxy running on port 3001'));
