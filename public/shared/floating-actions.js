// Floating Action Button functionality
function initFAB() {
    const fabMain = document.getElementById('fab-main');
    const fabMenu = document.getElementById('fab-menu');
    const fabIcon = document.getElementById('fab-icon');
    
    // 如果元素不存在，直接返回
    if (!fabMain || !fabMenu || !fabIcon) {
        return;
    }
    
    let isOpen = false;
    
    fabMain.addEventListener('click', function() {
        isOpen = !isOpen;
        
        if (isOpen) {
            fabMenu.classList.add('active');
            fabIcon.style.transform = 'rotate(45deg)';
            fabMain.setAttribute('aria-expanded', 'true');
            fabMain.setAttribute('aria-label', '关闭快速操作菜单');
        } else {
            fabMenu.classList.remove('active');
            fabIcon.style.transform = 'rotate(0deg)';
            fabMain.setAttribute('aria-expanded', 'false');
            fabMain.setAttribute('aria-label', '打开快速操作菜单');
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.floating-actions') && isOpen) {
            isOpen = false;
            fabMenu.classList.remove('active');
            fabIcon.style.transform = 'rotate(0deg)';
            fabMain.setAttribute('aria-expanded', 'false');
            fabMain.setAttribute('aria-label', '打开快速操作菜单');
        }
    });
    
    // Keyboard support
    fabMain.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fabMain.click();
        }
    });
}

// 延迟初始化，确保HTML已经插入
function delayedInit() {
    // 检查元素是否存在，如果不存在则继续等待
    const checkAndInit = () => {
        const fabMain = document.getElementById('fab-main');
        if (fabMain) {
            initFAB();
        } else {
            // 如果元素还不存在，再等待一段时间
            setTimeout(checkAndInit, 50);
        }
    };
    
    setTimeout(checkAndInit, 50);
}

// 如果是通过动态加载的方式，直接初始化
if (typeof window.floatingActionsLoaded === 'undefined') {
    window.floatingActionsLoaded = true;
    delayedInit();
}