const BookingManager = {
    apiTypeUrl: '/api/room-types',
    apiDetailUrl: '/api/room-details',
    isInitialized: false,
    currentTypeId: null,
    currentTypeName: '',
    currentRoomList: [],
    currentRoomId: null,
    currentRoomNumber: '',

    // Biến cho phần Phiên Thuê
    activeTimerInterval: null,
    currentBookingData: null,
    
    // BỔ SUNG BIẾN NÀY CHO PHẦN CHECKOUT
    checkoutData: {
        subTotal: 0,
        discountAmount: 0,
        discountCode: null,
        finalTotal: 0
    },

    init() {
        // 1. Ẩn các module khác, hiện module Booking
        document.querySelectorAll('.dashboard-module').forEach(m => m.style.display = 'none');
        document.getElementById('booking-management-module').style.display = 'block';

        // 2. Chỉ gán sự kiện 1 lần duy nhất khi khởi tạo
        if (!this.isInitialized) {
            // Bắt sự kiện gõ phím vào ô tìm kiếm
            document.getElementById('bmSearchRoom').addEventListener('input', (e) => {
                this.filterRooms(e.target.value);
            });
            this.isInitialized = true;
        }

        // 3. Mặc định luôn hiển thị Bước 1 (Lưới Chọn loại phòng) mỗi khi bấm vào menu
        this.goBack();

        // THÊM ĐOẠN NÀY ĐỂ KÍCH HOẠT GIAO DIỆN CHỌN GIỜ ĐẸP:
        const fpConfig = {
            enableTime: true,        // Cho phép chọn giờ
            time_24hr: true,         // Giờ 24h (17:30 thay vì 5:30 PM)
            locale: "vn",            // Dịch ra Tiếng Việt
            dateFormat: "Y-m-d\\TH:i", // Giữ nguyên chuẩn lưu Database (rất quan trọng)
            altInput: true,          // Tạo ra một ô hiển thị ảo đẹp mắt
            altFormat: "H\\h i, d/m/Y", // Hiển thị ra màn hình: 17h 30, 25/12/2026
            allowInput: true         // Cho phép Lễ tân gõ tay nếu muốn nhanh
        };
        // Gắn vào 4 ô nhập ngày giờ của bạn
        flatpickr("#resExpectedCheckin", fpConfig);
        flatpickr("#resExpectedCheckout", fpConfig);
        flatpickr("#rfCheckIn", fpConfig);
        flatpickr("#rfCheckOut", fpConfig);
    },

    // --- MÀN HÌNH 1: TẢI DANH SÁCH LOẠI PHÒNG KÈM GIÁ ---
    async loadRoomTypes() {
        try {
            const res = await fetch(this.apiTypeUrl);
            const json = await res.json();
            this.cacheTypes = json.data; // Lưu lại để tính giá
            this.renderRoomTypes(json.data);
        } catch (err) {
            console.error('Lỗi tải loại phòng', err);
        }
    },

    renderRoomTypes(data) {
        const grid = document.getElementById('bm-types-grid');
        if (!data || data.length === 0) {
            grid.innerHTML = '<div class="col-12 text-muted">Chưa có loại phòng nào. Hãy tạo loại phòng trước.</div>';
            return;
        }

        // Căn lề trái nội dung, nút bấm nằm ở giữa phía dưới cùng
        grid.innerHTML = data.map(item => `
            <div class="col-md-4 col-sm-6">
                <div class="card h-100 shadow-sm border-0" style="cursor: pointer;" onclick="BookingManager.openRoomList('${item.id}', '${item.name}')">
                    <div class="card-body bg-white border rounded hover-shadow transition d-flex flex-column p-4">
                        <div class="text-start mb-4">
                            <div class="fs-5 mb-3">
                                <span class="fw-bold text-dark">Tên loại phòng:</span> 
                                <span class="text-primary fw-bold ms-1">${item.name}</span>
                            </div>
                            <div class="text-dark mb-2">
                                <span class="fw-bold">Giá ngày:</span> 
                                <span class="text-danger fw-bold ms-1">${Number(item.daily_price).toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div class="text-dark">
                                <span class="fw-bold">Giá giờ:</span> 
                                <span class="text-danger fw-bold ms-1">${Number(item.hourly_price).toLocaleString('vi-VN')} đ</span>
                            </div>
                        </div>
                        <div class="mt-auto pt-3 border-top text-center text-muted small fst-italic">
                            Nhấn để xem các phòng
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // --- CHUYỂN ĐỔI MÀN HÌNH ---
    openRoomList(typeId, typeName) {
        this.currentTypeId = typeId;
        this.currentTypeName = typeName;

        document.getElementById('bm-step1-types').style.display = 'none';
        document.getElementById('bm-step2-rooms').style.display = 'block';
        document.getElementById('bm-selected-type-name').textContent = `Loại phòng / ${typeName}`;

        this.loadRoomsByType();
    },

    goBack() {
        this.currentTypeId = null;
        document.getElementById('bm-step2-rooms').style.display = 'none';
        document.getElementById('bm-step1-types').style.display = 'block';
        if (document.getElementById('bmSearchRoom')) document.getElementById('bmSearchRoom').value = '';
        this.loadRoomTypes();
    },

    async loadRoomsByType() {
        try {
            const res = await fetch(this.apiDetailUrl);
            const json = await res.json();
            // Lưu lại danh sách phòng của loại phòng này vào biến tạm
            this.currentRoomList = json.data.filter(r => r.room_type_id === this.currentTypeId);
            // Gọi hàm render để hiển thị toàn bộ
            this.renderRooms(this.currentRoomList);
        } catch (err) {
            console.error('Lỗi tải chi tiết phòng', err);
        }
    },

    filterRooms(keyword) {
        if (!this.currentRoomList) return;
        const kw = keyword.toLowerCase().trim();
        const filtered = this.currentRoomList.filter(item =>
            item.room_number.toLowerCase().includes(kw)
        );
        this.renderRooms(filtered);
    },

    // --- CẬP NHẬT HÀM RENDER CHI TIẾT PHÒNG ---
    renderRooms(data) {
        const tbody = document.getElementById('bmRoomTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Loại phòng này chưa có phòng nào.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((item) => {
            let statusBadge = '';
            if (item.status === 'AVAILABLE') statusBadge = '<span class="badge bg-success">Phòng trống</span>';
            else if (item.status === 'MAINTENANCE') statusBadge = '<span class="badge bg-warning text-dark">Đang sửa</span>';
            else if (item.status === 'CLEANING') statusBadge = '<span class="badge bg-info text-dark">Cần dọn dẹp</span>';
            else if (item.status === 'HOURLY_RENTED') statusBadge = '<span class="badge bg-danger">Thuê theo giờ</span>';
            else if (item.status === 'DAILY_RENTED') statusBadge = '<span class="badge bg-danger">Thuê theo ngày</span>';
            else statusBadge = `<span class="badge bg-secondary">${item.status}</span>`;

            const isBusy = ['MAINTENANCE', 'CLEANING', 'HOURLY_RENTED', 'DAILY_RENTED'].includes(item.status);
            const btnLichDat = `<button class="btn btn-sm btn-warning fw-bold text-dark ms-2" onclick="BookingManager.openReservationList('${item.id}', '${item.room_number}')" title="Xem lịch & Đặt trước"><i class="fa-solid fa-calendar-days me-1"></i>Lịch Đặt</button>`;

            let actionButtons = '';
            if (isBusy) {
                if (item.status === 'HOURLY_RENTED' || item.status === 'DAILY_RENTED') {
                    actionButtons = `
                        <button class="btn btn-sm btn-info fw-bold text-dark me-2 shadow-sm" onclick="BookingManager.viewActiveSession('${item.id}', '${item.room_number}')">
                            <i class="fa-solid fa-eye me-1"></i>Phiên thuê
                        </button>
                        ${btnLichDat}`;
                } else {
                    actionButtons = `<span class="text-muted small fst-italic"><i class="fa-solid fa-lock me-1"></i>Đang bận</span> ${btnLichDat}`;
                }
            } else {
                actionButtons = `
                    <button class="btn btn-sm btn-outline-primary fw-bold me-1" onclick="BookingManager.clickRent('${item.id}', '${item.room_number}', 'HOURLY')">Thuê Giờ</button>
                    <button class="btn btn-sm btn-primary fw-bold" onclick="BookingManager.clickRent('${item.id}', '${item.room_number}', 'DAILY')">Thuê Ngày</button>
                    ${btnLichDat}
                `;
            }

            return `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div>
                            <h6 class="mb-0 fw-bold text-dark">${item.room_number}</h6>
                            <small class="text-muted">Tầng ${item.floor || '-'}</small>
                        </div>
                    </div>
                </td>
                <td class="fw-bold text-secondary">${this.currentTypeName}</td>
                <td>${statusBadge}</td>
                <td class="text-end pe-4">${actionButtons}</td>
            </tr>
        `}).join('');
    },

    // =======================================================
    // --- MODAL LỊCH ĐẶT VÀ FORM ĐẶT TRƯỚC (RESERVATION) ---
    // =======================================================
    // =======================================================
    // --- MODAL LỊCH ĐẶT VÀ FORM ĐẶT TRƯỚC (RESERVATION) ---
    // =======================================================
    openReservationList(roomId, roomNumber) {
        this.currentRoomId = roomId;
        this.currentRoomNumber = roomNumber;
        document.getElementById('resListRoomNumber').textContent = roomNumber;

        new bootstrap.Modal(document.getElementById('reservationListModal')).show();
        this.loadReservations(); // Gọi API Thật
    },

    async loadReservations() {
        const tbody = document.getElementById('reservationTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải dữ liệu...</td></tr>';

        try {
            const res = await fetch(`/api/bookings/reservations/${this.currentRoomId}`);
            const json = await res.json();

            if (!json.data || json.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Phòng này chưa có lịch đặt trước nào sắp tới.</td></tr>';
                return;
            }

            tbody.innerHTML = json.data.map(b => {
                // Đổi Date sang chuẩn hiển thị VN
                const ci = new Date(b.expected_checkin);
                const co = new Date(b.expected_checkout);
                const formatTime = (d) => `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN')}`;

                return `
                <tr>
                    <td class="fw-bold text-primary">${b.booking_code}</td>
                    <td class="fw-bold text-dark">${b.guest_name}</td>
                    <td><div class="fw-bold text-dark">${b.guest_phone}</div><small class="text-muted">${b.guest_email || '---'}</small></td>
                    <td class="text-success fw-bold">${formatTime(ci)}</td>
                    <td class="text-danger fw-bold">${formatTime(co)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning me-1 shadow-sm" onclick='BookingManager.editReservation(${JSON.stringify(b)})' title="Sửa/Dời lịch"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-outline-danger shadow-sm" onclick="BookingManager.cancelReservation('${b.booking_id}')" title="Hủy đặt phòng"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) { tbody.innerHTML = '<tr><td colspan="6" class="text-danger">Lỗi tải dữ liệu!</td></tr>'; }
    },



    editReservation(b) {
        bootstrap.Modal.getInstance(document.getElementById('reservationListModal'))?.hide();
        document.getElementById('resFormRoomNumber').textContent = this.currentRoomNumber;

        document.getElementById('resFormBookingId').value = b.booking_id;
        document.getElementById('resGuestName').value = b.guest_name;
        document.getElementById('resGuestPhone').value = b.guest_phone;
        document.getElementById('resGuestEmail').value = b.guest_email || '';

        const tzIn = new Date(b.expected_checkin); tzIn.setMinutes(tzIn.getMinutes() - tzIn.getTimezoneOffset());
        const tzOut = new Date(b.expected_checkout); tzOut.setMinutes(tzOut.getMinutes() - tzOut.getTimezoneOffset());
        
        // Đổ dữ liệu vào Flatpickr
        document.getElementById('resExpectedCheckin')._flatpickr.setDate(tzIn.toISOString().slice(0, 16));
        document.getElementById('resExpectedCheckout')._flatpickr.setDate(tzOut.toISOString().slice(0, 16));

        document.getElementById('btnSaveReservation').onclick = () => this.submitReservationForm();
        new bootstrap.Modal(document.getElementById('reservationFormModal')).show();
    },

    async submitReservationForm() {
        const isEdit = !!document.getElementById('resFormBookingId').value;
        const btnSave = document.getElementById('btnSaveReservation');

        const payload = {
            room_detail_id: this.currentRoomId,
            room_type_id: this.currentTypeId,
            room_number: this.currentRoomNumber,
            guest_name: document.getElementById('resGuestName').value,
            guest_phone: document.getElementById('resGuestPhone').value,
            guest_email: document.getElementById('resGuestEmail').value,
            expected_checkin: document.getElementById('resExpectedCheckin').value,
            expected_checkout: document.getElementById('resExpectedCheckout').value
        };

        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang lưu...';

        try {
            let res;
            if (isEdit) {
                payload.booking_id = document.getElementById('resFormBookingId').value;
                res = await fetch(`/api/bookings/reserve/${payload.booking_id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            } else {
                res = await fetch('/api/bookings/reserve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            }

            const result = await res.json();
            if (res.ok) {
                showNotify('Lưu thông tin đặt phòng thành công!');
                bootstrap.Modal.getInstance(document.getElementById('reservationFormModal')).hide();
                this.openReservationList(this.currentRoomId, this.currentRoomNumber); // Mở lại danh sách
            } else { showNotify(result.error, 'error'); }
        } catch (err) { showNotify(err.message, 'error'); }
        finally { btnSave.disabled = false; btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Lưu thông tin'; }
    },

    async cancelReservation(bookingId) {
        if (!confirm('Bạn có chắc chắn muốn HỦY phiên đặt phòng này không?')) return;
        try {
            const res = await fetch(`/api/bookings/reserve/${bookingId}`, { method: 'DELETE' });
            if (res.ok) {
                showNotify('Đã hủy đặt phòng!');
                this.loadReservations(); // Tải lại danh sách
            } else {
                const result = await res.json();
                showNotify(result.error, 'error');
            }
        } catch (e) { showNotify('Lỗi khi hủy', 'error'); }
    },

    openAddNewReservation() {
        bootstrap.Modal.getInstance(document.getElementById('reservationListModal'))?.hide();
        document.getElementById('resFormRoomNumber').textContent = this.currentRoomNumber;

        document.getElementById('resFormBookingId').value = '';
        document.getElementById('resGuestName').value = '';
        document.getElementById('resGuestPhone').value = '';
        document.getElementById('resGuestEmail').value = '';
        
        // Dùng lệnh clear() của Flatpickr để xóa ngày giờ
        document.getElementById('resExpectedCheckin')._flatpickr.clear();
        document.getElementById('resExpectedCheckout')._flatpickr.clear();

        document.getElementById('btnSaveReservation').onclick = () => this.submitReservationForm();
        new bootstrap.Modal(document.getElementById('reservationFormModal')).show();
    },

    scanQRCode() {
        const scannedSKU = prompt("Giả lập: Hãy đưa mã QR vào máy quét hoặc nhập mã SKU (VD: BKG-8839)");
        if (scannedSKU) {
            showNotify(`Đang tìm đơn đặt phòng có mã: ${scannedSKU}...`, 'info');
            const tbody = document.getElementById('reservationTableBody');
            tbody.innerHTML = `
                <tr>
                    <td class="fw-bold text-primary">${scannedSKU}</td>
                    <td class="fw-bold">Khách (Quét từ QR)</td>
                    <td>0999888777</td>
                    <td class="text-success fw-bold">15/03/2026 14:00</td>
                    <td class="text-danger fw-bold">16/03/2026 12:00</td>
                    <td><span class="badge bg-warning text-dark">Chờ nhận phòng</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning me-1" title="Sửa/Dời lịch"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-outline-danger" title="Hủy đặt phòng"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }
    },

    // Lưu tạm danh sách loại phòng để lấy giá
    cacheTypes: [],

    // =======================================================
    // --- NGHIỆP VỤ TẠO / SỬA PHIÊN THUÊ TRỰC TIẾP ---
    // =======================================================
    clickRent(roomId, roomNumber, rentType) {
        document.getElementById('rfBookingId').value = '';
        document.getElementById('rfRoomId').value = roomId;
        document.getElementById('rfTypeId').value = this.currentTypeId;
        document.getElementById('rfRentType').value = rentType;

        document.getElementById('rfRoomNumberDisplay').textContent = roomNumber;
        document.getElementById('rfRentTypeDisplay').textContent = rentType === 'HOURLY' ? 'Thuê Theo Giờ' : 'Thuê Theo Ngày';

        const typeObj = this.cacheTypes.find(t => t.id === this.currentTypeId);
        if (typeObj) {
            const price = rentType === 'HOURLY' ? typeObj.hourly_price : typeObj.daily_price;
            document.getElementById('rfPriceDisplay').textContent = Number(price).toLocaleString('vi-VN') + ' đ';
        }

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        
        // Mở khóa và set giờ Check In hiện tại
        document.getElementById('rfCheckIn')._flatpickr.set("clickOpens", true);
        document.getElementById('rfCheckIn')._flatpickr.setDate(now.toISOString().slice(0, 16));
        document.getElementById('rfCheckOut')._flatpickr.clear();

        document.getElementById('rfName').value = '';
        document.getElementById('rfPhone').value = '';
        document.getElementById('rfEmail').value = '';
        document.getElementById('rfCccdFrontFile').value = '';
        document.getElementById('rfCccdFrontPreview').src = '';
        document.getElementById('rfCccdBackFile').value = '';
        document.getElementById('rfCccdBackPreview').src = '';

        document.getElementById('rfCccdFrontFile').onchange = (e) => {
            if (e.target.files[0]) document.getElementById('rfCccdFrontPreview').src = URL.createObjectURL(e.target.files[0]);
        };
        document.getElementById('rfCccdBackFile').onchange = (e) => {
            if (e.target.files[0]) document.getElementById('rfCccdBackPreview').src = URL.createObjectURL(e.target.files[0]);
        };

        document.getElementById('btnSaveRent').onclick = () => this.submitRentForm();
        new bootstrap.Modal(document.getElementById('rentFormModal')).show();
    },

    async submitRentForm() {
        const isEdit = !!document.getElementById('rfBookingId').value;
        const btnSave = document.getElementById('btnSaveRent');

        if (!document.getElementById('rfName').value || !document.getElementById('rfPhone').value) {
            return showNotify('Vui lòng nhập Họ tên và SĐT!', 'warning');
        }
        if (!confirm('Xác nhận lưu thông tin phiên thuê?')) return;

        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang lưu...';

        try {
            // Hàm hỗ trợ upload ảnh
            const uploadImage = async (fileInput, previewImg) => {
                let url = previewImg.src.includes('/uploads/') ? new URL(previewImg.src).pathname : '';
                if (fileInput.files.length > 0) {
                    const fd = new FormData(); fd.append('cccd', fileInput.files[0]);
                    const res = await fetch('/api/upload/cccd', { method: 'POST', body: fd });
                    const data = await res.json();
                    if (res.ok) url = data.url;
                }
                return url;
            };

            // Upload cả 2 mặt CCCD
            const frontUrl = await uploadImage(document.getElementById('rfCccdFrontFile'), document.getElementById('rfCccdFrontPreview'));
            const backUrl = await uploadImage(document.getElementById('rfCccdBackFile'), document.getElementById('rfCccdBackPreview'));

            const payload = {
                room_detail_id: document.getElementById('rfRoomId').value,
                room_type_id: document.getElementById('rfTypeId').value,
                room_number: document.getElementById('rfRoomNumberDisplay').textContent,
                rent_type: document.getElementById('rfRentType').value,
                guest_name: document.getElementById('rfName').value,
                guest_phone: document.getElementById('rfPhone').value,
                guest_email: document.getElementById('rfEmail').value,
                cccd_front_url: frontUrl,
                cccd_back_url: backUrl,
                actual_checkin: document.getElementById('rfCheckIn').value,
                expected_checkout: document.getElementById('rfCheckOut').value || null
            };

            let res;
            if (isEdit) {
                payload.booking_id = document.getElementById('rfBookingId').value;
                res = await fetch(`/api/bookings/rent/${payload.booking_id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            } else {
                res = await fetch('/api/bookings/rent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            }

            const result = await res.json();
            if (res.ok) {
                showNotify('Thành công!');
                bootstrap.Modal.getInstance(document.getElementById('rentFormModal')).hide();
                this.loadRoomsByType();
                this.viewActiveSession(payload.room_detail_id, payload.room_number);
            } else { showNotify(result.error, 'error'); }

        } catch (err) { showNotify(err.message, 'error'); }
        finally { btnSave.disabled = false; btnSave.innerHTML = '<i class="fa-s olid fa-floppy-disk me-2"></i>Xác nhận Lưu'; }
    },

    async viewActiveSession(roomId, roomNumber) {

        this.currentRoomId = roomId;
        this.currentRoomNumber = roomNumber;
        document.getElementById('asRoomNumber').textContent = roomNumber;
        clearInterval(this.activeTimerInterval);

        try {
            // ==========================================
            // PHẦN 1: TẢI DỮ LIỆU PHIÊN THUÊ CHÍNH
            // ==========================================
            const res = await fetch(`/api/bookings/active/${roomId}`);
            const result = await res.json();
            if (!res.ok) return showNotify(result.error, 'error');

            const b = result.data;
            this.currentBookingData = b;

            // Đổ dữ liệu Khách hàng
            document.getElementById('asName').textContent = b.guest_name;
            document.getElementById('asPhone').textContent = b.guest_phone;
            document.getElementById('asEmail').textContent = b.guest_email || '---';

            // Format ngày giờ Check-In đẹp mắt
            const ci = new Date(b.actual_checkin);
            const timeStr = ci.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = ci.toLocaleDateString('vi-VN');
            document.getElementById('asCheckIn').textContent = `${timeStr} ngày ${dateStr}`;

            // THÊM MỚI: Format ngày giờ Check-Out dự kiến
            if (b.expected_checkout) {
                const co = new Date(b.expected_checkout);
                const coTimeStr = co.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const coDateStr = co.toLocaleDateString('vi-VN');
                document.getElementById('asCheckOut').textContent = `${coTimeStr} ngày ${coDateStr}`;
            } else {
                document.getElementById('asCheckOut').textContent = 'Chưa xác định';
            }

            // Đổ ảnh CCCD
            document.getElementById('asCccdFrontImg').src = b.cccd_front_url || '';
            document.getElementById('asCccdBackImg').src = b.cccd_back_url || '';

            // Thông tin loại thuê & Đơn giá
            document.getElementById('asRentType').textContent = b.rent_type === 'HOURLY' ? 'Thuê theo Giờ' : 'Thuê theo Ngày';
            const unitPrice = b.rent_type === 'HOURLY' ? b.hourly_price : b.daily_price;
            document.getElementById('asUnitPrice').textContent = Number(unitPrice).toLocaleString('vi-VN') + (b.rent_type === 'HOURLY' ? ' đ / giờ' : ' đ / ngày');

            // ==========================================
            // PHẦN 2: TẢI DANH SÁCH DỊCH VỤ & TÍNH TIỀN
            // ==========================================
            let currentServiceTotal = 0; // Biến lưu tổng tiền dịch vụ (Minibar, Giặt ủi...)

            try {
                // Gọi API lấy danh sách dịch vụ khách đã gọi (Bạn cần tạo API này ở Controller nhé)
                const svcRes = await fetch(`/api/bookings/${b.booking_id}/services`);
                if (svcRes.ok) {
                    const svcJson = await svcRes.json();
                    const services = svcJson.data || [];
                    const tbody = document.getElementById('asServiceList');

                    if (services.length === 0) {
                        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-muted py-3">Chưa sử dụng dịch vụ nào.</td></tr>';
                    } else {
                        // Render bảng danh sách dịch vụ
                        if (tbody) tbody.innerHTML = services.map(svc => {
                            const itemTotal = svc.quantity * svc.unit_price;
                            currentServiceTotal += itemTotal; // Cộng dồn tiền dịch vụ
                            return `
                            <tr>
                                <td class="text-start fw-bold text-secondary">${svc.item_name}</td>
                                <td>${svc.quantity}</td>
                                <td>${Number(svc.unit_price).toLocaleString('vi-VN')}</td>
                                <td class="text-end fw-bold text-dark">${itemTotal.toLocaleString('vi-VN')}</td>
                                <td>
                                    <button class="btn btn-sm text-danger border-0 p-1" onclick="BookingManager.removeService('${svc.id}', '${roomId}', '${roomNumber}')" title="Xóa món này"><i class="fa-solid fa-trash-can"></i></button>
                                </td>
                            </tr>`;
                        }).join('');
                    }
                    // Hiển thị Tổng tiền dịch vụ riêng biệt ở dưới bảng
                    if (document.getElementById('asTotalServices')) {
                        document.getElementById('asTotalServices').textContent = currentServiceTotal.toLocaleString('vi-VN') + ' đ';
                    }
                }
            } catch (err) { console.error('Lỗi tải danh sách dịch vụ', err); }

            // ==========================================
            // PHẦN 3: BẮT ĐẦU ĐẾM GIỜ & CỘNG GỘP TỔNG TIỀN
            // ==========================================
            const checkInTime = new Date(b.actual_checkin).getTime();

            this.activeTimerInterval = setInterval(() => {
                const now = new Date().getTime();
                const diffSecs = Math.floor((now - checkInTime) / 1000);
                if (diffSecs < 0) return;

                // 1. Cập nhật đồng hồ hiển thị (nhảy từng giây)
                const h = Math.floor(diffSecs / 3600).toString().padStart(2, '0');
                const m = Math.floor((diffSecs % 3600) / 60).toString().padStart(2, '0');
                const s = Math.floor(diffSecs % 60).toString().padStart(2, '0');
                document.getElementById('asTimer').textContent = `${h}:${m}:${s}`;

                // 2. Tính toán Tiền phòng riêng (nhảy từng phút)
                const totalMinutes = Math.floor(diffSecs / 60);
                let roomMoney = 0;

                if (b.rent_type === 'HOURLY') {
                    roomMoney = Math.round((totalMinutes / 60) * b.hourly_price);
                } else {
                    roomMoney = Math.round((totalMinutes / 1440) * b.daily_price);
                }

                // 3. CỘNG GỘP: Tiền phòng + Tiền dịch vụ
                const finalTotalMoney = roomMoney + currentServiceTotal;

                // 4. Hiển thị Tổng tiền thực trả ra góc đỏ
                document.getElementById('asTotalMoney').textContent = finalTotalMoney.toLocaleString('vi-VN') + ' đ';

            }, 1000);

            // Nạp dữ liệu vào Form thêm dịch vụ trực tiếp
            this.switchServiceTab('INVENTORY'); // Đặt mặc định là tab kho hàng
            await this.loadServiceCategories();

            // Hiển thị Modal lên màn hình
            // Dùng getOrCreateInstance để ngăn Bootstrap tạo ra nhiều lớp phủ đen đè lên nhau
            const activeModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('activeSessionModal'));
            activeModal.show();

            // Xóa bộ đếm giờ (để nhẹ máy) khi người dùng bấm dấu X tắt Modal
            document.getElementById('activeSessionModal').addEventListener('hidden.bs.modal', () => {
                clearInterval(this.activeTimerInterval);
            }, { once: true });

        } catch (e) {
            showNotify('Lỗi tải dữ liệu phiên thuê', 'error');
            console.error(e);
        }
    },

    editActiveSession() {
        const b = this.currentBookingData;
        bootstrap.Modal.getInstance(document.getElementById('activeSessionModal')).hide();

        document.getElementById('rfBookingId').value = b.booking_id;
        document.getElementById('rfRoomId').value = b.room_detail_id;
        document.getElementById('rfTypeId').value = b.room_type_id;
        document.getElementById('rfRentType').value = b.rent_type;

        document.getElementById('rfRoomNumberDisplay').textContent = document.getElementById('asRoomNumber').textContent;
        document.getElementById('rfRentTypeDisplay').textContent = b.rent_type === 'HOURLY' ? 'Thuê Theo Giờ' : 'Thuê Theo Ngày';

        const typeObj = this.cacheTypes.find(t => t.id === b.room_type_id);
        if (typeObj) {
            const price = b.rent_type === 'HOURLY' ? typeObj.hourly_price : typeObj.daily_price;
            document.getElementById('rfPriceDisplay').textContent = Number(price).toLocaleString('vi-VN') + ' đ';
        }

        document.getElementById('rfName').value = b.guest_name;
        document.getElementById('rfPhone').value = b.guest_phone;
        document.getElementById('rfEmail').value = b.guest_email || '';

        document.getElementById('rfCccdFrontPreview').src = b.cccd_front_url || '';
        document.getElementById('rfCccdBackPreview').src = b.cccd_back_url || '';
        document.getElementById('rfCccdFrontFile').value = '';
        document.getElementById('rfCccdBackFile').value = '';

        const tzIn = new Date(b.actual_checkin);
        tzIn.setMinutes(tzIn.getMinutes() - tzIn.getTimezoneOffset());
        
        // Khóa không cho sửa giờ Check-in nếu đã vào ở
        document.getElementById('rfCheckIn')._flatpickr.setDate(tzIn.toISOString().slice(0, 16));
        document.getElementById('rfCheckIn')._flatpickr.set("clickOpens", false);

        if (b.expected_checkout) {
            const tzOut = new Date(b.expected_checkout);
            tzOut.setMinutes(tzOut.getMinutes() - tzOut.getTimezoneOffset());
            document.getElementById('rfCheckOut')._flatpickr.setDate(tzOut.toISOString().slice(0, 16));
        } else {
            document.getElementById('rfCheckOut')._flatpickr.clear();
        }

        document.getElementById('btnSaveRent').onclick = () => this.submitRentForm();
        new bootstrap.Modal(document.getElementById('rentFormModal')).show();
    },

    // =======================================================
    // --- NGHIỆP VỤ THÊM / XÓA DỊCH VỤ PHÁT SINH ---
    // =======================================================
    currentServiceOptions: [], // Biến tạm lưu danh sách món để lấy giá
    currentServiceType: 'INVENTORY', // Mặc định là Tab Kho hàng

    // HÀM MỚI: Xử lý khi Lễ tân bấm chuyển Tab (VD: Tab Kho Hàng -> Tab Giặt ủi)
    switchServiceTab(type) {
        this.currentServiceType = type;

        // Đổi màu nút Tab
        document.querySelectorAll('.service-tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.service-tab-btn[data-type="${type}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // LUÔN HIỂN THỊ ô chọn Danh mục cho cả 2 Tab (Bỏ lệnh ẩn đi)
        const catContainer = document.getElementById('svcCategoryContainer');
        if (catContainer) {
            catContainer.style.display = 'block';
        }

        // Tải lại danh sách danh mục tương ứng với Tab, sau đó tải danh sách món
        this.loadServiceCategories().then(() => {
            this.loadServiceData();
        });
    },

    async openAddServiceModal() {
        // Mặc định mở lên là Tab Kho hàng
        this.currentServiceType = 'INVENTORY';
        document.getElementById('svcQty').value = 1;
        document.getElementById('svcPriceDisplay').value = '';
        document.getElementById('svcRawPrice').value = '';

        // Đóng/mở bộ lọc danh mục tùy theo Tab
        if (document.getElementById('svcCategoryContainer')) {
            document.getElementById('svcCategoryContainer').style.display = 'block';
        }

        // Reset màu nút Tab
        document.querySelectorAll('.service-tab-btn').forEach(btn => btn.classList.remove('active'));
        const defaultBtn = document.querySelector('.service-tab-btn[data-type="INVENTORY"]');
        if (defaultBtn) defaultBtn.classList.add('active');

        // BẮT SỰ KIỆN: KHI LỄ TÂN ĐỔI DANH MỤC -> TỰ ĐỘNG TẢI LẠI SẢN PHẨM
        const catSelect = document.getElementById('svcCategory');
        if (catSelect) {
            catSelect.onchange = () => this.loadServiceData();
        }

        // Hiện Modal lên
        new bootstrap.Modal(document.getElementById('addServiceModal')).show();

        // Tải dữ liệu ban đầu
        await this.loadServiceCategories();
        this.loadServiceData();
    },

    // Tải danh sách Danh mục tương ứng với Tab hiện tại
    async loadServiceCategories() {
        const catSelect = document.getElementById('svcCategory');
        if (!catSelect) return;

        if (this.currentServiceType === 'INVENTORY') {
            try {
                // TAB KHO HÀNG: Lấy danh mục từ Database
                const res = await fetch('/api/products/categories');
                if (res.ok) {
                    const json = await res.json();
                    const opts = json.data.map(c => `<option value="${c.category_id}">${c.name}</option>`).join('');
                    catSelect.innerHTML = '<option value="">-- Tất cả danh mục Kho --</option>' + opts;
                }
            } catch (e) { console.error('Lỗi tải danh mục:', e); }
        } else {
            // TAB DỊCH VỤ KHÁC: Hiển thị 2 loại dịch vụ cố định (Theo chuẩn Database của bạn)
            catSelect.innerHTML = `
                <option value="">-- Tất cả loại Dịch vụ --</option>
                <option value="FB">Đồ ăn & Thức uống</option>
                <option value="LAUNDRY">Giặt ủi</option>
            `;
        }
    },

    // Hàm gọi API lấy danh sách Sản phẩm trong Kho hoặc Dịch vụ chung
    async loadServiceData() {
        const itemSelect = document.getElementById('svcItem');
        itemSelect.innerHTML = '<option value="">Đang tải dữ liệu...</option>';
        document.getElementById('svcPriceDisplay').value = '';
        document.getElementById('svcRawPrice').value = '';
        this.currentServiceOptions = [];

        try {
            let url = '';
            // Lấy ID của danh mục đang được chọn ở ô Dropdown
            const catId = document.getElementById('svcCategory')?.value;

            if (this.currentServiceType === 'INVENTORY') {
                url = '/api/products/available';
                if (catId) url += `?category_id=${catId}`;
            } else {
                url = '/api/services';
                // THÊM ĐOẠN NÀY: Nếu có chọn loại Dịch vụ (FB hoặc LAUNDRY) thì nối vào link API
                if (catId) url += `?category=${catId}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                itemSelect.innerHTML = '<option value="">(Không kết nối được server)</option>';
                return;
            }

            const json = await res.json();
            const dataList = json.data || [];

            if (dataList.length === 0) {
                itemSelect.innerHTML = '<option value="">(Không có mặt hàng nào)</option>';
                return;
            }

            itemSelect.innerHTML = '<option value="">-- Chọn món / Dịch vụ --</option>' + dataList.map(item => {
                const id = item.product_id || item.service_id;
                const name = item.name;
                const price = item.retail_price || item.price || 0;

                const stock = item.total_quantity !== undefined ? item.total_quantity : null;
                const stockInfo = stock !== null ? ` (Tồn: ${stock})` : '';

                return `<option value="${id}" data-price="${price}" data-name="${name}">${name}${stockInfo}</option>`;
            }).join('');

        } catch (e) {
            itemSelect.innerHTML = '<option value="">Lỗi hệ thống</option>';
            console.error('Lỗi tải danh sách dịch vụ:', e);
        }
    },

    // Hàm tự động điền giá tiền khi chọn món
    changeServiceItem() {
        const itemSelect = document.getElementById('svcItem');
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];

        if (selectedOption && selectedOption.value) {
            const price = selectedOption.getAttribute('data-price');
            document.getElementById('svcPriceDisplay').value = Number(price).toLocaleString('vi-VN') + ' đ';
            document.getElementById('svcRawPrice').value = price;
        } else {
            document.getElementById('svcPriceDisplay').value = '';
            document.getElementById('svcRawPrice').value = '';
        }
    },

    // Hàm Gửi dữ liệu dịch vụ xuống Backend
    async submitAddService() {
        const itemSelect = document.getElementById('svcItem');
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];

        // Ngăn chặn việc gửi ID rỗng gây sập Server PostgreSQL (Kiểu UUID)
        if (!selectedOption || !selectedOption.value || selectedOption.value === "") {
            return showNotify('Vui lòng chọn một dịch vụ hoặc món hàng cụ thể!', 'warning');
        }

        const payload = {
            service_type: this.currentServiceType,
            item_id: selectedOption.value,
            item_name: selectedOption.getAttribute('data-name'),
            quantity: parseInt(document.getElementById('svcQty').value),
            unit_price: document.getElementById('svcRawPrice').value
        };

        if (payload.quantity <= 0 || isNaN(payload.quantity)) {
            return showNotify('Số lượng phải là một số lớn hơn 0', 'warning');
        }

        try {
            const res = await fetch(`/api/bookings/${this.currentBookingData.booking_id}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // BẮT LỖI AN TOÀN TRƯỚC KHI PARSE JSON 
            // (Đề phòng kho hàng hết số lượng hoặc backend sập)
            if (!res.ok && res.status >= 500) {
                return showNotify('Lỗi Server: Vui lòng kiểm tra lại Tồn Kho!', 'error');
            }

            const result = await res.json();

            if (res.ok) {
                showNotify('Đã thêm dịch vụ vào hóa đơn!');

                // Reset lại ô nhập liệu sau khi thêm xong cho tiện
                document.getElementById('svcItem').value = '';
                document.getElementById('svcQty').value = 1;
                document.getElementById('svcPriceDisplay').value = '';
                document.getElementById('svcRawPrice').value = '';

                this.viewActiveSession(this.currentRoomId, this.currentRoomNumber);
            } else {
                showNotify(result.error || 'Lỗi khi thêm dịch vụ', 'error');
            }
        } catch (e) {
            showNotify('Lỗi kết nối máy chủ', 'error');
            console.error(e);
        }
    },

    // Hàm Xóa dịch vụ (gọi lại API xóa để tự động trả hàng về kho)
    async removeService(serviceId) {
        if (!confirm('Xác nhận xóa món này khỏi hóa đơn? Số lượng sẽ được tự động hoàn lại vào Kho.')) return;
        try {
            const res = await fetch(`/api/bookings/services/${serviceId}`, { method: 'DELETE' });
            if (res.ok) {
                showNotify('Đã xóa dịch vụ!');
                this.viewActiveSession(this.currentRoomId, this.currentRoomNumber);
            } else {
                const result = await res.json();
                showNotify(result.error || 'Lỗi xóa dịch vụ', 'error');
            }
        } catch (e) { showNotify('Lỗi kết nối máy chủ', 'error'); }
    },


    // =======================================================
    // --- NGHIỆP VỤ THANH TOÁN (CHECKOUT 2 CỘT) ---
    // =======================================================
    async openCheckoutModal() {
        // 1. Tắt Modal phiên thuê hiện tại (Dùng getOrCreateInstance để tránh lỗi null)
        const activeModalEl = document.getElementById('activeSessionModal');
        if (activeModalEl) {
            bootstrap.Modal.getOrCreateInstance(activeModalEl).hide();
        }
        
        const b = this.currentBookingData;
        const now = new Date();
        
    // 2. TẢI THÔNG TIN CƠ SỞ KINH DOANH TỪ BẢNG system_settings
        try {
            // ĐÃ SỬA: Thêm '/data' vào cuối đường dẫn API
            const resAcc = await fetch('/api/account-setting/data'); 
            
            if (resAcc.ok) {
                const responseData = await resAcc.json();
                
                // ĐÃ SỬA: Lấy dữ liệu từ .system (vì controller trả về res.json({ profile, system }))
                const sys = responseData.system; 
                
                if (sys) {
                    // Xử lý Logo
                    const logoEl = document.getElementById('coLogo');
                    const logoText = document.getElementById('coLogoText');
                    if (sys.logo_url && sys.logo_url.trim() !== '') {
                        logoEl.src = sys.logo_url;
                        logoEl.style.display = 'block';
                        logoText.style.display = 'none';
                    } else {
                        logoEl.style.display = 'none';
                        logoText.style.display = 'block';
                    }

                    // Đổ thông tin Cơ sở
                    document.getElementById('coBusinessName').textContent = sys.business_name || 'CHƯA CẬP NHẬT TÊN';
                    document.getElementById('coTaxCode').textContent = sys.tax_code || '---';
                    document.getElementById('coAddress').textContent = sys.business_address || '---';
                    document.getElementById('coPhone').textContent = sys.hotline || '---';
                    document.getElementById('coEmail').textContent = sys.email_contact || '---';
                }
            } else {
                console.warn('API Account Setting trả về lỗi:', resAcc.status);
            }
        } catch (e) { 
            console.error('Lỗi fetch dữ liệu cơ sở:', e); 
        }

        // 3. ĐỔ DỮ LIỆU CỘT TRÁI (Lấy từ Modal Phiên thuê)
        document.getElementById('coModalRoomNumber').textContent = document.getElementById('asRoomNumber').textContent;
        document.getElementById('coGuestName').textContent = b.guest_name;
        document.getElementById('coGuestPhone').textContent = b.guest_phone;
        document.getElementById('coGuestEmail').textContent = b.guest_email || '---';

        const ci = new Date(b.actual_checkin);
        document.getElementById('coCheckIn').textContent = `${ci.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ngày ${ci.toLocaleDateString('vi-VN')}`;
        document.getElementById('coCheckOut').textContent = b.expected_checkout ? 
            new Date(b.expected_checkout).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'numeric', year:'numeric'}) : 'Chưa xác định';

        document.getElementById('coTimeLabel').textContent = document.getElementById('asTimer').textContent;
        document.getElementById('coRentType').textContent = b.rent_type === 'HOURLY' ? 'Thuê theo Giờ' : 'Thuê theo Ngày';
        document.getElementById('coUnitPrice').textContent = document.getElementById('asUnitPrice').textContent;

        // 4. TÍNH TIỀN PHÒNG & TIỀN DỊCH VỤ
        const diffSecs = Math.floor((now.getTime() - ci.getTime()) / 1000);
        const totalMinutes = Math.floor(diffSecs / 60);
        let roomMoney = 0;
        if (b.rent_type === 'HOURLY') {
            roomMoney = Math.round((totalMinutes / 60) * b.hourly_price);
        } else {
            roomMoney = Math.round((totalMinutes / 1440) * b.daily_price);
        }

        let serviceTotal = 0;
        let htmlServices = '';
        const svcRows = document.querySelectorAll('#asServiceList tr');
        svcRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4 && !cells[0].textContent.includes('Chưa sử dụng')) {
                const name = cells[0].textContent;
                const qty = cells[1].textContent;
                const priceText = cells[2].textContent;
                const totalText = cells[3].textContent;
                serviceTotal += parseInt(totalText.replace(/[^0-9]/g, ''));
                htmlServices += `
                    <tr>
                        <td class="ps-3">${name}</td>
                        <td class="text-center">${qty}</td>
                        <td class="text-end">${priceText}</td>
                        <td class="text-end pe-3 text-danger fw-bold">${totalText}</td>
                    </tr>
                `;
            }
        });

        if (htmlServices === '') {
            htmlServices = '<tr><td colspan="4" class="text-center text-muted py-2">Không có dịch vụ</td></tr>';
        }
        document.getElementById('coServiceList').innerHTML = htmlServices;

        // 5. HIỂN THỊ CON SỐ SANG GIAO DIỆN
        const formatMoney = (val) => val.toLocaleString('vi-VN');
        
        document.getElementById('coRoomMoneyLeft').textContent = formatMoney(roomMoney);
        document.getElementById('coRoomMoneyRight').textContent = formatMoney(roomMoney) + ' đ';
        
        document.getElementById('coServiceMoneyLeft').textContent = formatMoney(serviceTotal) + ' đ';
        document.getElementById('coServiceMoneyRight').textContent = formatMoney(serviceTotal) + ' đ';

        // Đổ dữ liệu Cột phải (Hóa đơn)
        document.getElementById('coInvoiceNo').textContent = b.booking_code || 'Chưa có mã';
        document.getElementById('coCheckoutDate').textContent = now.toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'numeric', year:'numeric'});

        // Tổng cộng
        const grandTotal = roomMoney + serviceTotal;
        document.getElementById('coGrandTotal').textContent = formatMoney(grandTotal) + ' đ';

        // LƯU DỮ LIỆU ĐỂ HÀM XÁC NHẬN GỌI API (Thêm 2 dòng này)
        this.checkoutData.roomMoney = roomMoney;
        this.checkoutData.serviceTotal = serviceTotal;
        this.checkoutData.finalTotal = grandTotal;

        // Lưu tạm Tổng tiền để hàm Xác nhận gọi API
        this.checkoutData.finalTotal = grandTotal;

        // 6. HIỂN THỊ MODAL LÊN MÀN HÌNH
        // Dùng getOrCreateInstance để đảm bảo Modal luôn được tạo và show ra
        const checkoutModalEl = document.getElementById('checkoutModal');
        if (checkoutModalEl) {
            bootstrap.Modal.getOrCreateInstance(checkoutModalEl).show();
        } else {
            console.error("Không tìm thấy thẻ HTML có id='checkoutModal'. Bạn hãy kiểm tra lại file HTML nhé!");
        }
    },

// 1. Hàm mở Form hỏi xác nhận (Thay vì dùng confirm mặc định)
    confirmCheckout() {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        const payText = paymentMethod === 'CASH' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN';
        
        // Cập nhật dòng chữ hiển thị phương thức thanh toán vào Modal hỏi
        document.getElementById('confirmPayMethodText').textContent = payText;
        
        // Hiển thị Modal hỏi xác nhận lên
        bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmCheckoutModal')).show();
    },

    // 2. Hàm THỰC THI gọi API xuống Backend (Chạy khi bấm "Đồng ý" trên Modal xác nhận)
    async executeCheckout() {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        const btnSave = document.getElementById('btnExecuteCheckout'); // Nút "Đồng ý"
        const mainBtn = document.querySelector('#checkoutModal .btn-success'); // Nút "Xác nhận" ở hóa đơn
        
        // Khóa nút để tránh bấm 2 lần
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Đang xử lý...';
        mainBtn.disabled = true; 

        try {
            const payload = {
                payment_method: paymentMethod,
                final_amount: this.checkoutData.finalTotal,
                room_money: this.checkoutData.roomMoney,
                service_money: this.checkoutData.serviceTotal
            };

            const res = await fetch(`/api/bookings/checkout/${this.currentBookingData.booking_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (res.ok) {
                // Tắt CẢ 2 Modal (Modal Hỏi xác nhận và Modal Hóa đơn)
                bootstrap.Modal.getInstance(document.getElementById('confirmCheckoutModal')).hide();
                bootstrap.Modal.getInstance(document.getElementById('checkoutModal')).hide();
                
                this.loadRoomsByType(); // Tải lại lưới phòng (phòng sẽ chuyển màu dọn dẹp)
                
                // HIỂN THỊ THÀNH CÔNG BẰNG MODAL ĐẸP
                this.showStatusModal(true, 'Thanh toán thành công!', `Phòng đã chuyển sang trạng thái dọn dẹp.<br>Mã hóa đơn: <b class="text-primary">${result.data.id}</b>`);
            } else {
                // Tắt Modal Hỏi xác nhận, giữ lại Modal Hóa đơn
                bootstrap.Modal.getInstance(document.getElementById('confirmCheckoutModal')).hide();
                this.showStatusModal(false, 'Thanh toán thất bại!', result.error || 'Có lỗi xảy ra, vui lòng thử lại.');
            }
        } catch (err) {
            console.error(err);
            bootstrap.Modal.getInstance(document.getElementById('confirmCheckoutModal')).hide();
            this.showStatusModal(false, 'Lỗi kết nối!', 'Không thể kết nối đến máy chủ.');
        } finally {
            // Mở khóa lại nút nếu bị lỗi
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fa-solid fa-check me-1"></i> Đồng ý';
            mainBtn.disabled = false;
        }
    },

    // Hàm hiển thị Modal Thành công / Thất bại đẹp mắt
    showStatusModal(isSuccess, title, message) {
        const modalEl = document.getElementById('checkoutStatusModal');
        // Set Icon
        document.getElementById('csmIcon').innerHTML = isSuccess ? 
            '<i class="fa-solid fa-circle-check text-success drop-shadow" style="font-size: 5rem;"></i>' : 
            '<i class="fa-solid fa-circle-xmark text-danger drop-shadow" style="font-size: 5rem;"></i>';
        
        // Set text
        document.getElementById('csmTitle').textContent = title;
        document.getElementById('csmTitle').className = `fw-bold mb-2 ${isSuccess ? 'text-success' : 'text-danger'}`;
        document.getElementById('csmMessage').innerHTML = message;
        
        // Set Nút
        const btn = document.getElementById('csmBtn');
        btn.className = `btn ${isSuccess ? 'btn-success' : 'btn-danger'} px-4 py-2 fw-bold shadow-sm rounded-pill w-100`;

        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    },

    // Hàm hiển thị mã QR VietQR tự động
    async showVietQr() {
        try {
            // 1. Lấy thông tin ngân hàng từ hệ thống (Bảng system_settings)
            const resAcc = await fetch('/api/account-setting/data');
            if (!resAcc.ok) throw new Error("Không lấy được thông tin ngân hàng");
            
            const responseData = await resAcc.json();
            const sys = responseData.system;

            if (!sys || !sys.bank_account_number || !sys.bank_name) {
                return showNotify('Vui lòng vào Cài đặt hệ thống để cập nhật thông tin Ngân hàng trước!', 'warning');
            }

            // 2. Chuẩn bị dữ liệu VietQR
            // Link chuẩn: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png
            const bankId = sys.bank_name; // VD: vcb, mbb, tcb...
            const accountNo = sys.bank_account_number;
            const template = 'compact'; // Kiểu hiển thị gọn đẹp
            const amount = this.checkoutData.finalTotal;
            const description = encodeURIComponent(`Thanh toan phong ${this.currentRoomNumber} ${this.currentBookingData.booking_code}`);
            const accountName = encodeURIComponent(sys.bank_account_name || '');

            const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${description}&accountName=${accountName}`;

            // 3. Đổ dữ liệu vào Modal
            const qrImg = document.getElementById('vietQrImg');
            qrImg.src = qrUrl;
            
            document.getElementById('qrBankInfo').textContent = sys.bank_name.toUpperCase();
            document.getElementById('qrAccountInfo').innerHTML = `${sys.bank_account_number} <br> ${sys.bank_account_name}`;

            // 4. Hiển thị Modal QR
            bootstrap.Modal.getOrCreateInstance(document.getElementById('vietQrModal')).show();

        } catch (error) {
            console.error(error);
            showNotify('Không thể tạo mã QR lúc này!', 'error');
        }
    },
};
window.BookingManager = BookingManager;