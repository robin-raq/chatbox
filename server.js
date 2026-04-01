/**
 * Simple static file server for Railway deployment.
 * Serves the Chatbox web build from release/app/dist/renderer/
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_DIR = path.join(__dirname, 'release/app/dist/renderer');

// Serve static files
app.use(express.static(STATIC_DIR));

// SPA fallback — serve index.html for all routes not matching a static file
app.get('*', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ChatBridge running on port ${PORT}`);
});
