/**
 * Layout Manager - Handles dynamic loading of header and footer
 * and manages user authentication state across the site
 */

class LayoutManager {
    constructor() {
        this.headerLoaded = false;
        this.footerLoaded = false;
        this.init();
    }

    async init() {
        await this.loadLayout();
        this.setupAuthHandlers();
        this.checkAuthStatus();
    }

    /**
     * Load header and footer HTML fragments
     */
    async loadLayout() {
        try {
            await Promise.all([
                this.loadHeader(),
                this.loadFooter()
            ]);
        } catch (error) {
            console.error('Failed to load layout components:', error);
        }
    }

    /**
     * Load and insert header at the top of body
     */
    async loadHeader() {
        try {
            const response = await fetch('/shared/header.html');
            if (!response.ok) {
                throw new Error(`Failed to load header: ${response.status}`);
            }
            
            const headerHTML = await response.text();
            const headerContainer = document.createElement('div');
            headerContainer.innerHTML = headerHTML;
            
            // Insert at the beginning of body
            document.body.insertBefore(headerContainer.firstElementChild, document.body.firstChild);
            
            // Check if page-content container exists, if not, create one for the content
            const pageContent = document.querySelector('.page-content');
            if (!pageContent) {
                // Create a page-content container for the main content
                const newPageContent = document.createElement('div');
                newPageContent.className = 'page-content';
                
                // Move all body children except the header into the page-content container
                const header = document.querySelector('.site-header');
                let currentChild = document.body.firstChild;
                const childrenToMove = [];
                
                // Collect all children that need to be moved
                while (currentChild) {
                    const nextChild = currentChild.nextSibling;
                    if (currentChild !== header) {
                        childrenToMove.push(currentChild);
                    }
                    currentChild = nextChild;
                }
                
                // Move collected children to the new container
                childrenToMove.forEach(child => {
                    newPageContent.appendChild(child);
                });
                
                // Add the page-content container to the body
                document.body.appendChild(newPageContent);
            }
            
            this.headerLoaded = true;
            console.log('Header loaded successfully');
        } catch (error) {
            console.error('Error loading header:', error);
        }
    }

    /**
     * Load and insert footer at the bottom of body
     */
    async loadFooter() {
        try {
            const response = await fetch('/shared/footer.html');
            if (!response.ok) {
                throw new Error(`Failed to load footer: ${response.status}`);
            }
            
            const footerHTML = await response.text();
            const footerContainer = document.createElement('div');
            footerContainer.innerHTML = footerHTML;
            
            // Always append footer to body to ensure it spans full width
            document.body.appendChild(footerContainer.firstElementChild);
            
            this.footerLoaded = true;
            console.log('Footer loaded successfully');
        } catch (error) {
            console.error('Error loading footer:', error);
        }
    }

    /**
     * Setup authentication event handlers
     */
    setupAuthHandlers() {
        // Listen for storage changes (login/logout from other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'jwt' || e.key === 'userToken' || e.key === 'userInfo') {
                this.checkAuthStatus();
            }
        });

        // Setup logout handler
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('logout-btn') || e.target.onclick === 'logout()') {
                this.logout();
            }
        });

        // Setup user dropdown handlers
        this.setupUserDropdown();
    }

    /**
     * Setup user dropdown menu functionality
     */
    setupUserDropdown() {
        // Wait for header to be loaded
        const checkAndSetup = () => {
            
            const userMenuBtn = document.getElementById('userMenuBtn');
            const userDropdown = document.getElementById('userDropdown');
            const userDropdownContainer = document.querySelector('.user-dropdown');
            console.log(userMenuBtn)
            if (userMenuBtn && userDropdown && userDropdownContainer) {
                // Remove existing listeners to avoid duplicates
                if (this.userDropdownSetup) {
                    return; // Already setup
                }
                
                // Toggle dropdown on button click
                const toggleDropdown = (e) => {
                    e.stopPropagation();
                    userDropdownContainer.classList.toggle('open');
                };
                userMenuBtn.addEventListener('click', toggleDropdown);

                // Close dropdown when clicking outside
                const closeOnOutsideClick = (e) => {
                    if (!userDropdownContainer.contains(e.target)) {
                        userDropdownContainer.classList.remove('open');
                    }
                };
                document.addEventListener('click', closeOnOutsideClick);

                // Close dropdown when pressing Escape key
                const closeOnEscape = (e) => {
                    if (e.key === 'Escape') {
                        userDropdownContainer.classList.remove('open');
                    }
                };
                document.addEventListener('keydown', closeOnEscape);
                
                // Mark as setup to avoid duplicates
                this.userDropdownSetup = true;
                
                // Store cleanup function
                this.cleanupUserDropdown = () => {
                    userMenuBtn.removeEventListener('click', toggleDropdown);
                    document.removeEventListener('click', closeOnOutsideClick);
                    document.removeEventListener('keydown', closeOnEscape);
                    this.userDropdownSetup = false;
                };
            } else if (this.headerLoaded) {
                // Header is loaded but elements not found, retry after a short delay
                setTimeout(checkAndSetup, 100);
            }
        };

        // Initial setup
        if (this.headerLoaded) {
            checkAndSetup();
        } else {
            // Wait for header to load
            const interval = setInterval(() => {
                if (this.headerLoaded) {
                    clearInterval(interval);
                    checkAndSetup();
                }
            }, 100);
        }
    }

    /**
     * Check current authentication status and update UI
     */
    checkAuthStatus() {
        // Wait for header to be loaded before checking auth
        if (!this.headerLoaded) {
            setTimeout(() => this.checkAuthStatus(), 100);
            return;
        }

        const jwt = localStorage.getItem('jwt') || localStorage.getItem('userToken');
        const userInfo = localStorage.getItem('userInfo');
        
        const loginSection = document.getElementById('loginSection');
        const userSection = document.getElementById('userSection');
        
        if (!loginSection || !userSection) {
            // Header not fully loaded yet, retry
            setTimeout(() => this.checkAuthStatus(), 100);
            return;
        }

        if (jwt && userInfo) {
            try {
                const user = JSON.parse(userInfo);
                this.showUserSection(user);
            } catch (error) {
                console.error('Failed to parse user info:', error);
                this.showLoginSection();
            }
        } else {
            this.showLoginSection();
        }
    }

    /**
     * Show login button
     */
    showLoginSection() {
        const loginSection = document.getElementById('loginSection');
        const userSection = document.getElementById('userSection');
        const loginLink = loginSection ? loginSection.querySelector('a.login-btn') : null;
        
        if (loginSection && userSection) {
            loginSection.style.display = 'flex';
            userSection.style.display = 'none';

            // 为登录按钮附加回跳参数
            if (loginLink) {
                const current = encodeURIComponent(window.location.href);
                // 兼容不同路径写法，统一指向 login.html 并附带 redirect
                loginLink.href = `/login.html?redirect=${current}`;
            }
        }
    }

    /**
     * Show user dropdown menu
     */
    showUserSection(user) {
        const loginSection = document.getElementById('loginSection');
        const userSection = document.getElementById('userSection');
        const userName = document.getElementById('userName');
        
        if (loginSection && userSection) {
            loginSection.style.display = 'none';
            userSection.style.display = 'flex';
            
            if (userName) {
                userName.textContent = user.name || user.username || '用户';
            }
            
            // Setup dropdown functionality after showing user section
            setTimeout(() => this.setupUserDropdown(), 50);
        }
    }

    /**
     * Handle user logout
     */
    logout() {
        // Clear all authentication data
        localStorage.removeItem('jwt');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userId');
        
        // Show success message (optional)
        this.showLogoutMessage();
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            const redirect = encodeURIComponent(window.location.href);
            window.location.href = `/login.html?redirect=${redirect}`;
        }, 1000);
    }

    /**
     * Show logout success message
     */
    showLogoutMessage() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = '已成功退出登录';
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 3000);
    }

    /**
     * Refresh authentication status (can be called from other scripts)
     */
    refreshAuth() {
        this.checkAuthStatus();
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        const jwt = localStorage.getItem('jwt') || localStorage.getItem('userToken');
        return !!jwt;
    }

    /**
     * Get current user info
     */
    getCurrentUser() {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                return JSON.parse(userInfo);
            } catch (error) {
                console.error('Failed to parse user info:', error);
                return null;
            }
        }
        return null;
    }
}

// Global layout manager instance
let layoutManager;

// Initialize layout when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    layoutManager = new LayoutManager();
});

// Global logout function for compatibility with existing code
function logout() {
    if (layoutManager) {
        layoutManager.logout();
    } else {
        // Fallback if layout manager not ready
        localStorage.removeItem('jwt');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userId');
        const redirect = encodeURIComponent(window.location.href);
        window.location.href = `/login.html?redirect=${redirect}`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LayoutManager, logout };
}

// Make available globally
window.LayoutManager = LayoutManager;
window.logout = logout;
window.layoutManager = layoutManager;
