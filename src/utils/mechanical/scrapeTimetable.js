// scrapeTimetable.js for Mechanical Department
// Scrapes the timetable from the provided HTML tables for all mechanical groups
// Usage: node scrapeTimetable.js

const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');

const URL = 'https://me.gndec.ac.in/sites/default/files/JAN%20MAY%202026%20lock_groups_days_horizontal_0.html';
const OUTPUT_PATH = 'web/timetable_mechanical.json';
const TIME_SLOTS = [
  '08:30', '09:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30'
];

// List of all mechanical group table IDs
const GROUP_TABLES = [
  '#table_38', '#table_40', '#table_42', '#table_44', '#table_46', '#table_48', '#table_50', '#table_52',
  '#table_55', '#table_59', '#table_64', '#table_68', '#table_73', '#table_75', '#table_77', '#table_79',
  '#table_81', '#table_83', '#table_85', '#table_87', '#table_89'
];


const GROUP_LIST_PATH = 'web/group/mechanical.json';

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function fetchHTML(url) {
  const { data } = await axios.get(url);
  return data;
}

function parseTimetableTable($, table, groupName) {
  function cleanGroupName(raw) {
    // Remove GNDEC prefix and trim
    return raw.replace(/^GNDEC\s*/i, '').trim();
  }
  const days = [];
  $(table)
    .find('thead th.xAxis')
    .each((i, el) => days.push($(el).text().trim()));

  const classes = [];
  $(table)
    .find('tbody tr')
    .each((rowIdx, row) => {
      if ($(row).hasClass('foot')) return;
      const periodIdx = parseInt($(row).find('th.yAxis').text().trim(), 10) - 1;
      if (isNaN(periodIdx)) return;
      $(row)
        .find('td')
        .each((colIdx, cell) => {
          const day = days[colIdx];
          if (!day) return;
          const timeOfClass = TIME_SLOTS[periodIdx];
          let text = $(cell).html() || '';
          if (text.includes('-x-')) {
            classes.push({
              dayOfClass: capitalize(day),
              timeOfClass,
              data: {
                subject: null,
                teacher: null,
                classRoom: null,
                elective: false,
                freeClass: true,
                Lab: false,
                Tut: false,
                OtherDepartment: false
              }
            });
          } else {
            // Split by <br> and clean
            const lines = text
              .split('<br>')
              .map(line => line.replace(/<[^>]+>/g, '').trim())
              .filter(Boolean);
            classes.push({
              dayOfClass: capitalize(day),
              timeOfClass,
              data: {
                subject: lines[0] || null,
                teacher: lines[1] || null,
                classRoom: lines[2] || null,
                elective: false,
                freeClass: !lines[0],
                Lab: /LAB/i.test(lines[0] || ''),
                Tut: /T/i.test(lines[0] || ''),
                OtherDepartment: false
              }
            });
          }
        });
    });
  return classes;
}

async function main() {
  try {
    const html = await fetchHTML(URL);
    const $ = cheerio.load(html);
    const groupList = JSON.parse(fs.readFileSync(GROUP_LIST_PATH, 'utf-8'));
    const timetable = {};
    const foundGroups = new Set();
    for (const tableId of GROUP_TABLES) {
      const table = $(tableId);
      if (!table.length) continue;
      let groupNameRaw = table.find('caption').text().trim();
      if (!groupNameRaw) {
        groupNameRaw = tableId.replace('#table_', '');
      }
      let groupName = cleanGroupName(groupNameRaw);
      // Try to match groupName to groupList (case-insensitive)
      let matched = groupList.find(g => g.toLowerCase() === groupName.toLowerCase());
      if (!matched) {
        // Try partial match (for e.g. D2 ME A1, D2 ME A, etc.)
        matched = groupList.find(g => groupNameRaw.toLowerCase().includes(g.toLowerCase()));
      }
      if (!matched) {
        // Try removing spaces and match
        matched = groupList.find(g => g.replace(/\s+/g, '').toLowerCase() === groupName.replace(/\s+/g, '').toLowerCase());
      }
      if (!matched) {
        // Fallback to cleaned groupName
        matched = groupName;
      }
      foundGroups.add(matched);
      timetable[matched] = {
        classes: parseTimetableTable($, table, matched)
      };
    }
    // Ensure all groups in groupList are present in timetable (add empty if missing)
    for (const g of groupList) {
      if (!timetable[g]) {
        timetable[g] = { classes: [] };
      }
    }
    const output = {
      url: URL,
      timetable
    };
    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify(output, null, 2),
      'utf-8'
    );
    console.log('Mechanical timetable scraped and saved to', OUTPUT_PATH);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

if (require.main === module) {
  main();
}
