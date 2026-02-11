// scrapeTimetable.js for Mechanical Department
// Scrapes the timetable from the provided HTML table for D2 ME A
// Usage: node scrapeTimetable.js

const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');

const URL = 'https://me.gndec.ac.in/sites/default/files/JAN%20MAY%202026%20lock_groups_days_horizontal_0.html#table_55';
const OUTPUT_PATH = 'public/timetable_mechanical.json';
const TIME_SLOTS = [
  '08:30', '09:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30'
];

// Paste the table HTML here if you want to use static HTML instead of fetching
const TABLE_ID = '#table_55';

async function fetchHTML(url) {
  const { data } = await axios.get(url);
  return data;
}


function parseTimetableTableToCSEFormat($, table) {
  const days = [];
  $(table)
    .find('thead th.xAxis')
    .each((i, el) => days.push($(el).text().trim()));

  // Group names for D2 ME
  const groupNames = ['D2 ME A1', 'D2 ME A2', 'D2 ME A3'];
  const timetable = {};
  groupNames.forEach(group => {
    timetable[group] = { classes: [] };
  });

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
          const detailedTable = $(cell).find('table.detailed');
          if (detailedTable.length) {
            // Each column in detailed table is a group
            const detailRows = [];
            detailedTable.find('tr').each((trIdx, tr) => {
              const rowArr = [];
              $(tr)
                .find('td.detailed')
                .each((tdIdx, td) => {
                  rowArr.push($(td).text().trim());
                });
              detailRows.push(rowArr);
            });
            for (let g = 0; g < groupNames.length; g++) {
              const group = groupNames[g];
              // Compose data for this group
              const subject = detailRows[1]?.[g] || null;
              const teacher = detailRows[2]?.[g] || null;
              const classRoom = detailRows[3]?.[g] || null;
              timetable[group].classes.push({
                dayOfClass: capitalize(day),
                timeOfClass,
                data: {
                  subject,
                  teacher,
                  classRoom,
                  elective: false,
                  freeClass: !subject,
                  Lab: /LAB/i.test(subject || ''),
                  Tut: /T/i.test(subject || ''),
                  OtherDepartment: false
                }
              });
            }
          } else {
            // Simple cell (may have <br> separated values or -x-)
            let text = $(cell).html() || '';
            if (text.includes('-x-')) {
              for (let g = 0; g < groupNames.length; g++) {
                timetable[groupNames[g]].classes.push({
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
              }
            } else {
              // Split by <br> and clean
              const lines = text
                .split('<br>')
                .map(line => line.replace(/<[^>]+>/g, '').trim())
                .filter(Boolean);
              for (let g = 0; g < groupNames.length; g++) {
                timetable[groupNames[g]].classes.push({
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
            }
          }
        });
    });
  return timetable;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function main() {
  try {
    const html = await fetchHTML(URL);
    const $ = cheerio.load(html);
    const table = $(TABLE_ID);
    if (!table.length) {
      throw new Error('Timetable table not found!');
    }
    const timetable = parseTimetableTableToCSEFormat($, table);
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
