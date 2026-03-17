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

    // --- Xử lý điều hướng sidebar (nav-action) ---
    const pageTitle = document.querySelector('.page-title');

    const actionHandlers = {
        'revenue-stats': {
            label: 'Thống kê Doanh thu',
            init: () => {
                // Ẩn tất cả module khác
                document.querySelectorAll('.dashboard-module').forEach(m => m.style.display = 'none');
                // Hiện module thống kê
                const revModule = document.getElementById('revenue-stats-module');
                if (revModule) revModule.style.display = 'block';
            }
        },
        'room-types': {
            label: 'Quản lý loại phòng',
            init: () => RoomTypeManager.init()
        },
        'room-details': {
            label: 'Quản lý chi tiết phòng',
            init: () => RoomDetailManager.init()
        },
        'employee-management': {
            label: 'Quản lý nhân viên',
            init: () => EmployeeManager.init()
        },
        'customer-management': {
            label: 'Quản lý khách hàng',
            init: () => CustomerManager.init()
        },
        'category-management': {
            label: 'Quản lý danh mục sản phẩm',
            init: () => CategoryManager.init()
        },
        'product-management': {
            label: 'Quản lý kho hàng',
            init: () => ProductManager.init()
        },
        'service-management': {
            label: 'Dịch vụ chung',
            init: () => ServiceManager.init() // Sửa dòng này
        },
        'coupon-management': {
            label: 'Quản lý Mã giảm giá',
            init: () => DiscountManager.init()
        },
        'activity-log': {
            label: 'Nhật ký hoạt động',
            init: () => ActivityLogManager.init()
        },
        'overview': {
            label: 'Tổng quan Hệ thống',
            init: () => DashboardOverviewManager.init()
        },
        'account-setting': {
            label: 'Cài đặt tài khoản & Hệ thống',
            init: () => AccountSettingManager.init()
        },
        'booking-management': {
            label: 'Lễ tân: Đặt & Thuê phòng',
            init: () => {
                history.pushState(null, '', '/bookings/page');
                BookingManager.init();
            }
        },
    };

    document.querySelectorAll('.nav-action[data-action]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const action = link.dataset.action;
            const handler = actionHandlers[action];
            if (!handler) return;

            // Cập nhật tiêu đề
            if (pageTitle) pageTitle.textContent = handler.label;

            // Highlight link active
            document.querySelectorAll('.nav-action').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Chạy module tương ứng
            handler.init();
        });
    });

    // Tự động load module "Quản lý loại phòng" ngay khi vào trang
    // Thay vì tự động load module "room-types", hãy đổi thành "revenue-stats"
    document.querySelector('.nav-action[data-action="revenue-stats"]')?.click();


    // --- Xác nhận đăng xuất (Custom Modal) ---
    const btnLogout = document.querySelector('a[href="/auth/logout"]');

    if (btnLogout) {
        // Tạo modal HTML
        const modalHTML = `
            <div class="logout-modal-backdrop" id="logoutModalBackdrop">
                <div class="logout-modal">
                    <div class="modal-icon">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </div>
                    <h3>Xác nhận đăng xuất</h3>
                    <p>Bạn có chắc chắn muốn đăng xuất<br>khỏi hệ thống không?</p>
                    <div class="logout-modal-actions">
                        <button class="btn-cancel-logout" id="btnCancelLogout">Hủy</button>
                        <button class="btn-confirm-logout" id="btnConfirmLogout">Đăng xuất</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const backdrop = document.getElementById('logoutModalBackdrop');
        const btnCancel = document.getElementById('btnCancelLogout');
        const btnConfirm = document.getElementById('btnConfirmLogout');

        // Mở modal
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            backdrop.classList.add('active');
        });

        // Hủy
        btnCancel.addEventListener('click', () => {
            backdrop.classList.remove('active');
        });

        // Bấm backdrop bên ngoài để đóng
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) backdrop.classList.remove('active');
        });

        // Xác nhận → logout
        btnConfirm.addEventListener('click', () => {
            window.location.href = '/auth/logout';
        });
    }

});
