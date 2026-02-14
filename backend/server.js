const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
