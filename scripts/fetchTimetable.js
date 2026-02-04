const path = require('path');
const fs = require('fs');
const { scrapeGndecTimetable, scrapeAllDepartments, DEPARTMENT_URLS } = require('../src/utils/scrapeTimetable');

const outDir = path.join(__dirname, '..', 'web');

// Save individual department timetable
function saveDepartmentTimetable(dept, data) {
  const outPath = path.join(outDir, `timetable_${dept}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Timetable written to ${outPath}`);
}

(async () => {
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Check if specific department was requested via command line
    const requestedDept = process.argv[2];
    
    if (requestedDept) {
      // Scrape single department
      const deptLower = requestedDept.toLowerCase();
      if (!DEPARTMENT_URLS[deptLower]) {
        console.error(`Unknown department: ${requestedDept}`);
        console.log(`Available departments: ${Object.keys(DEPARTMENT_URLS).join(', ')}`);
        process.exit(1);
      }
      
      console.log(`Fetching ${deptLower.toUpperCase()} timetable...`);
      const { scrapeGndecTimetable } = require('../src/utils/scrapeTimetable');
      const result = await scrapeGndecTimetable(DEPARTMENT_URLS[deptLower]);
      saveDepartmentTimetable(deptLower, result);
    } else {
      // Scrape all departments
      console.log('Fetching timetables for all departments...\n');
      const results = await scrapeAllDepartments();
      
      // Save each department to its own file
      for (const [dept, data] of Object.entries(results)) {
        if (data.timetable) {
          saveDepartmentTimetable(dept, { url: data.url, timetable: data.timetable });
        }
      }
      
      // Also save combined timetable.json for backward compatibility
      const combinedPath = path.join(outDir, 'timetable.json');
      fs.writeFileSync(combinedPath, JSON.stringify(results, null, 2), 'utf8');
      console.log(`\nCombined timetable written to ${combinedPath}`);
    }
    
    console.log('\nDone!');
  } catch (err) {
    console.error('Failed to fetch and save timetable:', err);
    process.exit(1);
  }
})();
