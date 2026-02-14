const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const ELECTRICAL_URL = 'https://ee.gndec.ac.in/sites/default/files/R2.1%20TT%20jan-june%202026%20%282%29_years_days_horizontal_0.html';

function parseCell($, cell) {
    const $cell = $(cell);
    const text = $cell.html().split('<br>').map(item => item.trim());

    if (text.length === 1 && (text[0] === '---' || text[0] === '-x-')) {
        return {
            subject: null,
            teacher: null,
            classRoom: null,
            elective: false,
            freeClass: true
        };
    }
    if ($cell.find('table.detailed').length > 0) {
        // Handling nested tables for groups
        const groups = {};
        const groupNames = $cell.find('tr:first-child td').map((_, td) => $(td).text().trim()).get();

        $cell.find('tr:not(:first-child)').each((rowIndex, row) => {
            $(row).find('td').each((colIndex, td) => {
                if (groupNames[colIndex]) {
                    if (!groups[groupNames[colIndex]]) {
                        groups[groupNames[colIndex]] = [];
                    }
                    groups[groupNames[colIndex]].push($(td).text().trim());
                }
            });
        });

        // For simplicity, returning a structured representation of the subgroup data
        return {
            subject: "Grouped Classes",
            teacher: null,
            classRoom: null,
            groups: groups,
            elective: true,
            freeClass: false
        };
    }

    return {
        subject: text[0] || null,
        teacher: text[1] || null,
        classRoom: text[2] || null,
        elective: false,
        freeClass: text.length === 0 || text[0] === ''
    };
}


async function scrapeElectricalTimetable(url = ELECTRICAL_URL) {
    const {
        data: html
    } = await axios.get(url);
    const $ = cheerio.load(html);
    const result = {};

    const groups = [];
    $('ul > li > a').each((_, a) => {
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

async function scrapeElectricalAndSave(url = ELECTRICAL_URL) {
    const timetable = await scrapeElectricalTimetable(url);
    const groupPath = path.join(__dirname, '../../../web/group/electrical.json');
    const timetablePath = path.join(__dirname, '../../../public/timetable_electrical.json');
    try {
        if (!timetable || typeof timetable !== 'object') {
            console.error('Timetable is invalid:', timetable);
            return { url, timetable };
        }
        const groupNames = Object.keys(timetable);
        fs.mkdirSync(path.dirname(groupPath), { recursive: true });
        fs.writeFileSync(groupPath, JSON.stringify(groupNames, null, 2));
        // Save timetable in the correct format for frontend
        fs.mkdirSync(path.dirname(timetablePath), { recursive: true });
        fs.writeFileSync(timetablePath, JSON.stringify({ url, timetable }, null, 2));
        // Also save a copy to web/timetable_electrical.json
        const webTimetablePath = path.join(__dirname, '../../../web/timetable_electrical.json');
        fs.mkdirSync(path.dirname(webTimetablePath), { recursive: true });
        fs.writeFileSync(webTimetablePath, JSON.stringify({ url, timetable }, null, 2));
    } catch (err) {
        console.error('Failed to write Electrical group or timetable info:', err.message);
    }
    return { url, timetable };
}

module.exports = {
    scrapeElectricalTimetable,
    scrapeElectricalAndSave
};

if (require.main === module) {
    scrapeElectricalAndSave()
        .then(({ url, timetable }) => {
            console.log('Scraping complete. Timetable saved for Electrical groups.');
        })
        .catch(err => {
            console.error('Error scraping Electrical timetable:', err);
        });
}