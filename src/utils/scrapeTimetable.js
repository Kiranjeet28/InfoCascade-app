const axios = require('axios');
const cheerio = require('cheerio');

// Department URLs
const DEPARTMENT_URLS = {
  cse: 'https://cse.gndec.ac.in/sites/default/files/TT%20Jan-June%202026_groups_days_horizontal%20%281%29.html',
  civil: 'http://ce.gndec.ac.in/sites/default/files/TT_29.01.2026_groups_days_horizontal.html',
  mechanical: 'https://me.gndec.ac.in/sites/default/files/JAN%20MAY%202026%20lock_groups_days_horizontal_0.html',
  electrical: 'https://ee.gndec.ac.in/sites/default/files/R2.1%20TT%20jan-june%202026%20%282%29_years_days_horizontal.html',
  ece: 'https://ece.gndec.ac.in/sites/default/files/classes%20individual%20%283%29.html',
  it: 'https://it.gndec.ac.in/sites/default/files/jan_june2025_6%2027%20dec_years_days_horizontal%20%284%29.html',
  ca: 'https://ca.gndec.ac.in/sites/default/files/ca_JAN26_rooms_u.html'
};

const SOURCE_URL = DEPARTMENT_URLS.cse;

// Helper to check if subject ends with P (Lab)
function isLabSubject(subject) {
  return subject && subject.trim().endsWith('P');
}

// Helper to add Lab field to data object
function addLabField(data) {
  // For single subject classes
  if (data.subject) {
    data.Lab = isLabSubject(data.subject);
  }
  
  // For classes with entries (elective/lab groups)
  if (data.entries && Array.isArray(data.entries)) {
    // Check if ALL entries are lab subjects (end with P)
    const allAreLabs = data.entries.every(entry => isLabSubject(entry.subject));
    
    if (allAreLabs) {
      // If all are labs, set elective to false and Lab to true at outer level
      data.elective = false;
      data.Lab = true;
    } else {
      data.Lab = false;
    }
    // Don't add Lab field inside individual entries
  }
  return data;
}

// Helper to transform section name like "D2 CS A" to ["D2A1", "D2A2"]
function transformSectionName(yearSec) {
  // Match pattern like "D2 CS A", "D3 CS B", etc.
  const match = yearSec.match(/^(D\d+)\s+CS\s+([A-Z])$/i);
  if (match) {
    const year = match[1].toUpperCase();
    const section = match[2].toUpperCase();
    return [`${year}${section}1`, `${year}${section}2`];
  }
  return [yearSec]; // Return original if doesn't match pattern
}

async function scrapeTimetable(url) {
  const { data: html } = await axios.get(url); 
  const $ = cheerio.load(html);

  const result = {};

  $('table').each((_, table) => {
    const yearSec = $(table).find('thead tr:first-child th[colspan]').text().trim();
    if (!yearSec) return;

    const classes = [];

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

        const data = addLabField(parseCell($, td));

        classes.push({
          dayOfClass,
          timeOfClass,
          data,
        });
      });
    });

    // Transform section name and duplicate if needed
    const sectionNames = transformSectionName(yearSec);
    sectionNames.forEach(sectionName => {
      result[sectionName] = { classes: JSON.parse(JSON.stringify(classes)) };
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

// Scrape a specific department by name
async function scrapeDepartmentTimetable(department) {
  const url = DEPARTMENT_URLS[department.toLowerCase()];
  if (!url) {
    throw new Error(`Unknown department: ${department}. Available: ${Object.keys(DEPARTMENT_URLS).join(', ')}`);
  }
  const timetable = await scrapeTimetable(url);
  return { department, url, timetable };
}

// Scrape all departments
async function scrapeAllDepartments() {
  const results = {};
  const departments = Object.keys(DEPARTMENT_URLS);
  
  for (const dept of departments) {
    try {
      console.log(`Scraping ${dept.toUpperCase()} department...`);
      const timetable = await scrapeTimetable(DEPARTMENT_URLS[dept]);
      results[dept] = {
        url: DEPARTMENT_URLS[dept],
        timetable
      };
      console.log(`✓ ${dept.toUpperCase()} done`);
    } catch (err) {
      console.error(`✗ Failed to scrape ${dept.toUpperCase()}:`, err.message);
      results[dept] = {
        url: DEPARTMENT_URLS[dept],
        error: err.message,
        timetable: null
      };
    }
  }
  
  return results;
}

module.exports = { scrapeGndecTimetable, scrapeDepartmentTimetable, scrapeAllDepartments, DEPARTMENT_URLS };