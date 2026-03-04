// =========================================
//   JS TRANG HOME-M (Dashboard Quản lý)
// =========================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Toggle sidebar (mobile / tablet) ---
    const btnToggle = document.getElementById('btnToggleSidebar');
    const sidebar = document.querySelector('.sidebar-left');

    // Tạo overlay động
    const overlay = document.createElement('div');
    overlay.classList.add('sidebar-overlay');
    document.body.appendChild(overlay);

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // chặn scroll body
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
        });
    }

    // Bấm overlay để đóng sidebar
    overlay.addEventListener('click', closeSidebar);

    // Khi resize lên desktop thì đóng sidebar + xóa overlay
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            closeSidebar();
        }
    });

    // --- Highlight link active theo URL ---
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link, .sidebar-nav .submenu li a');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.closest('.nav-item')?.classList.add('active');
        }
    });

    // --- Toggle submenu (accordion) ---
    const submenuToggles = document.querySelectorAll('.submenu-toggle');

    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();

            const parentItem = toggle.closest('.nav-item');
            const isOpen = parentItem.classList.contains('open');

            // Đóng tất cả submenu khác (accordion behavior)
            submenuToggles.forEach(otherToggle => {
                const otherParent = otherToggle.closest('.nav-item');
                if (otherParent !== parentItem) {
                    otherParent.classList.remove('open');
                }
            });

            // Toggle submenu hiện tại
            parentItem.classList.toggle('open', !isOpen);
        });
    });

});
