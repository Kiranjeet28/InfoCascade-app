const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE_URL = 'https://cse.gndec.ac.in/sites/default/files/TT%20Jan-June%202026_groups_days_horizontal%20%281%29.html';

async function scrapeTimetable(url) {
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  const result = {};

  $('table').each((_, table) => {
    const yearSec = $(table).find('thead tr:first-child th[colspan]').text().trim();
    if (!yearSec) return;

    result[yearSec] = { classes: [] };

    const xAxis = [];
    $(table)
      .find('thead tr')
      .last()
      .find('th.xAxis')
      .each((_, th) => {
        xAxis.push($(th).text().trim());
      });

    $(table).find('tbody tr').each((_, row) => {
      const yAxisCell = $(row).find('th.yAxis');
      if (!yAxisCell.length) return;

      const timeOfClass = yAxisCell.text().trim();
      if (!timeOfClass) return;

      const tds = $(row).children('td'); // IMPORTANT: direct children only

      tds.each((colIndex, td) => {
        const dayOfClass = xAxis[colIndex];
        if (!dayOfClass) return;

        const data = parseCell($, td);

        result[yearSec].classes.push({
          dayOfClass,
          timeOfClass,
          data,
        });
      });
    });
  });

  return result;
}

function parseCell($, cell) {
  const $cell = $(cell);
  const html = $cell.html() || '';

  // Elective / nested table detection first
  const innerTable = $cell.find('table.detailed, table');
  if (innerTable.length) {
    const rows = [];
    innerTable.find('tbody tr').each((ri, r) => {
      const cols = [];
      $(r).find('td, th').each((ci, c) => {
        cols.push($(c).text().trim());
      });
      rows.push(cols);
    });

    const entries = [];
    const colCount = rows[0] ? rows[0].length : 0;
    if (colCount > 0) {
      const last = rows.slice(-3);
      for (let ci = 0; ci < colCount; ci++) {
        const subject = (last[last.length - 3] && last[last.length - 3][ci]) || null;
        const teacher = (last[last.length - 2] && last[last.length - 2][ci]) || null;
        const classRoom = (last[last.length - 1] && last[last.length - 1][ci]) || null;
        if (subject || teacher || classRoom) entries.push({ subject, teacher, classRoom });
      }
    }

    return { elective: true, freeClass: false, entries };
  }

  // Free class detection
  const plainText = $cell.text().trim();
  if (/^(?:-x-|---|\s*)$/i.test(plainText) || !html.includes('<br')) {
    return { subject: null, teacher: null, classRoom: null, elective: false, freeClass: true };
  }

  // Normal class
  const parts = html
    .split(/<br\s*\/?\>/i)
    .map((v) => cheerio.load(v).text().trim())
    .filter(Boolean);

  if (parts.length === 3) {
    return { subject: parts[0], teacher: parts[1], classRoom: parts[2], elective: false, freeClass: false };
  }

  const entries = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i + 2]) entries.push({ subject: parts[i], teacher: parts[i + 1], classRoom: parts[i + 2] });
  }
  return { elective: entries.length > 1, freeClass: false, entries: entries.length > 1 ? entries : null };
}

async function scrapeGndecTimetable(url = SOURCE_URL) {
  const timetable = await scrapeTimetable(url);
  return { url, timetable };
}

module.exports = { scrapeGndecTimetable };