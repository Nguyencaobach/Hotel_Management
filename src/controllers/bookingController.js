import fs from 'fs';
import path from 'path';
import * as BookingModel from '../models/bookingModel.js';
import { logActivity } from '../utils/logger.js';

export const rentRoom = async (req, res, next) => {
    try {
        const { room_detail_id, room_type_id, room_number, rent_type, guest_name, guest_phone, actual_checkin, expected_checkout } = req.body;

        // Bỏ điều kiện bắt buộc nhập expected_checkout
        if (!guest_name || !guest_phone) {
            return res.status(400).json({ error: 'Vui lòng nhập đủ Họ tên và SĐT khách hàng!' });
        }

        const isOverlap = await BookingModel.checkOverlap(room_detail_id, actual_checkin, expected_checkout || null);
        if (isOverlap) return res.status(400).json({ error: 'Thời gian này bị cấn với lịch đặt trước. Vui lòng chọn phòng khác!' });

        const newBooking = await BookingModel.createRentSession(req.body);
        const typeText = rent_type === 'HOURLY' ? 'Thuê giờ' : 'Thuê ngày';
        await logActivity(req, 'CREATE', 'THUÊ PHÒNG', `Phòng ${room_number}`, `${typeText} cho khách: ${guest_name}`);

        
        res.status(201).json({ message: 'Tạo phiên thuê thành công!', data: newBooking });
    } catch (error) { next(error); }
};

export const getActiveRent = async (req, res, next) => {
    try {
        const data = await BookingModel.getActiveBooking(req.params.roomId);
        if (!data) return res.status(404).json({ error: 'Phòng này không có phiên thuê nào đang hoạt động.' });
        res.json({ data });
    } catch (error) { next(error); }
};

export const updateRent = async (req, res, next) => {
    try {
        const { booking_id, room_detail_id, actual_checkin, expected_checkout, cccd_front_url, cccd_back_url } = req.body;

        const isOverlap = await BookingModel.checkOverlap(room_detail_id, actual_checkin, expected_checkout || null, booking_id);
        if (isOverlap) return res.status(400).json({ error: 'Giờ trả phòng mới bị cấn với lịch đặt của khách khác!' });

        const existing = await BookingModel.getActiveBooking(room_detail_id);

        // Xóa file cũ nếu có cập nhật ảnh mới
        if (cccd_front_url && existing.cccd_front_url && cccd_front_url !== existing.cccd_front_url) {
            const oldPath = path.join(process.cwd(), 'public', existing.cccd_front_url);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        if (cccd_back_url && existing.cccd_back_url && cccd_back_url !== existing.cccd_back_url) {
            const oldPath = path.join(process.cwd(), 'public', existing.cccd_back_url);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const updated = await BookingModel.updateRentSession(booking_id, req.body);
        await logActivity(req, 'UPDATE', 'THUÊ PHÒNG', `Mã ${existing.booking_code}`, 'Cập nhật thông tin phiên thuê');
        res.json({ message: 'Cập nhật thành công!', data: updated });
    } catch (error) { next(error); }
};

// --- BỔ SUNG VÀO src/controllers/bookingController.js ---

export const getReservations = async (req, res, next) => {
    try {
        const data = await BookingModel.getReservationsByRoom(req.params.roomId);
        res.json({ data });
    } catch (error) { next(error); }
};

// Thay thế hàm reserveRoom trong src/controllers/bookingController.js
export const reserveRoom = async (req, res, next) => {
    try {
        const { room_detail_id, room_number, guest_name, guest_phone, expected_checkin, expected_checkout } = req.body;

        if (!guest_name || !guest_phone || !expected_checkin || !expected_checkout) {
            return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin (Tên, SĐT, Giờ nhận, Giờ trả)!' });
        }
        if (new Date(expected_checkin) >= new Date(expected_checkout)) {
            return res.status(400).json({ error: 'Giờ trả phòng dự kiến phải sau giờ nhận phòng!' });
        }

        // BƯỚC 1: XỬ LÝ LỖI KHÁCH ĐANG Ở NHƯNG CHƯA CHỐT GIỜ RA
        const activeSession = await BookingModel.getActiveBooking(room_detail_id);
        if (activeSession && !activeSession.expected_checkout) {
            return res.status(400).json({
                error: `Phòng ${room_number} đang có khách ở nhưng CHƯA BÁO GIỜ TRẢ. Bạn phải vào Phiên Thuê của phòng này cập nhật Giờ Trả Dự Kiến trước thì mới được phép nhận lịch đặt trước!`
            });
        }

        // BƯỚC 2: KIỂM TRA ĐỤNG LỊCH VỚI CÁC ĐƠN KHÁC
        const isOverlap = await BookingModel.checkOverlap(room_detail_id, expected_checkin, expected_checkout);
        if (isOverlap) {
            return res.status(400).json({
                error: 'Khoảng thời gian này đã có người đặt trước hoặc bị cấn với lịch của khách đang ở. Vui lòng chọn giờ khác!'
            });
        }

        // BƯỚC 3: LƯU THÀNH CÔNG
        const newRes = await BookingModel.createReservation(req.body);
        await logActivity(req, 'CREATE', 'ĐẶT TRƯỚC', `Phòng ${room_number}`, `Khách: ${guest_name} đặt trước`);
        res.status(201).json({ message: 'Lưu thông tin đặt phòng thành công!', data: newRes });
    } catch (error) {
        next(error);
    }
};

export const updateReservationData = async (req, res, next) => {
    try {
        const { booking_id, room_detail_id, room_number, guest_name, expected_checkin, expected_checkout } = req.body;

        // Kiểm tra đụng lịch nhưng BỎ QUA chính đơn đang sửa (Cho phép dời lịch trong phạm vi an toàn)
        const isOverlap = await BookingModel.checkOverlap(room_detail_id, expected_checkin, expected_checkout, booking_id);
        if (isOverlap) return res.status(400).json({ error: 'Thời gian dời lịch bị cấn với phiên thuê/đặt khác!' });

        const updated = await BookingModel.updateReservation(booking_id, req.body);
        await logActivity(req, 'UPDATE', 'ĐẶT TRƯỚC', `Phòng ${room_number}`, `Dời lịch/Cập nhật cho: ${guest_name}`);
        res.json({ message: 'Cập nhật thành công!', data: updated });
    } catch (error) { next(error); }
};

export const cancelRes = async (req, res, next) => {
    try {
        const cancelled = await BookingModel.cancelReservation(req.params.id);
        await logActivity(req, 'DELETE', 'ĐẶT TRƯỚC', `Mã ${cancelled.booking_code}`, `Hủy đặt phòng`);
        res.json({ message: 'Đã hủy phiên đặt phòng!' });
    } catch (error) { next(error); }
};

// =======================================================
// --- API DỊCH VỤ PHÁT SINH (BOOKING SERVICES) ---
// =======================================================

export const getServices = async (req, res, next) => {
    try {
        const data = await BookingModel.getBookingServices(req.params.bookingId);
        res.json({ data });
    } catch (error) { next(error); }
};

export const addService = async (req, res, next) => {
    try {
        const { service_type, item_id, item_name, quantity, unit_price } = req.body;
        if (!item_name || !quantity || !unit_price) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin dịch vụ!' });
        }
        const result = await BookingModel.addBookingService(
            req.params.bookingId, service_type, item_id, item_name, parseInt(quantity), parseFloat(unit_price)
        );
        await logActivity(req, 'CREATE', 'DỊCH VỤ', `Booking #${req.params.bookingId}`, `Thêm: ${item_name} x${quantity}`);
        res.status(201).json({ message: 'Thêm dịch vụ thành công!', data: result });
    } catch (error) {
        // Trả về lỗi nghiệp vụ (VD: hết hàng) dưới dạng 400 thay vì 500
        if (error.message.includes('Kho không đủ')) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};

export const deleteService = async (req, res, next) => {
    try {
        await BookingModel.removeBookingService(req.params.serviceId);
        res.json({ message: 'Đã xóa dịch vụ và hoàn lại tồn kho!' });
    } catch (error) { next(error); }
};

// =======================================================
// --- API THANH TOÁN CHECKOUT ---
// =======================================================
export const checkout = async (req, res, next) => {
    try {
        const { payment_method, final_amount, room_money, service_money } = req.body;
        const booking_id = req.params.id;

        const bill = await BookingModel.checkoutBooking(booking_id, payment_method, final_amount, room_money, service_money);

        // Ghi Log chuẩn xịn của bạn
        const payType = payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản';
        await logActivity(req, 'UPDATE', 'THANH TOÁN', `Hóa đơn ${bill.id}`, `Đã thanh toán phòng ${bill.room_number} bằng ${payType}`);

        res.json({ message: 'Thanh toán và trả phòng thành công!', data: bill });
    } catch (error) {
        next(error);
    }
};