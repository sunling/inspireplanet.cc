// scripts/utils.js
// const fetch = require('node-fetch');

async function fetchAirtableData() {
    const AIRTABLE_TOKEN = 'pat1SqY1PwRJ71zY9.fa8c811c52fbe5807ba0cb11e2366dae0cb84e9478a71f5fcbbecfdcbd3075d2'.replace(/[^\x00-\x7F]/g, '');
    const AIRTABLE_BASE_NAME = 'appUORauHPotUXTn2';
    const AIRTABLE_TABLE_NAME = 'tbl5mj8cEZSC6HdIK';
    const halfHourAgo = new Date(Date.now() - 30 * 60 * 1000); // 30分钟
    const isoTime = halfHourAgo.toISOString();
    const filterFormula = `IS_AFTER({Created}, "${isoTime}")`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(filterFormula)}&pageSize=100`;
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    const data = await res.json();
    return data.records.map((record, idx) => ({
        id: record.id,
        ...record.fields
    }));
}

module.exports = { fetchAirtableData };
