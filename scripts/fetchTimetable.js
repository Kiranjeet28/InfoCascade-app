const path = require('path');
const fs = require('fs');
const { scrapeGndecTimetable, scrapeAllDepartments, DEPARTMENT_URLS } = require('../src/utils/cse/scrapeTimetable');

const outDir = path.join(__dirname, '..', 'web');
const publicDir = path.join(__dirname, '..', 'public');

// Save individual department timetable
function saveDepartmentTimetable(dept, data) {
  const fileName = `timetable_${dept}.json`;
  const outPath = path.join(outDir, fileName);
  const publicPath = path.join(publicDir, fileName);
  
  const jsonContent = JSON.stringify(data, null, 2);
  fs.writeFileSync(outPath, jsonContent, 'utf8');
  fs.writeFileSync(publicPath, jsonContent, 'utf8');
  console.log(`Timetable written to ${outPath}`);
}

(async () => {
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

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
      const combinedContent = JSON.stringify(results, null, 2);
      const combinedPath = path.join(outDir, 'timetable.json');
      const combinedPublicPath = path.join(publicDir, 'timetable.json');
      fs.writeFileSync(combinedPath, combinedContent, 'utf8');
      fs.writeFileSync(combinedPublicPath, combinedContent, 'utf8');
      console.log(`\nCombined timetable written to ${combinedPath}`);
    }
    
    console.log('\nDone!');
  } catch (err) {
    console.error('Failed to fetch and save timetable:', err);
    process.exit(1);
  }
})();
