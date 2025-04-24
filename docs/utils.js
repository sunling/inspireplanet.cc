// utils.js - 公共脚本函数集合

const themes = {
    darkblue: {
        background: "#2f2f46",
        color: "#ffffff",
        quoteBg: "#fef6ec",
        quoteColor: "#ff7f2a",
    },
    green: {
        background: "#2e4a3f",
        color: "#f5f5dc",
        quoteBg: "#edf5ef",
        quoteColor: "#45715a",
    },
    brown: {
        background: "#4b3832",
        color: "#f5f5dc",
        quoteBg: "#f5e9dc",
        quoteColor: "#a0522d",
    },
    purple: {
        background: "#3e2f5b",
        color: "#f8e1f4",
        quoteBg: "#f9e7fd",
        quoteColor: "#9147b6",
    },
    grayblue: {
        background: "#2f3e46",
        color: "#ffffff",
        quoteBg: "#e0e0e0",
        quoteColor: "#1f2937",
    },
    morning: {
        background: "#fefaf3",
        color: "#5e4b2b",
        quoteBg: "#fff2da",
        quoteColor: "#d26a00",
    },
    mistyblue: {
        background: "#eef2f3",
        color: "#3c4a54",
        quoteBg: "#dceaf3",
        quoteColor: "#336699",
    },
    roseclay: {
        background: "#f8e8e0",
        color: "#5f3d42",
        quoteBg: "#ffece7",
        quoteColor: "#c06060",
    },
    creamMatcha: {
        background: "#f3f6ef",
        color: "#4a5a3c",
        quoteBg: "#e8f4df",
        quoteColor: "#5d7b4c",
    },
    lavenderMist: {
        background: "#f4f0f8",
        color: "#5a4c68",
        quoteBg: "#f2e8ff",
        quoteColor: "#9b5fb8",
    },

};

const AIRTABLE_TOKEN = 'pat1SqY1PwRJ71zY9.fa8c811c52fbe5807ba0cb11e2366dae0cb84e9478a71f5fcbbecfdcbd3075d2'.replace(/[^\x00-\x7F]/g, '');
const AIRTABLE_BASE_NAME = 'appUORauHPotUXTn2';
const AIRTABLE_TABLE_NAME = 'tbl5mj8cEZSC6HdIK';

/**
 * 加载图像列表并填充 image-select 下拉菜单
 * @param {Function} onLoaded 回调函数（完成后可调用 onLoadFunc 等）
 * @param {string} selectId 下拉框的 id
 * @param {string} jsonPath 图片描述 json 文件路径
 */
function loadImages(onLoadedFunc, selectId = "image-select", jsonPath = "images.json",) {
    fetch(jsonPath)
        .then(res => res.json())
        .then(imageGroups => {
            const select = document.getElementById(selectId);
            if (!select) return;

            // 清空现有选项
            select.innerHTML = '';

            // 扁平化所有主题的图片项
            Object.values(imageGroups).flat().forEach(img => {
                const option = new Option(img.desc, `images/${img.file}`);
                select.add(option);
            });

            if (typeof onLoadedFunc === "function") onLoadedFunc();
        })
        .catch(e => {
            console.error("加载背景图失败:", e);
            document.getElementById(selectId).innerHTML = `
          <option value="images/biking.png">默认背景</option>
        `;
        });
}

/**
 * 下载指定元素生成的卡片截图
 * @param {string} elementId - 要截图的元素 id（默认是 "preview"）
 * @param {string} filenamePrefix - 下载文件名前缀（默认是 "inspiration-card"）
 */
function download(elementId = "preview", filenamePrefix = "inspiration-card") {
    const cardElement = document.getElementById(elementId);
    if (!cardElement) {
        console.warn(`元素 #${elementId} 不存在`);
        return;
    }

    setTimeout(() => {
        html2canvas(cardElement, {
            scale: 3, // 高清导出
            logging: true,
            useCORS: true,
            backgroundColor: null,
            windowWidth: document.body.scrollWidth,
            windowHeight: document.body.scrollHeight,
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${filenamePrefix}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(err => {
            console.log("截图失败", err);
        });
    }, 500);
}

function downloadCardToImageView(previewId = "preview", filenamePrefix = "inspiration-card") {
    html2canvas(document.getElementById(previewId), {
        scale: 3,
        useCORS: true,
        backgroundColor: null
    }).then(canvas => {
        canvas.toBlob(function (blob) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${filenamePrefix}-${Date.now()}.png`;
            link.click();
        }, "image/png");
    }).catch(err => {
        console.log("截图失败", err);
    });
}

/**
 * 上传图片
 * @param {EventListener} event 
 * @returns 
 */
function onUploadBg(event, callBackFunc, previewLabelId = "fileStatus") {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        if (typeof callBackFunc === "function") callBackFunc(e.target.result);
        // 更新显示上传状态
        if (previewLabelId) {
            const label = document.getElementById(previewLabelId);
            if (label) label.textContent = `已上传：${file.name}`;
        }
        // reset
        event.target.value = '';
    };
    reader.readAsDataURL(file);
}

/**
 * 绑定一个自定义上传按钮 + 状态显示，用于隐藏原生 file input 的 file 选择。
 * @param {Object} config - 配置项
 * @param {string} config.inputId - 隐藏的 file input 的 ID
 * @param {string} config.buttonId - 自定义触发上传按钮的 ID
 * @param {string} config.statusId - 用于显示上传状态的 span/div 的 ID
 * @param {Function} config.onLoad - 上传完成后回调函数，参数为 base64 url
 */
function bindCustomFileUpload({ inputId, buttonId, statusId, onLoad }) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const status = document.getElementById(statusId);

    if (!input || !button || !status) {
        console.warn("自定义上传绑定失败：元素未找到");
        return;
    }

    // 点击按钮触发隐藏 input
    button.addEventListener("click", () => input.click());

    // 处理上传逻辑
    input.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            onLoad(e.target.result);
            status.textContent = "已上传：" + file.name;
            event.target.value = ''; // 清空值以支持重复上传
        };
        reader.readAsDataURL(file);
    });
}

async function uploadCardToAirtable({ theme, font, title, quote, imagePath, detail, creator }) {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME}`;
    const record = {
        fields: {
            Theme: JSON.stringify(theme),
            Font: font,
            Title: title,
            Quote: quote,
            ImagePath: imagePath,
            Detail: detail,
            Creator: creator
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
    });

    const data = await res.json();
    if (res.ok) {
        alert('提交成功 ✅');
        console.log('Airtable 返回:', data);
    } else {
        alert('提交失败，请检查控制台错误信息 ❌');
        console.error('Airtable 错误:', data);
    }
}

async function fetchAirtableCards() {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    const data = await res.json();
    if (res.ok) {
        console.log("✅ 成功获取记录:", data.records);
        return data.records.map(r => r.fields);
    } else {
        console.error("❌ 读取失败:", data);
        return [];
    }
}

function getCurrentDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
