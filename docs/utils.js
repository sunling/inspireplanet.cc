// utils.js - 公共脚本函数集合

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

function getCurrentDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
