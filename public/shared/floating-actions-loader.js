// 通用的悬浮按钮加载器
function loadFloatingActions() {
    // 检查是否已经加载过
    if (document.getElementById('floating-actions-placeholder').innerHTML.trim() !== '') {
        return;
    }
    
    fetch('/shared/floating-actions.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('floating-actions-placeholder').innerHTML = html;
            // Load the JavaScript after HTML is inserted
            const script = document.createElement('script');
            script.src = '/shared/floating-actions.js';
            script.onload = function() {
                // 确保JavaScript加载完成后再初始化
                if (typeof initFAB === 'function') {
                    setTimeout(initFAB, 50);
                }
            };
            document.head.appendChild(script);
        })
        .catch(error => console.error('Error loading floating actions:', error));
}

// 自动加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFloatingActions);
} else {
    loadFloatingActions();
}