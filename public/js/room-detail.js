const RoomDetailManager = {
    apiTypeUrl: '/api/room-types',
    apiDetailUrl: '/api/room-details',
    isInitialized: false,
    currentTypeId: null, // Lưu lại ID loại phòng đang được chọn
    currentTypeName: '',

    init() {
        // 1. Ẩn module khác, hiện module chi tiết phòng
        document.querySelectorAll('.dashboard-module').forEach(m => m.style.display = 'none');
        document.getElementById('room-details-module').style.display = 'block';

        // 2. Gắn sự kiện (chỉ làm 1 lần)
        if (!this.isInitialized) {
            document.getElementById('btnAddRoomDetail').addEventListener('click', () => this.showModal());
            document.getElementById('btnSaveRoomDetail').addEventListener('click', () => this.saveData());
            document.getElementById('btnConfirmDeleteRoomDetail').addEventListener('click', () => {
                const id = document.getElementById('deleteRoomDetailId').value;
                this.executeDelete(id);
            });
            document.getElementById('btnSaveSetupRoom').addEventListener('click', () => this.saveSetupData());

            // Chặn nhập chữ và số âm vào Số người & Diện tích
            const formatInputNumberOnly = (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            };
            document.getElementById('setupCapacity').addEventListener('input', formatInputNumberOnly);
            document.getElementById('setupSize').addEventListener('input', formatInputNumberOnly);

            this.isInitialized = true;
        }

        // 3. Mặc định luôn hiện Bước 1 (Chọn loại phòng) khi click vào menu
        this.goBack();
    },

    // --- MÀN HÌNH 1: TẢI DANH SÁCH LOẠI PHÒNG ---
    async loadRoomTypes() {
        try {
            const res = await fetch(this.apiTypeUrl);
            const json = await res.json();
            this.renderRoomTypes(json.data);
        } catch (err) {
            console.error('Lỗi tải loại phòng', err);
        }
    },

    renderRoomTypes(data) {
        const grid = document.getElementById('rd-types-grid');
        if (!data || data.length === 0) {
            grid.innerHTML = '<div class="col-12 text-muted">Chưa có loại phòng nào. Hãy tạo loại phòng trước.</div>';
            return;
        }

        grid.innerHTML = data.map(item => `
            <div class="col-md-4 col-sm-6">
                <div class="card h-100 shadow-sm border-0" style="cursor: pointer;" onclick="RoomDetailManager.openRoomList('${item.id}', '${item.name}')">
                    <div class="card-body text-center bg-light rounded hover-bg-primary transition">
                        <i class="fa-solid fa-door-open fs-1 text-primary mb-3"></i>
                        <h5 class="card-title fw-bold">${item.name}</h5>
                        <p class="card-text text-muted small">Nhấn để xem các phòng</p>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // --- CHUYỂN ĐỔI MÀN HÌNH ---
    openRoomList(typeId, typeName) {
        this.currentTypeId = typeId;
        this.currentTypeName = typeName;

        // Đổi giao diện
        document.getElementById('rd-step1-types').style.display = 'none';
        document.getElementById('rd-step2-rooms').style.display = 'block';
        document.getElementById('rd-selected-type-name').textContent = `Danh sách phòng: ${typeName}`;

        // Tải danh sách phòng thuộc typeId này
        this.loadRoomsByType();
    },

    goBack() {
        this.currentTypeId = null;
        document.getElementById('rd-step2-rooms').style.display = 'none';
        document.getElementById('rd-step1-types').style.display = 'block';
        this.loadRoomTypes();
    },

    // --- MÀN HÌNH 2: TẢI & HIỂN THỊ PHÒNG CHI TIẾT ---
    async loadRoomsByType() {
        try {
            const res = await fetch(this.apiDetailUrl);
            const json = await res.json();
            // Lọc ra các phòng thuộc loại phòng đang chọn
            const filteredRooms = json.data.filter(r => r.room_type_id === this.currentTypeId);
            this.renderRooms(filteredRooms);
        } catch (err) {
            console.error('Lỗi tải chi tiết phòng', err);
        }
    },

    renderRooms(data) {
        const tbody = document.getElementById('roomDetailTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Loại phòng này chưa có phòng nào.</td></tr>';
            return;
        }

        window.currentRooms = data;

        const RENTED_STATUSES = ['HOURLY_RENTED', 'DAILY_RENTED'];

        tbody.innerHTML = data.map((item, index) => {
            // Badge trạng thái
            let statusBadge = '';
            if (item.status === 'AVAILABLE') statusBadge = '<span class="badge bg-success">Phòng trống</span>';
            else if (item.status === 'MAINTENANCE') statusBadge = '<span class="badge bg-warning text-dark">Đang sửa</span>';
            else if (item.status === 'CLEANING') statusBadge = '<span class="badge bg-info text-dark">Cần dọn dẹp</span>';
            else if (item.status === 'HOURLY_RENTED') statusBadge = '<span class="badge bg-danger">Thuê theo giờ</span>';
            else if (item.status === 'DAILY_RENTED') statusBadge = '<span class="badge bg-danger">Thuê theo ngày</span>';
            else statusBadge = `<span class="badge bg-secondary">${item.status}</span>`;

            // Kiểm tra phòng đang được thuê — disable nút Sửa và Xóa
            const isRented = RENTED_STATUSES.includes(item.status);
            const disabledAttr = isRented ? 'disabled' : '';
            const disabledTitle = isRented ? 'title="Phòng đang được thuê, không thể thao tác"' : '';

            return `
            <tr style="cursor: pointer;" onclick="RoomDetailManager.openSetupModal('${item.id}')" class="hover-shadow-sm">
                <td class="fw-bold text-dark">${item.room_number}</td>
                <td>Tầng ${item.floor || '-'}</td>
                <td>${statusBadge}</td>
                <td class="text-muted">${item.notes || ''}</td>
                <td class="text-end" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-outline-warning" onclick="RoomDetailManager.clickEdit(${index})" ${disabledAttr} ${disabledTitle}><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-outline-danger ms-1" onclick="RoomDetailManager.clickDelete(${index})" ${disabledAttr} ${disabledTitle}><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `}).join('');
    },

    // --- CRUD THAO TÁC ---
    clickEdit(index) {
        const item = window.currentRooms[index];
        this.showModal(item.id, item.room_number, item.floor, item.status, item.notes);
    },

    clickDelete(index) {
        const item = window.currentRooms[index];
        document.getElementById('deleteRoomDetailId').value = item.id;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteRoomDetailModal')).show();
    },

    showModal(id = '', room_number = '', floor = '', status = 'AVAILABLE', notes = '') {
        const RENTED_STATUSES = ['HOURLY_RENTED', 'DAILY_RENTED'];
        const isRented = RENTED_STATUSES.includes(status);

        document.getElementById('rdId').value = id;
        document.getElementById('rdRoomNumber').value = room_number;
        document.getElementById('rdFloor').value = floor;
        document.getElementById('rdStatus').value = status;
        document.getElementById('rdNotes').value = notes;

        // Khóa select trạng thái nếu phòng đang thuê
        const selectStatus = document.getElementById('rdStatus');
        selectStatus.disabled = isRented;

        // Hiện cảnh báo nếu phòng đang thuê
        let warningEl = document.getElementById('rdRentedWarning');
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = 'rdRentedWarning';
            warningEl.className = 'alert alert-warning mt-2 mb-0 py-2 small';
            warningEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1"></i> Phòng đang được thuê. Không thể thay đổi trạng thái.';
            selectStatus.parentNode.appendChild(warningEl);
        }
        warningEl.style.display = isRented ? 'block' : 'none';

        document.getElementById('roomDetailModalLabel').textContent = id ? 'Cập nhật phòng' : `Thêm phòng mới (${this.currentTypeName})`;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('roomDetailModal')).show();
    },

    async saveData() {
        const id = document.getElementById('rdId').value;
        const payload = {
            room_type_id: this.currentTypeId, // Lấy ID loại phòng đang mở
            room_number: document.getElementById('rdRoomNumber').value,
            floor: document.getElementById('rdFloor').value,
            status: document.getElementById('rdStatus').value,
            notes: document.getElementById('rdNotes').value
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${this.apiDetailUrl}/${id}` : this.apiDetailUrl;

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('roomDetailModal')).hide();
                showNotify(method === 'PUT' ? 'Cập nhật phòng thành công!' : 'Thêm phòng thành công!');
                this.loadRoomsByType();
            } else {
                const err = await res.json();
                showNotify(err.error || 'Có lỗi xảy ra!', 'error');
            }
        } catch (e) {
            showNotify('Lỗi kết nối server!', 'error');
        }
    },

    async executeDelete(id) {
        try {
            const res = await fetch(`${this.apiDetailUrl}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('deleteRoomDetailModal')).hide();
                showNotify('Xóa phòng thành công!');
                this.loadRoomsByType();
            } else {
                showNotify('Lỗi khi xóa!', 'error');
            }
        } catch (e) {
            showNotify('Lỗi kết nối!', 'error');
        }
    },

    openSetupModal(id) {
        const item = window.currentRooms.find(r => r.id === id);
        if (!item) return;

        document.getElementById('setupRoomId').value = item.id;
        document.getElementById('setupRoomTitle').textContent = `Phòng ${item.room_number}`;

        document.getElementById('setupCapacity').value = item.capacity || 2;
        document.getElementById('setupSize').value = item.room_size || '';
        document.getElementById('setupBed').value = item.bed_type || '';

        // Checkboxes tiện ích
        const amenities = typeof item.amenities === 'string' ? JSON.parse(item.amenities) : (item.amenities || []);
        document.querySelectorAll('.setup-chk').forEach(chk => {
            chk.checked = amenities.includes(chk.value);
        });

        // Xử lý hiển thị 1 ảnh đại diện
        document.getElementById('setupExistingImage').value = item.room_img_url || '';
        document.getElementById('setupImageUpload').value = '';

        const preview = document.getElementById('setupImagePreview');
        if (item.room_img_url) {
            preview.innerHTML = `
                <div class="position-relative border rounded p-1" style="width: 150px; height: 100px;">
                    <img src="${item.room_img_url}" class="w-100 h-100 object-fit-cover rounded">
                </div>`;
        } else {
            preview.innerHTML = '<span class="text-muted small">Chưa có ảnh đại diện.</span>';
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById('roomSetupModal')).show();
    },

    async saveSetupData() {
        const id = document.getElementById('setupRoomId').value;
        const btnSave = document.getElementById('btnSaveSetupRoom');

        // BỔ SUNG: Lấy lại thông tin gốc của phòng để gửi kèm, tránh lỗi 400 Bad Request
        const currentItem = window.currentRooms.find(r => r.id === id);
        if (!currentItem) return;

        // 1. Lấy mảng tiện ích
        const selectedAmenities = Array.from(document.querySelectorAll('.setup-chk:checked')).map(chk => chk.value);

        // 2. Upload ảnh (Nếu Lễ tân chọn 1 ảnh mới)
        let finalImageUrl = document.getElementById('setupExistingImage').value;
        const fileInput = document.getElementById('setupImageUpload');

        if (fileInput.files.length > 0) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải ảnh...';

            const formData = new FormData();
            formData.append('images', fileInput.files[0]);

            try {
                const uploadRes = await fetch('/api/upload/rooms', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();

                if (uploadRes.ok && uploadData.urls.length > 0) {
                    finalImageUrl = uploadData.urls[0];
                } else {
                    btnSave.disabled = false;
                    btnSave.innerHTML = '<i class="fa-solid fa-cloud-arrow-up me-2"></i>Lưu thiết lập';
                    return showNotify('Lỗi tải ảnh lên!', 'error');
                }
            } catch (err) {
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="fa-solid fa-cloud-arrow-up me-2"></i>Lưu thiết lập';
                return showNotify('Lỗi kết nối tải ảnh!', 'error');
            }
        }

        // 3. Gửi lên lưu vào DB
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang lưu...';

        const payload = {
            // GỬI KÈM CÁC TRƯỜNG CƠ BẢN ĐỂ QUA CỬA VALIDATE CỦA BACKEND
            room_type_id: currentItem.room_type_id,
            room_number: currentItem.room_number,
            status: currentItem.status,
            floor: currentItem.floor,
            notes: currentItem.notes,

            // THÔNG TIN SETUP GIAO DIỆN
            capacity: parseInt(document.getElementById('setupCapacity').value) || 2,
            room_size: parseInt(document.getElementById('setupSize').value) || null,
            bed_type: document.getElementById('setupBed').value,
            amenities: selectedAmenities,
            room_img_url: finalImageUrl
        };

        try {
            const res = await fetch(`${this.apiDetailUrl}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const modalEl = document.getElementById('roomSetupModal');
                const modalInst = bootstrap.Modal.getInstance(modalEl);
                if (modalInst) modalInst.hide();
                showNotify('Lưu thiết lập phòng thành công!');
                this.loadRoomsByType();
            } else {
                const err = await res.json();
                showNotify(err.error || 'Lỗi khi lưu thiết lập!', 'error');
            }
        } catch (e) { showNotify('Lỗi mạng!', 'error'); }
        finally {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fa-solid fa-cloud-arrow-up me-2"></i>Lưu thiết lập';
        }
    }
};

window.RoomDetailManager = RoomDetailManager;