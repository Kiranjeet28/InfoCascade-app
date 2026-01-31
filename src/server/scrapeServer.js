const express = require('express');
const { scrapeGndecTimetable } = require('../utils/scrapeTimetable');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/scrape', async (req, res) => {
  const group = (req.query.group || '').trim();
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!group) return res.status(400).json({ error: 'Missing `group` query parameter' });

  try {
    const result = await scrapeGndecTimetable();
    const groupLower = group.toLowerCase();
    const matches = [];

    (result.tables || []).forEach((table, ti) => {
      const rows = table.rows || [];
      rows.forEach((row, ri) => {
        const combined = Object.values(row).join(' ').toLowerCase();
        if (combined.includes(groupLower)) {
          matches.push({ table: ti, rowIndex: ri, row });
        }
      });
    });

    return res.json({ group, matches, sourceUrl: result.url });
  } catch (err) {
    console.error('Scrape error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Return Year and Group options by scraping the source page
app.get('/options', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const result = await scrapeGndecTimetable();
    const texts = [];
    (result.tables || []).forEach(table => {
      (table.rows || []).forEach(row => {
        Object.values(row).forEach(v => {
          if (v && typeof v === 'string') texts.push(v);
        });
      });
    });

    const joined = texts.join('\n');

    // Rough regex to capture group-like tokens (e.g. 'D2 CS A', 'D1 ME A1', 'M1 Automatic Group', 'Ph.D Automatic Group')
    const groupRegex = /\b(?:D[1-4](?:\s+CS)?(?:\s+[A-Z]\d?)?|D1\s+(?:CS|ME|EC|MX|ECB|ITD)(?:\s+[A-Z]\d?)?|M[13](?:\s+Automatic Group)?|Ph\.?D(?:\s+Automatic Group)?|MBA(?:\s+DEPT)?(?:\s+Automatic Group)?)\b/gi;
    const rawMatches = (joined.match(groupRegex) || []).map(s => s.replace(/\s+/g, ' ').trim());
    const unique = Array.from(new Set(rawMatches.map(s => s.replace(/\.$/, '').trim())));

    function deriveYear(g) {
      const u = g.toUpperCase();
      if (/^D2\b/.test(u)) return 'D2CSE';
      if (/^D3\b/.test(u)) return 'D3CSE';
      if (/^D4\b/.test(u)) return 'D4CSE';
      if (/^M1\b/.test(u)) return 'M1';
      if (/^M3\b/.test(u)) return 'M3';
      if (/^PH\.?D/.test(u)) return 'Ph.D';
      if (/^MBA/.test(u)) return 'MBA DEPT';
      if (/^D1\s+CS\s+([A-Z])/.test(u)) return `D1 CS ${u.match(/^D1\s+CS\s+([A-Z])/)[1]}`;
      if (/^D1\s+ME\s+([A-Z])/.test(u)) return `D1 ME ${u.match(/^D1\s+ME\s+([A-Z])/)[1]}`;
      if (/^D1\s+EC\s+([A-Z])/.test(u)) return `D1 EC ${u.match(/^D1\s+EC\s+([A-Z])/)[1]}`;
      if (/^D1\s+ECB|^D1\s+ITD/.test(u)) return 'D1 ECB ITD';
      if (/^D1\s+MX/.test(u)) return 'D1 MX';
      // fallback: take first token
      return u.split(/\s+/).slice(0, 1).join('');
    }

    const groupsByYear = {};
    unique.forEach(g => {
      const year = deriveYear(g);
      if (!groupsByYear[year]) groupsByYear[year] = [];
      if (!groupsByYear[year].includes(g)) groupsByYear[year].push(g);
    });

    const years = Object.keys(groupsByYear).sort();
    return res.json({ years, groupsByYear });
  } catch (err) {
    console.error('Options error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => console.log(`Scrape server listening on http://localhost:${PORT}`));
