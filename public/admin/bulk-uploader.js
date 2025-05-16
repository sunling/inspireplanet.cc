// 批量上传工具
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

    const uploadBtn = document.getElementById('uploadBtn');
    const originalText = uploadBtn.textContent;
    uploadBtn.textContent = '上传中...';
    uploadBtn.disabled = true;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < parsedData.length; i++) {
        const record = parsedData[i];
        try {
            await uploadRecord(record, i);
            updateStatus(i, true);
            successCount++;
        } catch (error) {
            updateStatus(i, false, error.message);
            failCount++;
            console.error(`第${i + 1}行上传失败:`, error);
        }
        await sleep(200); // 避免请求过于频繁
    }

    uploadBtn.textContent = originalText;
    uploadBtn.disabled = false;
    document.getElementById('jsonInput').value = '';
    
    // 显示上传结果摘要
    const summary = document.createElement('div');
    summary.className = 'summary';
    summary.innerHTML = `
        <h3>上传完成</h3>
        <p>成功: ${successCount} 条</p>
        <p>失败: ${failCount} 条</p>
    `;
    document.getElementById('result').appendChild(summary);
});

function getBaseUrl() {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    } else if (process && process.env && process.env.URL) {
        return process.env.URL;
    } else {
        return 'http://localhost:8888'; // fallback for local dev
    }
}

function renderPreview(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'record';
        div.id = `record-${index}`;
        div.innerHTML = `
            <span class="record-number">#${index + 1}</span>
            <span class="record-episode">${item.episode || '无集数'}</span>
            <span class="record-name">${item.name || '无名称'}</span>
            <span class="record-title">${item.title || '无标题'}</span>
        `;
        resultDiv.appendChild(div);
    });
}

function updateStatus(index, success, errorMessage = '') {
    const recordDiv = document.getElementById(`record-${index}`);
    if (recordDiv) {
        // 移除之前的状态标记（如果有）
        const existingStatus = recordDiv.querySelector('.status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // 添加新的状态标记
        const statusSpan = document.createElement('span');
        statusSpan.className = `status ${success ? 'success' : 'error'}`;

        if (success) {
            statusSpan.textContent = ' ✅';
        } else {
            statusSpan.textContent = ' ❌';

            // 如果有错误信息，添加提示
            if (errorMessage) {
                const tooltip = document.createElement('span');
                tooltip.className = 'tooltip';
                tooltip.textContent = errorMessage;
                statusSpan.appendChild(tooltip);

                // 添加鼠标悬停事件
                statusSpan.title = errorMessage;
            }
        }

        recordDiv.appendChild(statusSpan);
    }
}

async function uploadRecord(record, index) {
    try {
        const response = await fetch(`${getBaseUrl()}/.netlify/functions/uploadWeeklyCard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ record }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || result.details || `第${index + 1}行上传失败`);
        }

        return result;
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            throw new Error('网络连接失败，请检查网络');
        } else {
            throw error;
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
