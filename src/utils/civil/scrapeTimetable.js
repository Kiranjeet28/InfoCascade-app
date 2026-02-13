const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const CIVIL_URL = 'https://ce.gndec.ac.in/sites/default/files/TT_19.01.2026_data_and_timetable_groups_days_horizontal.html';

function parseCell($, cell) {
  const $cell = $(cell);

  if ($cell.hasClass('empty')) {
    return {
      subject: null,
      teacher: null,
      classRoom: null,
      elective: false,
      freeClass: true
    };
  }

  const subject = $cell.find('.subject').text().trim() || null;
  const teacher = $cell.find('.teacher').text().trim() || null;
  const classRoom = $cell.find('.room').text().trim() || null;

  return {
    subject,
    teacher,
    classRoom,
    elective: false,
    freeClass: !subject
  };
}


async function scrapeCivilTimetable(url = CIVIL_URL) {
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);
  const result = {};

  const groups = [];
  $('ul > li > ul > li > a').each((_, a) => {
    const groupName = $(a).text().trim();
    const tableId = $(a).attr('href').substring(1);
    groups.push({
      name: groupName,
      tableId: tableId
    });
  });

  for (const group of groups) {
    const table = $(`#${group.tableId}`);
    if (table.length === 0) continue;

    const classes = [];
    const xAxis = [];
    table.find('thead tr:first-child th.xAxis').each((_, th) => {
      xAxis.push($(th).text().trim());
    });

    table.find('tbody tr').each((rowIndex, row) => {
      // Skip the 'foot' row
      if ($(row).hasClass('foot')) {
        return;
      }
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

    result[group.name] = {
      classes
    };
  }

  return result;
}

async function scrapeCivilAndSave(url = CIVIL_URL) {
  const timetable = await scrapeCivilTimetable(url);
  const groupPath = path.join(__dirname, '../../../web/group/civil.json');
  try {
    if (!timetable || typeof timetable !== 'object') {
      console.error('Timetable is invalid:', timetable);
      return {
        url,
        timetable
      };
    }
    const groupNames = Object.keys(timetable);
    fs.mkdirSync(path.dirname(groupPath), {
      recursive: true
    });
    fs.writeFileSync(groupPath, JSON.stringify(groupNames, null, 2));
  } catch (err) {
    console.error('Failed to write Civil group info:', err.message);
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
    .then(({
      url,
      timetable
    }) => {
      console.log('Scraping complete. Timetable saved for Civil groups.');
      const timetablePath = path.join(__dirname, '../../../public/timetable_civil.json');
      fs.writeFileSync(timetablePath, JSON.stringify(timetable, null, 2));
      console.log(`Timetable saved to ${timetablePath}`);

      const webTimetablePath = path.join(__dirname, '../../../web/timetable_civil.json');
      fs.writeFileSync(webTimetablePath, JSON.stringify(timetable, null, 2));
      console.log(`Timetable also saved to ${webTimetablePath}`);
    })
    .catch(err => {
      console.error('Error scraping Civil timetable:', err);
    });
}