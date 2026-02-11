// generateMechanicalGroups.js
// Extracts all mechanical group names from a provided HTML snippet and writes them to web/group/mechanical.json

const fs = require('fs');
const cheerio = require('cheerio');

// Paste the <ul> HTML containing all group names here
const groupListHTML = `
<ul>
  <li>Year D1
    <ul>
      <li>Group <a href="#table_38">ME A1</a></li>
      <li>Group <a href="#table_40">ME A2</a></li>
      <li>Group <a href="#table_42">ME A3</a></li>
      <li>Group <a href="#table_44">ME B1</a></li>
      <li>Group <a href="#table_46">ME B2</a></li>
      <li>Group <a href="#table_48">ME B3</a></li>
      <li>Group <a href="#table_50">MX1</a></li>
      <li>Group <a href="#table_52">MX2</a></li>
    </ul>
  </li>
  <li>Year D2 ME
    <ul>
      <li>Group <a href="#table_55">D2 ME A</a></li>
      <li>Group <a href="#table_59">D2 ME B</a></li>
    </ul>
  </li>
  <li>Year D3 ME
    <ul>
      <li>Group <a href="#table_64">D3 ME A</a></li>
      <li>Group <a href="#table_68">D3 ME B</a></li>
    </ul>
  </li>
  <li>Year D4 ME
    <ul>
      <li>Group <a href="#table_73">D4 ME Manufacturing</a></li>
      <li>Group <a href="#table_75">D4 ME Design</a></li>
      <li>Group <a href="#table_77">D4 ME Thermal</a></li>
      <li>Group <a href="#table_79">D4 ME A1</a></li>
      <li>Group <a href="#table_81">D4 ME A2</a></li>
      <li>Group <a href="#table_83">D4 ME A3</a></li>
      <li>Group <a href="#table_85">D4 ME B1</a></li>
      <li>Group <a href="#table_87">D4 ME B2</a></li>
      <li>Group <a href="#table_89">D4 ME B3</a></li>
    </ul>
  </li>
</ul>
`;

const $ = cheerio.load(groupListHTML);
const groupNames = [];
$('a').each((i, el) => {
  const text = $(el).text().trim();
  // Only ME groups
  if (/^ME|^D2 ME|^D3 ME|^D4 ME|^MX/i.test(text)) {
    groupNames.push(text);
  }
});

// Add D2, D3, D4 ME groups
$('li').each((i, el) => {
  const text = $(el).text().trim();
  if (/^Group (D2 ME|D3 ME|D4 ME)/.test(text)) {
    const match = text.match(/^Group (.+)$/);
    if (match) groupNames.push(match[1]);
  }
});

// Remove duplicates
const uniqueGroups = Array.from(new Set(groupNames));
uniqueGroups.sort();

fs.writeFileSync('web/group/mechanical.json', JSON.stringify(uniqueGroups, null, 2));
console.log('Mechanical groups written to web/group/mechanical.json');
