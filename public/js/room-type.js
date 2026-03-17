// public/js/room-type.js

// --- Tiện ích định dạng tiền ---
function formatPrice(value) {
    // Bỏ toàn bộ ký tự không phải số
    const raw = String(value).replace(/\D/g, '');
    if (!raw) return '';
    // Thêm dấu chấm ngàn (nhóm 3 số từ phải sang trái)
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parsePriceInput(formatted) {
    // Bỏ dấu chấm, trả về số nguyên
    return parseInt(String(formatted).replace(/\./g, ''), 10) || 0;
}
// --------------------------------

const RoomTypeManager = {
    apiBaseUrl: '/api/room-types',
    isInitialized: false, // Tránh việc gắn sự kiện click nhiều lần

    init() {
        // 1. Ẩn tất cả các chức năng khác và hiện chức năng Quản lý loại phòng
        document.querySelectorAll('.dashboard-module').forEach(m => m.style.display = 'none');
        document.getElementById('room-types-module').style.display = 'block';

        // 2. Chỉ gắn sự kiện cho các nút bấm ở lần chạy đầu tiên
        if (!this.isInitialized) {
            document.getElementById('btnAddRoomType').addEventListener('click', () => this.showModal());
            document.getElementById('btnSaveRoomType').addEventListener('click', () => this.saveData());

            // THÊM ĐOẠN NÀY: Lắng nghe nút "Xóa luôn" trong Modal xác nhận
            document.getElementById('btnConfirmDelete').addEventListener('click', () => {
                const id = document.getElementById('deleteRoomTypeId').value;
                this.executeDelete(id);
            });

            // Gắn auto-format vào các ô nhập giá
            document.querySelectorAll('.price-input').forEach(input => {
                input.addEventListener('input', function () {
                    const start = this.selectionStart;
                    const lengthBefore = this.value.length;
                    this.value = formatPrice(this.value);
                    // Giữ con trỏ ở đúng vị trí sau khi format
                    const lengthAfter = this.value.length;
                    this.setSelectionRange(start + (lengthAfter - lengthBefore), start + (lengthAfter - lengthBefore));
                });
                // Chặn nhập ký tự không phải số
                input.addEventListener('keypress', function (e) {
                    if (!/[0-9]/.test(e.key)) e.preventDefault();
                });
            });

            this.isInitialized = true;
        }

        // 3. Nạp dữ liệu vào bảng
        this.loadData();
    },

    async loadData() {
        try {
            const res = await fetch(this.apiBaseUrl);
            const json = await res.json();
            this.renderTable(json.data);
        } catch (err) {
            console.error('Lỗi tải dữ liệu', err);
            document.getElementById('roomTypeTableBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">Lỗi tải dữ liệu!</td></tr>`;
        }
    },

    renderTable(data) {
        const tbody = document.getElementById('roomTypeTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Chưa có dữ liệu loại phòng.</td></tr>';
            return;
        }

        window.currentRoomTypes = data;

        tbody.innerHTML = data.map((item, index) => `
            <tr>
                <td class="fw-bold text-dark text-name">${item.name}</td>
                <td class="text-price-day">${Number(item.daily_price).toLocaleString('vi-VN')} vnđ</td>
                <td class="text-price-hour">${Number(item.hourly_price).toLocaleString('vi-VN')} vnđ</td>
                <td class="text-muted">${item.description || ''}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-warning" onclick="RoomTypeManager.clickEdit(${index})" title="Sửa">
                        <i class="fa-solid fa-pen"></i> </button>
                    <button class="btn btn-sm btn-outline-danger ms-1" onclick="RoomTypeManager.clickDelete(${index})" title="Xóa">
                        <i class="fa-solid fa-trash"></i> </button>
                </td>
            </tr>
        `).join('');
    },

    // Hàm trung gian mở form Sửa
    clickEdit(index) {
        const item = window.currentRoomTypes[index];
        this.showModal(item.id, item.name, item.daily_price, item.hourly_price, item.description || '');
    },

    // Hàm trung gian gọi lệnh Xóa
    clickDelete(index) {
        const item = window.currentRoomTypes[index];

        // Lưu ID của phòng vào ô ẩn bên trong Modal Xóa
        document.getElementById('deleteRoomTypeId').value = item.id;

        // Gọi Modal Xóa hiển thị ra giữa màn hình
        const deleteModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteConfirmModal'));
        deleteModal.show();
    },


    showModal(id = '', name = '', daily = '', hourly = '', desc = '') {
        // Dòng này để test: Nhấn F12 (tab Console) xem có in ra dòng này không khi bấm nút
        console.log("Đã bấm nút! Đang mở form cho ID:", id || "Thêm mới");

        // Đổ dữ liệu vào các ô input
        document.getElementById('rtId').value = id;
        document.getElementById('rtName').value = name;
        document.getElementById('rtDailyPrice').value = daily ? formatPrice(daily) : '';
        document.getElementById('rtHourlyPrice').value = hourly ? formatPrice(hourly) : '';
        document.getElementById('rtDescription').value = desc;

        // Đổi tiêu đề form tùy theo trạng thái là Thêm mới hay Cập nhật
        document.getElementById('roomTypeModalLabel').textContent = id ? 'Cập nhật loại phòng' : 'Thêm loại phòng mới';

        // Gọi Modal của Bootstrap hiển thị lên (Dùng getOrCreateInstance để tránh lỗi)
        const modalElement = document.getElementById('roomTypeModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    },

    async saveData() {
        const id = document.getElementById('rtId').value;
        const payload = {
            name: document.getElementById('rtName').value.trim(),
            // Bỏ dấu chấm định dạng, lấy số thực để gửi lên server
            daily_price: parsePriceInput(document.getElementById('rtDailyPrice').value),
            hourly_price: parsePriceInput(document.getElementById('rtHourlyPrice').value),
            description: document.getElementById('rtDescription').value.trim()
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${this.apiBaseUrl}/${id}` : this.apiBaseUrl;

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const modalElement = document.getElementById('roomTypeModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) { modalInstance.hide(); }
                showNotify(id ? 'Cập nhật loại phòng thành công!' : 'Thêm loại phòng thành công!');
                this.loadData();
            } else {
                const err = await res.json();
                showNotify(err.error || 'Có lỗi xảy ra!', 'error');
            }
        } catch (e) {
            console.error(e);
            showNotify('Lỗi kết nối server!', 'error');
        }
    },

    async executeDelete(id) {
        // Không dùng confirm() ở đây nữa vì đã có form xác nhận rồi
        try {
            const res = await fetch(`${this.apiBaseUrl}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                const modalElement = document.getElementById('deleteConfirmModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) { modalInstance.hide(); }
                showNotify('Xóa loại phòng thành công!');
                this.loadData();
            } else {
                showNotify('Lỗi khi xóa dữ liệu!', 'error');
            }
        } catch (e) {
            console.error(e);
            showNotify('Lỗi kết nối server!', 'error');
        }
    }
};

window.RoomTypeManager = RoomTypeManager;