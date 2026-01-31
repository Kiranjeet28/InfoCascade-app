const path = require('path');
const fs = require('fs');
const { scrapeGndecTimetable } = require('../src/utils/scrapeTimetable');

(async () => {
  try {
    console.log('Fetching timetable...');
    const result = await scrapeGndecTimetable();

    const outDir = path.join(__dirname, '..', 'web');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'timetable.json');

    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
    console.log('Timetable written to', outPath);
  } catch (err) {
    console.error('Failed to fetch and save timetable:', err);
    process.exit(1);
  }
})();
