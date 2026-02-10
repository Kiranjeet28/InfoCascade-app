const { scrapeBcaTimetable } = require('./src/utils/bca/scrapeTimetable');
const fs = require('fs');
const path = require('path');

async function saveBcaTimetable() {
  const result = await scrapeBcaTimetable();
  const filePath = path.join(__dirname, 'web/timetable_bca.json');
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log('BCA timetable saved to web/timetable_bca.json');
}

saveBcaTimetable();
