const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function scrapeGndecTimetable(url = 'https://cse.gndec.ac.in/sites/default/files/TT%20Jan-June%202026_groups_days_horizontal%20%281%29.html') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const tables = [];
  $('table').each((ti, table) => {
    const $table = $(table);
    // read all rows as arrays of cell texts
    const rows = [];
    $table.find('tr').each((ri, tr) => {
      const cells = [];
      $(tr).find('th, td').each((ci, cell) => {
        const text = $(cell).text().replace(/\s+/g, ' ').trim();
        cells.push(text);
      });
      if (cells.length) rows.push(cells);
    });

    // attempt to find a weekday header row (contains Monday..Sunday)
    const weekdayRegex = /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i;
    const timeRegex = /\b\d{1,2}:\d{2}\b/;

    let daysRowIndex = -1;
    for (let i = 0; i < Math.min(6, rows.length); i++) {
      if (rows[i].some(c => weekdayRegex.test(c))) { daysRowIndex = i; break; }
    }

    // group name — try table caption or first header cell
    let groupName = '';
    const caption = $table.find('caption').text().trim();
    if (caption) groupName = caption;
    if (!groupName && rows[0] && rows[0][0]) groupName = rows[0][0];

    if (daysRowIndex === -1) {
      // fallback: store raw rows
      tables.push({ group: groupName || `table_${ti}`, rawRows: rows });
      return;
    }

    const dayKeys = rows[daysRowIndex].map(d => d || '');

    // content rows after days header
    const content = rows.slice(daysRowIndex + 1);

    // find indices of rows that contain a time in any cell
    const timeRowIndices = [];
    content.forEach((r, idx) => {
      if (r.some(c => timeRegex.test(c))) timeRowIndices.push(idx);
    });

    const slots = [];
    for (let s = 0; s < timeRowIndices.length; s++) {
      const idx = timeRowIndices[s];
      const nextIdx = (s + 1 < timeRowIndices.length) ? timeRowIndices[s + 1] : content.length;
      const timeRow = content[idx];
      // for each column, build cell text from rows idx .. nextIdx-1
      const slot = { start: null, cells: {} };
      for (let c = 0; c < dayKeys.length; c++) {
        const colName = dayKeys[c] || `col${c+1}`;
        // start time from this timeRow cell if present
        const startText = (timeRow[c] || '').trim();
        if (!slot.start && timeRegex.test(startText)) slot.start = startText;

        const parts = [];
        for (let r = idx; r < nextIdx; r++) {
          const cell = content[r][c];
          if (cell && String(cell).trim()) parts.push(String(cell).trim());
        }
        slot.cells[colName] = parts.join(' | ');
      }
      slots.push(slot);
    }

    tables.push({ group: groupName || `table_${ti}`, days: dayKeys, slots });
  });

  return { url, tables };
}

module.exports = { scrapeGndecTimetable };

// If run directly, fetch and print JSON
if (require.main === module) {
  (async () => {
    try {
      const result = await scrapeGndecTimetable();
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Error:', err.message || err);
      process.exit(1);
    }
  })();
}
