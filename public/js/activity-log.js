// Hàm format thời gian đẹp: DD/MM/YYYY HH:mm:ss
function formatDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `<span class="fw-bold">${d}/${m}/${y}</span> <span class="text-muted small">${hh}:${mm}:${ss}</span>`;
}

const ActivityLogManager = {
    apiBaseUrl: '/api/activity-logs', // Đảm bảo backend route khớp với tên này
    isInitialized: false,

    init() {
        // Ẩn các module khác, hiện module Log
        document.querySelectorAll('.dashboard-module').forEach(m => m.style.display = 'none');
        document.getElementById('activity-log-module').style.display = 'block';

        if (!this.isInitialized) {
            // Sự kiện dọn rác
            document.getElementById('btnClearLogs').addEventListener('click', () => {
                bootstrap.Modal.getOrCreateInstance(document.getElementById('clearLogModal')).show();
            });

            // Xác nhận dọn rác
            document.getElementById('btnConfirmClearLogs').addEventListener('click', () => this.executeClearLogs());

            // Tìm kiếm (Live search trên RAM cho nhanh)
            // Lắng nghe sự kiện Tìm kiếm và Lọc ngày
            document.getElementById('searchLog').addEventListener('input', () => this.applyFilters());
            document.getElementById('filterDate').addEventListener('change', () => this.applyFilters());

            // Nút reset bộ lọc
            document.getElementById('btnClearFilter').addEventListener('click', () => {
                document.getElementById('searchLog').value = '';
                document.getElementById('filterDate').value = '';
                this.renderTable(window.allLogs); // Trả lại bảng gốc
            });

            this.isInitialized = true;
        }

        this.loadData();
    },

    async loadData() {
        try {
            const res = await fetch(this.apiBaseUrl);
            const json = await res.json();
            window.allLogs = json.data;
            this.renderTable(window.allLogs);
        } catch (err) {
            document.getElementById('logTableBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">Lỗi kết nối hoặc không tải được nhật ký!</td></tr>`;
        }
    },

    applyFilters() {
        const keyword = document.getElementById('searchLog').value.toLowerCase().trim();
        const dateValue = document.getElementById('filterDate').value; // Trả về định dạng 'YYYY-MM-DD'

        let filteredData = window.allLogs;

        // 1. Lọc theo chữ trước
        if (keyword) {
            filteredData = filteredData.filter(item => {
                return (item.username || '').toLowerCase().includes(keyword) ||
                    (item.action || '').toLowerCase().includes(keyword) ||
                    (item.entity_type || '').toLowerCase().includes(keyword) ||
                    (item.details || '').toLowerCase().includes(keyword);
            });
        }

        // 2. Lọc tiếp theo ngày tháng (Nếu người dùng có chọn ngày)
        if (dateValue) {
            filteredData = filteredData.filter(item => {
                if (!item.created_at) return false;

                // Đổi thời gian lưu trong DB thành chuẩn YYYY-MM-DD theo giờ Việt Nam
                const logDate = new Date(item.created_at);
                const y = logDate.getFullYear();
                const m = String(logDate.getMonth() + 1).padStart(2, '0');
                const d = String(logDate.getDate()).padStart(2, '0');
                const formattedLogDate = `${y}-${m}-${d}`;

                // So sánh ngày trong DB với ngày khách chọn
                return formattedLogDate === dateValue;
            });
        }

        // 3. Vẽ lại bảng sau khi đã lọc xong
        this.renderTable(filteredData);
    },

    renderTable(data) {
        const tbody = document.getElementById('logTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có nhật ký hoạt động nào.</td></tr>';
            return;
        }

        // Dùng map để render HTML string
        tbody.innerHTML = data.map(item => {
            // 1. Chuyển đổi Hành động thành chữ đơn giản (Không dùng màu mè)
            let actionText = item.action;
            const act = (item.action || '').toUpperCase();
            if (act === 'CREATE') actionText = 'Thêm mới';
            else if (act === 'UPDATE') actionText = 'Cập nhật';
            else if (act === 'DELETE') actionText = 'Xóa';
            else if (act === 'LOGIN') actionText = 'Đăng nhập';
            else if (act === 'LOGOUT') actionText = 'Đăng xuất';

            // 2. Gộp Chức năng và Đối tượng lên cùng 1 dòng
            let entityDisplay = `<span class="fw-bold">${item.entity_type || ''}</span>`;
            if (item.entity_name) {
                entityDisplay += ` - ${item.entity_name}`;
            }

            // Render dòng HTML tối giản
            return `
            <tr>
                <td>${formatDateTime(item.created_at)}</td>
                <td class="fw-bold text-dark">${item.username}</td>
                <td class="text-center fw-semibold text-muted">${actionText.toUpperCase()}</td>
                <td>${entityDisplay}</td>
                <td class="text-muted">${item.details || '-'}</td>
            </tr>
            `;
        }).join('');
    },

    async executeClearLogs() {
        try {
            // Gửi request dọn dẹp log cũ hơn 3 tháng
            const res = await fetch(`${this.apiBaseUrl}/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ months: 3 })
            });

            const result = await res.json();

            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('clearLogModal')).hide();
                showNotify(result.message);
                this.loadData(); // Tải lại bảng
            } else {
                showNotify(result.error || 'Lỗi khi dọn dẹp!', 'error');
            }
        } catch (e) {
            showNotify('Lỗi kết nối tới máy chủ!', 'error');
        }
    }
};

window.ActivityLogManager = ActivityLogManager;