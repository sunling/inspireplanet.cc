// utils.js - 公共脚本函数集合

/**
 * 加载图像列表并填充 image-select 下拉菜单
 * @param {string} selectId 下拉框的 id
 * @param {string} jsonPath 图片描述 json 文件路径
 * @param {Function} onLoaded 回调函数（完成后可调用 renderCard 等）
 */
function loadImages(selectId = "image-select", jsonPath = "images.json", onLoaded = renderCard) {
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
  
        if (typeof onLoaded === "function") onLoaded();
      })
      .catch(e => {
        console.error("加载背景图失败:", e);
        document.getElementById(selectId).innerHTML = `
          <option value="images/biking.png">默认背景</option>
        `;
      });
  }
  
  // 你可以在这里添加更多公用函数，例如 applyTheme、debounce 等
  