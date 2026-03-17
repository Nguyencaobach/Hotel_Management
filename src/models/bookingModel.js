import pool from '../config/db.js';

// 1. Kiểm tra trùng lịch (Overlapping)
export const checkOverlap = async (roomId, checkIn, checkOut, excludeBookingId = null) => {
    // Nếu checkOut là null, hệ thống tạm hiểu là đặt vô thời hạn, chỉ kiểm tra các phiên có trước đó
    let query = `
        SELECT booking_id FROM bookings 
        WHERE room_detail_id = $1 AND booking_status IN ('RESERVED', 'RENTED')
        AND ($2::timestamp IS NULL OR expected_checkin < $2) 
        AND (expected_checkout IS NULL OR expected_checkout > $3)
    `;
    let params = [roomId, checkOut || null, checkIn];
    if (excludeBookingId) {
        query += ` AND booking_id != $4`;
        params.push(excludeBookingId);
    }
    const res = await pool.query(query, params);
    return res.rows.length > 0;
};

// 2. Tạo phiên thuê MỚI
export const createRentSession = async (data) => {
    const { room_type_id, room_detail_id, rent_type, guest_name, guest_phone, guest_email, cccd_front_url, cccd_back_url, actual_checkin, expected_checkout } = data;
    const newStatus = rent_type === 'HOURLY' ? 'HOURLY_RENTED' : 'DAILY_RENTED';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const booking_code = 'BKG-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);

        const insertQuery = `
            INSERT INTO bookings (booking_code, room_type_id, room_detail_id, rent_type, booking_status, is_currently_rented, 
                                guest_name, guest_phone, guest_email, cccd_front_url, cccd_back_url, actual_checkin, expected_checkin, expected_checkout)
            VALUES ($1, $2, $3, $4, 'RENTED', true, $5, $6, $7, $8, $9, $10, $10, $11) RETURNING *
        `;
        const bookingResult = await client.query(insertQuery, [
            booking_code, room_type_id, room_detail_id, rent_type, guest_name, guest_phone, guest_email, cccd_front_url, cccd_back_url, actual_checkin, expected_checkout || null
        ]);

        await client.query(`UPDATE room_details SET status = $1 WHERE id = $2`, [newStatus, room_detail_id]);
        await client.query('COMMIT');
        return bookingResult.rows[0];
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};

// 3. Lấy thông tin phiên thuê đang Active
export const getActiveBooking = async (room_detail_id) => {
    const query = `
        SELECT b.*, t.hourly_price, t.daily_price 
        FROM bookings b 
        JOIN room_types t ON b.room_type_id = t.id
        WHERE b.room_detail_id = $1 AND b.booking_status = 'RENTED' LIMIT 1
    `;
    const res = await pool.query(query, [room_detail_id]);
    return res.rows[0];
};

// 4. Cập nhật phiên thuê (Chỉnh sửa)
export const updateRentSession = async (booking_id, data) => {
    const { guest_name, guest_phone, guest_email, cccd_front_url, cccd_back_url, expected_checkout } = data;
    const query = `
        UPDATE bookings SET 
            guest_name = $1, guest_phone = $2, guest_email = $3, 
            cccd_front_url = $4, cccd_back_url = $5, expected_checkout = $6, updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $7 RETURNING *
    `;
    const res = await pool.query(query, [guest_name, guest_phone, guest_email, cccd_front_url, cccd_back_url, expected_checkout || null, booking_id]);
    return res.rows[0];
};

// --- BỔ SUNG VÀO src/models/bookingModel.js ---

// 1. Lấy danh sách Đặt trước (RESERVED) của 1 phòng cụ thể
export const getReservationsByRoom = async (roomId) => {
    const query = `
        SELECT * FROM bookings 
        WHERE room_detail_id = $1 AND booking_status = 'RESERVED'
        ORDER BY expected_checkin ASC
    `;
    const res = await pool.query(query, [roomId]);
    return res.rows;
};

// 2. Tạo phiên Đặt trước (Sinh mã SKU)
// Thay thế hàm createReservation trong src/models/bookingModel.js
export const createReservation = async (data) => {
    const { room_type_id, room_detail_id, guest_name, guest_phone, guest_email, expected_checkin, expected_checkout } = data;
    const booking_code = 'BKG-' + Date.now().toString().slice(-4) + Math.floor(Math.random() * 1000);

    // Thêm 'HOURLY' vào câu lệnh SQL để Database không bị lỗi
    const query = `
        INSERT INTO bookings (booking_code, room_type_id, room_detail_id, rent_type, booking_status, is_currently_rented, 
                            guest_name, guest_phone, guest_email, expected_checkin, expected_checkout)
        VALUES ($1, $2, $3, 'HOURLY', 'RESERVED', false, $4, $5, $6, $7, $8) RETURNING *
    `;
    const res = await pool.query(query, [booking_code, room_type_id, room_detail_id, guest_name, guest_phone, guest_email, expected_checkin, expected_checkout]);
    return res.rows[0];
};

// 3. Chỉnh sửa / Dời lịch Đặt trước
export const updateReservation = async (booking_id, data) => {
    const { guest_name, guest_phone, guest_email, expected_checkin, expected_checkout } = data;
    const query = `
        UPDATE bookings SET 
            guest_name = $1, guest_phone = $2, guest_email = $3, 
            expected_checkin = $4, expected_checkout = $5, updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $6 RETURNING *
    `;
    const res = await pool.query(query, [guest_name, guest_phone, guest_email, expected_checkin, expected_checkout, booking_id]);
    return res.rows[0];
};

// 4. Hủy phiên Đặt trước
export const cancelReservation = async (booking_id) => {
    const query = `UPDATE bookings SET booking_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE booking_id = $1 RETURNING *`;
    const res = await pool.query(query, [booking_id]);
    return res.rows[0];
};

// =======================================================
// --- QUẢN LÝ DỊCH VỤ PHÁT SINH (BOOKING SERVICES) ---
// =======================================================

// 1. Lấy danh sách dịch vụ đã gọi của 1 phiên thuê
export const getBookingServices = async (booking_id) => {
    const query = `SELECT * FROM booking_services WHERE booking_id = $1 ORDER BY created_at ASC`;
    const res = await pool.query(query, [booking_id]);
    return res.rows;
};

// 2. Thêm dịch vụ & Tự động trừ tồn kho FIFO
export const addBookingService = async (booking_id, service_type, item_id, item_name, quantity, unit_price) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (service_type === 'INVENTORY') {
            let remainingQty = parseInt(quantity);

            // Dùng batch_id ĐÚNG với cấu trúc SQL của bạn
            const batchQuery = `
                SELECT batch_id, quantity, exp_date
                FROM product_batches
                WHERE product_id = $1
                  AND quantity > 0
                  AND status = 'ACTIVE'   -- ĐÃ THÊM: Bỏ qua các lô bị khóa
                  AND (exp_date IS NULL OR exp_date >= CURRENT_DATE)
                ORDER BY exp_date ASC NULLS LAST
            `;
            const batches = await client.query(batchQuery, [item_id]);

            const totalStock = batches.rows.reduce((sum, b) => sum + parseInt(b.quantity), 0);
            if (totalStock < remainingQty) {
                throw new Error(`Kho không đủ hàng! Tồn kho hiện tại chỉ còn ${totalStock}.`);
            }

            for (const batch of batches.rows) {
                if (remainingQty <= 0) break;
                const deductQty = Math.min(parseInt(batch.quantity), remainingQty);
                await client.query(
                    `UPDATE product_batches SET quantity = quantity - $1 WHERE batch_id = $2`,
                    [deductQty, batch.batch_id] // Sử dụng batch.batch_id
                );
                remainingQty -= deductQty;
            }
        }

        // Truy vấn này sẽ thành công sau khi bạn sửa cột item_id thành UUID trong DB
        const insertQuery = `
            INSERT INTO booking_services (booking_id, service_type, item_id, item_name, quantity, unit_price)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `;
        const result = await client.query(insertQuery, [
            booking_id, service_type, item_id || null, item_name, quantity, unit_price
        ]);

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(">>> LỖI DATABASE TẠI addBookingService:", error);
        throw error;
    } finally {
        client.release();
    }
};

// 3. Xóa dịch vụ phát sinh (Hoàn tồn kho nếu là hàng hóa)
export const removeBookingService = async (service_id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const getRes = await client.query(`SELECT * FROM booking_services WHERE id = $1`, [service_id]);
        if (getRes.rows.length === 0) throw new Error('Không tìm thấy dịch vụ!');
        const service = getRes.rows[0];

        if (service.service_type === 'INVENTORY' && service.item_id) {
            // Đổi lại thành batch_id
            const batchRes = await client.query(
                `SELECT batch_id FROM product_batches
                 WHERE product_id = $1 AND status = 'ACTIVE' AND (exp_date IS NULL OR exp_date >= CURRENT_DATE)
                 ORDER BY exp_date DESC NULLS FIRST LIMIT 1`,
                [service.item_id]
            );
            
            if (batchRes.rows.length > 0) {
                await client.query(
                    `UPDATE product_batches SET quantity = quantity + $1 WHERE batch_id = $2`,
                    [service.quantity, batchRes.rows[0].batch_id]
                );
            } else {
                const fallbackBatch = await client.query(
                    `SELECT batch_id FROM product_batches WHERE product_id = $1 ORDER BY import_date DESC LIMIT 1`,
                    [service.item_id]
                );
                if (fallbackBatch.rows.length > 0) {
                    await client.query(
                        `UPDATE product_batches SET quantity = quantity + $1 WHERE batch_id = $2`,
                        [service.quantity, fallbackBatch.rows[0].batch_id]
                    );
                }
            }
        }

        await client.query(`DELETE FROM booking_services WHERE id = $1`, [service_id]);
        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(">>> LỖI DATABASE TẠI removeBookingService:", error);
        throw error;
    } finally {
        client.release();
    }
};

// =======================================================
// --- NGHIỆP VỤ THANH TOÁN (CHECKOUT) ---
// =======================================================
export const checkoutBooking = async (booking_id, payment_method, final_amount, room_money, service_money) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Bắt đầu Transaction an toàn

        // 1. Lấy thông tin phiên thuê
        const bRes = await client.query(
            `SELECT b.*, rd.room_number FROM bookings b 
             JOIN room_details rd ON b.room_detail_id = rd.id WHERE b.booking_id = $1`, 
             [booking_id]
        );
        const booking = bRes.rows[0];
        if(!booking) throw new Error('Không tìm thấy phiên thuê');

        // 2. Lấy thông tin dịch vụ
        const sRes = await client.query(`SELECT * FROM booking_services WHERE booking_id = $1`, [booking_id]);
        const services = sRes.rows;

        // 3. Tạo ID Bill và lưu vào bill_payments
        const billId = 'BILL-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
        const actual_checkout = new Date();

        const insertBill = `
            INSERT INTO bill_payments (
                id, booking_code, guest_name, guest_phone, guest_email, room_number,
                rent_type, actual_checkin, actual_checkout, room_price, service_price,
                final_amount, payment_method, services_detail
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *
        `;
        const billRes = await client.query(insertBill, [
            billId, booking.booking_code, booking.guest_name, booking.guest_phone, booking.guest_email,
            booking.room_number, booking.rent_type, booking.actual_checkin, actual_checkout,
            room_money, service_money, final_amount, payment_method, JSON.stringify(services)
        ]);

        // 4. Chuyển phòng về trạng thái DỌN DẸP (CLEANING)
        await client.query(`UPDATE room_details SET status = 'CLEANING' WHERE id = $1`, [booking.room_detail_id]);

        // 5. Kết thúc phiên thuê ở bảng bookings
        await client.query(
            `UPDATE bookings SET booking_status = 'COMPLETED', is_currently_rented = false, actual_checkout = $1 WHERE booking_id = $2`, 
            [actual_checkout, booking_id]
        );

        await client.query('COMMIT');
        return billRes.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};