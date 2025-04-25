const { DateTime } = require("luxon");

async function fetchAirtableData() {
    const AIRTABLE_TOKEN = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_NAME = 'appUORauHPotUXTn2';
    const AIRTABLE_TABLE_NAME = 'tbl5mj8cEZSC6HdIK';
    const halfHourAgo = new Date(Date.now() - 50 * 60 * 1000); // 50分钟
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

async function fetchWeeklyAirtableData() {
    const AIRTABLE_TOKEN = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_NAME = 'appUORauHPotUXTn2';
    const AIRTABLE_TABLE_NAME = 'tblFwts0Jl963LYHs';
    const halfHourAgo = new Date(Date.now() - 4320 * 60 * 1000); // 3天前的
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
    console.log(data);
    return data.records.map((record, idx) => ({
        id: record.id,
        ...record.fields
    }));
}

/**
 * 将 Airtable 的 UTC ISO 时间字符串转换为北京时间（格式化输出）
 * @param {string} isoString - 来自 Airtable 的 ISO 格式时间字符串（UTC）
 * @returns {string} 格式为 "YYYY年M月D日 HH:mm" 的北京时间
 */
function formatToBeijingTime(isoString) {
    const bjTime = DateTime.fromISO(isoString, { zone: 'utc' }).setZone('Asia/Shanghai');
    return `${bjTime.year}年${bjTime.month}月${bjTime.day}日 ${bjTime.hour}:${String(bjTime.minute).padStart(2, '0')}`;
}

module.exports = { fetchAirtableData, formatToBeijingTime, fetchWeeklyAirtableData};
