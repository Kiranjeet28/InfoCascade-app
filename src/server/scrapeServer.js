const express = require('express');
const fs = require('fs');
const path = require('path');
const { scrapeGndecTimetable } = require('../utils/scrapeTimetable');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

const STORED_PATH = path.join(__dirname, '..', '..', 'web', 'timetable.json');

async function loadStoredTimetable(refresh = false) {
  if (refresh) {
    const result = await scrapeGndecTimetable();
    try {
      fs.mkdirSync(path.dirname(STORED_PATH), { recursive: true });
      fs.writeFileSync(STORED_PATH, JSON.stringify(result, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to write stored timetable:', e);
    }
    return result;
  }

  try {
    const raw = fs.readFileSync(STORED_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    // fallback to live scrape if stored file missing or invalid
    return await scrapeGndecTimetable();
  }
}

app.get('/scrape', async (req, res) => {
  const group = (req.query.group || '').trim();
  const refresh = String(req.query.refresh || '').trim() === '1';
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!group) return res.status(400).json({ error: 'Missing `group` query parameter' });

  try {
    const result = await loadStoredTimetable(refresh);
    const groupLower = group.toLowerCase();
    const matches = [];

    const timetable = (result && result.timetable) || {};
    Object.entries(timetable).forEach(([year, table]) => {
      (table.classes || []).forEach((cls, idx) => {
        const parts = [year, cls.dayOfClass || '', cls.timeOfClass || ''];
        if (cls.data) {
          if (cls.data.freeClass) {
            // nothing
          } else if (cls.data.elective) {
            (cls.data.entries || []).forEach(e => parts.push(e.subject || '', e.teacher || '', e.classRoom || ''));
          } else {
            parts.push(cls.data.subject || '', cls.data.teacher || '', cls.data.classRoom || '');
          }
        }
        const combined = parts.join(' ').toLowerCase();
        if (combined.includes(groupLower)) {
          matches.push({ year, classIndex: idx, class: cls });
        }
      });
    });

    return res.json({ group, matches, sourceUrl: result.url });
  } catch (err) {
    console.error('Scrape error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Return Year and Group options by reading stored timetable
app.get('/options', async (req, res) => {
  const refresh = String(req.query.refresh || '').trim() === '1';
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const result = await loadStoredTimetable(refresh);
    const texts = [];
    const timetable = (result && result.timetable) || {};
    Object.entries(timetable).forEach(([year, table]) => {
      texts.push(year);
      (table.classes || []).forEach(cls => {
        if (cls.data) {
          if (cls.data.elective) {
            (cls.data.entries || []).forEach(e => texts.push(e.subject || '', e.teacher || '', e.classRoom || ''));
          } else if (!cls.data.freeClass) {
            texts.push(cls.data.subject || '', cls.data.teacher || '', cls.data.classRoom || '');
          }
        }
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
