const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const CIVIL_URL = 'https://ce.gndec.ac.in/sites/default/files/TT_19.01.2026_data_and_timetable_groups_days_horizontal.html';
const GROUP_LIST_PATH = path.join(__dirname, '../../../web/group/civil.json');


function parseCell($, cell) {
  const $cell = $(cell);
  let text = $cell.html() || '';
  if ($cell.hasClass('empty') || !text.trim()) {
    return {
      subject: null,
      teacher: null,
      classRoom: null,
      elective: false,
      freeClass: true,
      Lab: false,
      Tut: false,
      OtherDepartment: false
    };
  }
  // Split by <br> and clean
  const lines = text
    .split('<br>')
    .map(line => line.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
  return {
    subject: lines[0] || null,
    teacher: lines[1] || null,
    classRoom: lines[2] || null,
    elective: false,
    freeClass: !lines[0],
    Lab: /LAB/i.test(lines[0] || ''),
    Tut: /T/i.test(lines[0] || ''),
    OtherDepartment: false
  };
}


async function scrapeCivilTimetable(url = CIVIL_URL) {
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);
  const groupList = JSON.parse(fs.readFileSync(GROUP_LIST_PATH, 'utf-8'));
  const result = {};
  // Map group names to table IDs
  const groups = [];
  $('ul > li > ul > li > a').each((_, a) => {
    const groupName = $(a).text().trim();
    const tableId = $(a).attr('href').substring(1);
    groups.push({
      name: groupName,
      tableId: tableId
    });
  });
  // For each group in groupList, try to find a matching table
  for (const groupName of groupList) {
    const group = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase())
      || groups.find(g => g.name.replace(/\s+/g, '').toLowerCase() === groupName.replace(/\s+/g, '').toLowerCase());
    if (!group) {
      result[groupName] = { classes: [] };
      continue;
    }
    const table = $(`#${group.tableId}`);
    if (table.length === 0) {
      result[groupName] = { classes: [] };
      continue;
    }
    const classes = [];
    const xAxis = [];
    table.find('thead tr:first-child th.xAxis').each((_, th) => {
      xAxis.push($(th).text().trim());
    });
    table.find('tbody tr').each((rowIndex, row) => {
      if ($(row).hasClass('foot')) return;
      const yAxisCell = $(row).find('th.yAxis');
      if (!yAxisCell.length) return;
      const timeOfClass = yAxisCell.first().text().trim();
      if (!timeOfClass) return;
      $(row).children('td').each((colIndex, td) => {
        const dayOfClass = xAxis[colIndex];
        if (!dayOfClass) return;
        const data = parseCell($, td);
        classes.push({
          dayOfClass,
          timeOfClass,
          data
        });
      });
    });
    result[groupName] = { classes };
  }
  return result;
}

async function scrapeCivilAndSave(url = CIVIL_URL) {
  const timetableRaw = await scrapeCivilTimetable(url);
  const groupPath = path.join(__dirname, '../../../web/group/civil.json');
  try {
    if (!timetableRaw || typeof timetableRaw !== 'object') {
      console.error('Timetable is invalid:', timetableRaw);
      return {
        url,
        timetable: {}
      };
    }
    const groupNames = Object.keys(timetableRaw);
    fs.mkdirSync(path.dirname(groupPath), {
      recursive: true
    });
    fs.writeFileSync(groupPath, JSON.stringify(groupNames, null, 2));
  } catch (err) {
    console.error('Failed to write Civil group info:', err.message);
  }
  // Standardize time format to match other departments
  const TIME_MAP = {
    '8.30 AM (1ST)': '08:30',
    '9.30 AM (2ND)': '09:30',
    '10.30 AM (3RD)': '10:30',
    '11.30 AM (4TH)': '11:30',
    '12.30 PM (5TH)': '12:30',
    '1.30 PM (6TH)': '13:30',
    '2.30 PM (7TH)': '14:30',
    '3.30 PM (8TH)': '15:30'
  };
  const timetable = {};
  for (const group of Object.keys(timetableRaw)) {
    timetable[group] = {
      classes: (timetableRaw[group].classes || []).map(cls => ({
        ...cls,
        timeOfClass: TIME_MAP[cls.timeOfClass] || cls.timeOfClass
      }))
    };
  }
  return {
    url,
    timetable
  };
}

module.exports = {
  scrapeCivilTimetable,
  scrapeCivilAndSave
};

if (require.main === module) {
  scrapeCivilAndSave()
    .then(({ url, timetable }) => {
      console.log('Scraping complete. Timetable saved for Civil groups.');
      const timetablePath = path.join(__dirname, '../../../public/timetable_civil.json');
      fs.writeFileSync(timetablePath, JSON.stringify({ url, timetable }, null, 2));
      console.log(`Timetable saved to ${timetablePath}`);

      const webTimetablePath = path.join(__dirname, '../../../web/timetable_civil.json');
      fs.writeFileSync(webTimetablePath, JSON.stringify({ url, timetable }, null, 2));
      console.log(`Timetable also saved to ${webTimetablePath}`);
    })
    .catch(err => {
      console.error('Error scraping Civil timetable:', err);
    });
}