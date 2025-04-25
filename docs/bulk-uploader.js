// Airtable 设置
const AIRTABLE_TOKEN = 'pat1SqY1PwRJ71zY9.fa8c811c52fbe5807ba0cb11e2366dae0cb84e9478a71f5fcbbecfdcbd3075d2'.replace(/[^\x00-\x7F]/g, '');
const BASE_ID = 'appUORauHPotUXTn2';
const TABLE_NAME = 'tblFwts0Jl963LYHs';

let parsedData = [];

document.getElementById('parseBtn').addEventListener('click', () => {
    const jsonInput = document.getElementById('jsonInput').value;
    try {
        parsedData = JSON.parse(jsonInput);
        if (!Array.isArray(parsedData)) {
            throw new Error('数据格式必须是数组');
        }
        renderPreview(parsedData);
        document.getElementById('uploadBtn').disabled = false;
    } catch (error) {
        alert('JSON解析失败，请检查格式是否正确');
        console.error(error);
        document.getElementById('uploadBtn').disabled = true;
    }
});

document.getElementById('uploadBtn').addEventListener('click', async () => {
    if (!parsedData.length) {
        alert('请先解析数据');
        return;
    }
    for (let i = 0; i < parsedData.length; i++) {
        const record = parsedData[i];
        try {
            await uploadRecord(record);
            updateStatus(i, true);
        } catch (error) {
            updateStatus(i, false);
            console.error('上传失败', error);
        }
        await sleep(200); // 避免超过 Airtable API 限速
    }
});

function renderPreview(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'record';
        div.id = `record-${index}`;
        div.textContent = `标题: ${item.title} | 金句: ${item.quote}`;
        resultDiv.appendChild(div);
    });
}

function updateStatus(index, success) {
    const recordDiv = document.getElementById(`record-${index}`);
    if (recordDiv) {
        const statusSpan = document.createElement('span');
        statusSpan.textContent = success ? ' ✅' : ' ❌';
        statusSpan.className = success ? 'success' : 'error';
        recordDiv.appendChild(statusSpan);
    }
}

async function uploadRecord(record) {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
    const body = {
        records: [
            {
                fields: {
                    Episode: record.episode,
                    Name: record.name,
                    Title: record.title,
                    Quote: record.quote,
                    Detail: record.detail,

                }
            }
        ]
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error('上传失败');
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
