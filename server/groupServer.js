// Simple Express server to serve web/group files
const express = require('express');
const path = require('path');
const app = express();

const groupDir = path.join(__dirname, '../web/group');
app.use('/group', express.static(groupDir));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Group server running at http://localhost:${PORT}/group/`);
});