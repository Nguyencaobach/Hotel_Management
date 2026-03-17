
UPDATE users 
SET 
    full_name = 'Nguyen Huu Tinh',
    username = 'huutinhyeuUMT',
    password = 'ucac'
WHERE username = 'huutinh';

INSERT INTO users (username, password, role, full_name, email) VALUES
('thaikhang', '12345678', 'STAFF', 'Cao Thái Khang', 'thanh@hotel.com'),
('staff_ho', 'hash456', 'STAFF', 'Lê Thị Hoa', 'hoa@hotel.com'),

INSERT INTO customers (username, password, full_name, date_of_birth, address, phone_number, email) VALUES
('khachhang01', '123456', 'Nguyễn Văn An', '1995-05-12', '123 Lê Lợi, Quận 1, TP.HCM', '0901234567', 'nguyenvanan@gmail.com'),
('khachhang02', '123456', 'Trần Thị Bích', '1988-10-22', '456 Nguyễn Trãi, Quận 5, TP.HCM', '0987654321', 'tranbich88@gmail.com'),
('khachhang03', '123456', 'Lê Hoàng Phong', '2000-01-15', '789 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM', '0912345678', 'hoangphong2k@gmail.com'),
('khachhang04', '123456', 'Phạm Mai Lan', '1992-07-08', '321 Võ Văn Ngân, TP. Thủ Đức, TP.HCM', '0933445566', 'mailan_pham@gmail.com'),
('khachhang05', '123456', 'Vũ Đức Mạnh', '1985-11-30', '654 Quang Trung, Quận Gò Vấp, TP.HCM', '0977889900', 'ducmanh85@gmail.com');

SELECT * FROM bill_pa

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('MANAGER', 'STAFF')),
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users 
ADD COLUMN phone_number VARCHAR(20) UNIQUE,
ADD COLUMN date_of_birth DATE,
ADD COLUMN cccd_number VARCHAR(20) UNIQUE,    -- Số CCCD
ADD COLUMN cccd_issue_date DATE,              -- Ngày cấp
ADD COLUMN cccd_issue_place VARCHAR(255),     -- Nơi cấp
ADD COLUMN permanent_address TEXT,            -- Địa chỉ thường trú
ADD COLUMN gender VARCHAR(10) CHECK (gender IN ('NAM', 'NU', 'KHAC')); -- NÊN THÊM: Để xuất văn bản ghi "Ông/Bà" cho chuẩn


-- 1. Xóa bảng cũ (nếu có) để làm mới hoàn toàn
DROP TABLE IF EXISTS system_settings;

-- 2. Tạo lại bảng với đầy đủ tất cả các cột
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    business_type VARCHAR(50),
    business_name VARCHAR(255),
    tax_code VARCHAR(20),
    business_address TEXT,
    legal_representative VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account_name VARCHAR(100),
    hotline VARCHAR(20),
    email_contact VARCHAR(100),
    logo_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tạo sẵn 1 dòng dữ liệu mặc định để hệ thống luôn có data để Update
INSERT INTO system_settings (business_name, business_type) 
VALUES ('Hệ thống mặc định', 'Hộ kinh doanh');



CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hourly_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    daily_price DECIMAL(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE room_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE',	
    floor INT,
    notes TEXT,
    
    -- Tạo khoá ngoại liên kết với bảng room_types
    CONSTRAINT fk_room_type 
        FOREIGN KEY (room_type_id) 
        REFERENCES room_types(id) 
        ON DELETE RESTRICT,
        
    -- Đảm bảo không có 2 phòng nào bị trùng số phòng với nhau
    CONSTRAINT unique_room_number UNIQUE (room_number)
);

ALTER TABLE room_details 
ADD COLUMN capacity INT DEFAULT 2,              -- Số người tối đa
ADD COLUMN bed_type VARCHAR(100),               -- Loại giường
ADD COLUMN room_size INT,                       -- Diện tích (m2)
ADD COLUMN view_type VARCHAR(100),              -- Hướng nhìn (View)
ADD COLUMN amenities JSON DEFAULT '[]',         -- Tiện ích (Wifi, TV...)
ADD COLUMN room_img_url TEXT;                   -- Link ảnh đại diện (Chỉ 1 ảnh)

-- Bước 1: Xóa luật "Độc quyền tên phòng trên toàn bộ hệ thống" cũ đi
-- (Tùy vào lúc tạo bảng bạn đặt tên là gì, chạy cả 2 dòng DROP này cho chắc ăn)
ALTER TABLE room_details DROP CONSTRAINT IF EXISTS unique_room_number;
ALTER TABLE room_details DROP CONSTRAINT IF EXISTS room_details_room_number_key;

-- Bước 2: Thêm luật mới "Độc quyền tên phòng THEO TỪNG LOẠI PHÒNG"
ALTER TABLE room_details ADD CONSTRAINT unique_room_per_type UNIQUE (room_type_id, room_number);

CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    address TEXT,
    phone_number VARCHAR(20) UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE customers ADD COLUMN email VARCHAR(100) UNIQUE;


CREATE TABLE product_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- VD: Nước giải khát, Đồ ăn vặt, Đồ dùng cá nhân...
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- bảng products (Thông tin gốc của sản phẩm)
CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES product_categories(category_id) ON DELETE SET NULL,
    
    sku VARCHAR(50) NOT NULL UNIQUE, -- Mã vạch chung của sản phẩm (VD: 8935001234567)
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,       -- Đơn vị: Lon, Chai, Thùng...
    retail_price INT DEFAULT 0,      -- Giá bán ra cho khách
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng product_batches (Chi tiết từng đợt nhập hàng - Giống RoomDetail)
CREATE TABLE product_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
    
    batch_code VARCHAR(50),      -- Mã lô hàng (VD: LOHANG-01, có thể để trống nếu tự quản lý)
    quantity INT DEFAULT 0 CHECK (quantity >= 0), -- Số lượng của đợt nhập này
    import_price INT DEFAULT 0,  -- Giá nhập của đợt này
    
    mfg_date DATE,               -- Ngày sản xuất
    exp_date DATE,               -- Hạn sử dụng
    import_date DATE DEFAULT CURRENT_DATE, -- Ngày nhập kho
    supplier VARCHAR(255),       -- Nhà cung cấp của đợt hàng này
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE product_batches 
ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';
-- 'ACTIVE' = Có hiệu lực, 'LOCKED' = Đã khóa

----1. Chức năng dịch vụ đi kèm ---
CREATE TABLE services (
    service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Phân loại: 'LAUNDRY' (Giặt ủi) hoặc 'FB' (Food & Beverage - Đồ ăn thức uống)
    category VARCHAR(50) NOT NULL, 
    
    -- Tên dịch vụ (VD: Giặt sấy, Mì xào bò, Coca Cola...)
    name VARCHAR(255) NOT NULL,
    
    -- Đơn vị tính (VD: kg, phần, lon, dĩa...)
    unit VARCHAR(50) NOT NULL,
    
    -- Giá tiền niêm yết
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Mô tả thêm (nếu cần)
    description TEXT,
    
    -- Trạng thái kinh doanh
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tạo Index để tìm kiếm nhanh theo tên và loại
CREATE INDEX idx_services_name ON services(name);
CREATE INDEX idx_services_category ON services(category);



---Mã giảm giá ---
CREATE TABLE discount_codes (
    discount_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code VARCHAR(50) NOT NULL UNIQUE,      -- Mã khách nhập (VD: GIAM50K, TET2026)
    description TEXT,                      -- Mô tả (VD: Giảm 50k cho hóa đơn từ 200k)
    
    -- GIÁ TRỊ GIẢM GIÁ (Chỉ trừ tiền mặt)
    discount_amount INT NOT NULL,          -- Số tiền trừ thẳng vào tổng hóa đơn (VD: 50000)
    
    -- ĐIỀU KIỆN ÁP DỤNG
    min_order_value INT DEFAULT 0,         -- Đơn hàng tối thiểu mới được áp dụng (VD: 200000)
    
    -- GIỚI HẠN SỬ DỤNG
    usage_limit INT,                       -- Tổng số lượng mã phát hành (VD: 100 mã), khi sử dụng 1 mã so sánh used_count với limit cho tới khi hai biến bằng nhau thì kết thúc chương trình mã giảm giá này
    used_count INT DEFAULT 0,              -- Số lần khách đã xài thành công
    
    -- THỜI GIAN HIỆU LỰC
    start_date TIMESTAMP NOT NULL,         -- Ngày bắt đầu
    end_date TIMESTAMP NOT NULL,           -- Ngày kết thúc
    
    is_active BOOLEAN DEFAULT TRUE,        -- Trạng thái: TRUE (Đang mở), FALSE (Đã khóa)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--- Ghi log hoạt động ---
CREATE TABLE activity_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ai làm? (Lưu cả ID và Tên để lỡ nhân viên nghỉ việc bị xóa tài khoản thì vẫn còn tên trong Log)
    user_id UUID, 
    username VARCHAR(255), 
    
    -- Làm hành động gì? (Tạo mới: CREATE, Cập nhật: UPDATE, Xóa: DELETE)
    action VARCHAR(50) NOT NULL,
    
    -- Ở chức năng nào? (VD: KHUYEN_MAI, PHONG, KHO_HANG...)
    entity_type VARCHAR(100),
    
    -- Tác động lên cái gì? (Lưu Tên hoặc Mã của món đồ bị tác động)
    entity_name VARCHAR(255),
    
    -- Chi tiết cụ thể (VD: "Đã đổi giá từ 50k thành 100k")
    details TEXT,
    
    -- Lúc mấy giờ? (Luôn sắp xếp giảm dần theo cột này)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tạo Index để load dữ liệu siêu nhanh vì bảng này sẽ rất nhiều dòng
CREATE INDEX idx_logs_created_at ON activity_logs(created_at DESC);

-- Bảng Phiên thuê phòng --
DROP TABLE IF EXISTS bookings;

CREATE TABLE bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID REFERENCES room_types(id) ON DELETE RESTRICT,
    room_detail_id UUID REFERENCES room_details(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
    
    -- Loại hình thuê (HOURLY / DAILY)
    rent_type VARCHAR(20) CHECK (rent_type IN ('HOURLY', 'DAILY')),
    
    -- Trạng thái: RESERVED (Đặt trước), RENTED (Đang thuê), COMPLETED (Đã trả), CANCELLED (Hủy)
    booking_status VARCHAR(50) DEFAULT 'RENTED', 
    
    -- Đánh dấu phòng CÓ ĐANG CÓ NGƯỜI BÊN TRONG HAY KHÔNG (True/False)
    is_currently_rented BOOLEAN DEFAULT false,
    
    -- ==========================================
    -- NHÓM 1: DÀNH CHO ĐẶT PHÒNG TRƯỚC (DỰ KIẾN)
    -- ==========================================
    -- Ghi nhận chính xác Ngày-Giờ-Phút-Giây khách dự kiến đến và đi
    expected_checkin TIMESTAMP NOT NULL, 
    expected_checkout TIMESTAMP NOT NULL,
    
    -- ==========================================
    -- NHÓM 2: DÀNH CHO BỘ ĐẾM THỰC TẾ LÚC THUÊ
    -- ==========================================
    -- Thời gian Lễ tân bấm nút "Nhận phòng" (Bắt đầu đếm giờ)
    actual_checkin TIMESTAMP,             
    -- Thời gian Lễ tân bấm nút "Trả phòng" (Kết thúc đếm giờ)
    actual_checkout TIMESTAMP,            
    -- Bộ đếm tổng số phút thực tế khách đã ở (Dùng để nhân với giá tiền chính xác nhất)
    actual_duration_minutes INT DEFAULT 0, 
    
    -- ==========================================
    -- NHÓM 3: TIỀN BẠC & LƯU VẾT
    -- ==========================================
    total_amount INT DEFAULT 0,           -- Tổng tiền khách phải trả lúc Check-out
    
    -- Ghi nhận thời điểm Lễ tân tạo đơn (Tính đến từng giây để biết ai đặt trước, ai đặt sau)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Thêm cột lưu ảnh CCCD mặt trước và mặt sau vào bảng bookings
ALTER TABLE bookings 
ADD COLUMN cccd_front_url TEXT,
ADD COLUMN cccd_back_url TEXT;

ALTER TABLE bookings 
ADD COLUMN booking_code VARCHAR(50) UNIQUE, -- Mã SKU (VD: BKG-987654) để tạo QR
ADD COLUMN guest_name VARCHAR(100),         -- Tên khách hàng đặt trước
ADD COLUMN guest_phone VARCHAR(20),         -- Số điện thoại
ADD COLUMN guest_email VARCHAR(100);        -- Email khách hàng
-- Cho phép cột expected_checkout được phép bỏ trống (NULL)
ALTER TABLE bookings ALTER COLUMN expected_checkout DROP NOT NULL;

-- 1. Xóa bảng cũ bị sai kiểu dữ liệu (nếu có)
DROP TABLE IF EXISTS booking_services;

-- 2. Tạo lại bảng mới với item_id là UUID chuẩn
CREATE TABLE booking_services (
    id SERIAL PRIMARY KEY,
    booking_id UUID REFERENCES bookings(booking_id) ON DELETE CASCADE, 
    service_type VARCHAR(20),  -- 'INVENTORY' (Kho hàng) hoặc 'GENERAL' (Dịch vụ chung)
    
    item_id UUID,              -- ĐÃ SỬA THÀNH UUID (Khớp với product_id và service_id)
    
    item_name VARCHAR(255),    -- Lưu lại tên để lỡ sau này có xóa món trong kho thì bill vẫn còn tên
    quantity INT DEFAULT 1,
    unit_price DECIMAL(12,2),  -- Giá tại thời điểm gọi món
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng bill --
CREATE TABLE bill_payments (
    id VARCHAR(50) PRIMARY KEY, -- ID tự random (VD: BILL-123456)
    booking_code VARCHAR(50) NOT NULL,
    room_number VARCHAR(20),
    guest_name VARCHAR(100),
    guest_phone VARCHAR(20),
    guest_email VARCHAR(100),
    rent_type VARCHAR(20),
    actual_checkin TIMESTAMP,
    actual_checkout TIMESTAMP,
    room_price NUMERIC DEFAULT 0,
    service_price NUMERIC DEFAULT 0,
    final_amount NUMERIC NOT NULL,
    payment_method VARCHAR(50), -- CASH hoặc BANK_TRANSFER
    services_detail JSONB, -- Lưu toàn bộ dữ liệu từ bảng booking_services
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);