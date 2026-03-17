import fs from 'fs';
import path from 'path';
import {
    getAllRoomDetails,
    getRoomDetailById,
    getRoomDetailByRoomNumber,
    createRoomDetail,
    updateRoomDetail,
    deleteRoomDetail,
} from '../models/roomDetailModel.js';
import { logActivity } from '../utils/logger.js';

// [GET] /room-details/page — Render trang quản lý chi tiết phòng
export const renderPage = (req, res) => {
    // Lưu ý: Cần tạo file css và js tương ứng cho giao diện này, tạm thời tôi mock tên file
    res.render('pages/home-M', {
        user: req.user,
        title: 'Quản lý chi tiết phòng',
    });
};

// [GET] /api/room-details — Lấy tất cả chi tiết phòng
export const getAll = async (req, res, next) => {
    try {
        const data = await getAllRoomDetails();
        res.json({ data });
    } catch (error) {
        next(error);
    }
};

// [POST] /api/room-details — Tạo mới chi tiết phòng
export const create = async (req, res, next) => {
    try {
        const { room_type_id, room_number, status, floor, notes } = req.body;

        if (!room_type_id || !room_number || room_number.trim() === '') {
            return res.status(400).json({ error: 'Loại phòng và số phòng không được để trống.' });
        }

        // Kiểm tra số phòng đã tồn tại trong cùng loại phòng chưa
        const isExist = await getRoomDetailByRoomNumber(room_number.trim(), room_type_id);
        if (isExist) {
            return res.status(400).json({ error: 'Số phòng này đã tồn tại trong loại phòng này.' });
        }

        const newRoomDetail = await createRoomDetail({
            room_type_id,
            room_number: room_number.trim(),
            status: status ? status.toUpperCase() : 'AVAILABLE',
            floor,
            notes,
        });

        await logActivity(req, 'CREATE', 'PHÒNG', newRoomDetail.room_number, `Đã thêm phòng số ${newRoomDetail.room_number} (Tầng ${floor || '?'})`);
        res.status(201).json({ data: newRoomDetail });
    } catch (error) {
        next(error);
    }
};

// Danh sách trạng thái đang thuê — không cho phép sửa hoặc xóa
const RENTED_STATUSES = ['HOURLY_RENTED', 'DAILY_RENTED'];

// [PUT] /api/room-details/:id — Cập nhật chi tiết phòng
export const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { room_type_id, room_number, status, floor, notes } = req.body;

        if (!room_type_id || !room_number || room_number.trim() === '') {
            return res.status(400).json({ error: 'Loại phòng và số phòng không được để trống.' });
        }

        const existing = await getRoomDetailById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy thông tin phòng.' });
        }

        // Chặn sửa phòng đang được thuê
        if (RENTED_STATUSES.includes(existing.status)) {
            return res.status(403).json({ error: 'Không thể chỉnh sửa phòng đang được thuê. Hãy chờ phiên thuê kết thúc.' });
        }

        // Không cho phép manager tự gán trạng thái thuê
        if (RENTED_STATUSES.includes(status?.toUpperCase())) {
            return res.status(400).json({ error: 'Không thể gán trạng thái thuê phòng thủ công.' });
        }

        // Nếu người dùng đổi số phòng hoặc đổi loại phòng, phải kiểm tra trung trong cùng loại phòng
        const targetRoomTypeId = room_type_id || existing.room_type_id;
        if (existing.room_number !== room_number.trim() || existing.room_type_id !== targetRoomTypeId) {
            const isExist = await getRoomDetailByRoomNumber(room_number.trim(), targetRoomTypeId, id);
            if (isExist) {
                return res.status(400).json({ error: 'Số phòng này đã tồn tại trong loại phòng này.' });
            }
        }

        // =========================================================
        // LOGIC TỰ ĐỘNG XÓA ẢNH CŨ KHỎI Ổ CỨNG BACKEND
        // =========================================================
        if (req.body.room_img_url !== undefined && req.body.room_img_url !== existing.room_img_url) {
            if (existing.room_img_url) {
                // Biến đổi URL (VD: /uploads/rooms/abc.png) thành đường dẫn thật trong ổ cứng
                const oldFilePath = path.join(process.cwd(), 'public', existing.room_img_url);
                // Nếu file còn tồn tại thì xóa nó đi cho nhẹ máy chủ
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                    console.log(`Đã xóa ảnh cũ: ${oldFilePath}`);
                }
            }
        }

        const updated = await updateRoomDetail(id, {
            room_type_id: room_type_id !== undefined ? room_type_id : existing.room_type_id,
            room_number: room_number ? room_number.trim() : existing.room_number,
            status: status ? status.toUpperCase() : existing.status,
            floor: floor !== undefined ? floor : existing.floor,
            notes: notes !== undefined ? notes : existing.notes,

            capacity: req.body.capacity !== undefined ? req.body.capacity : existing.capacity,
            bed_type: req.body.bed_type !== undefined ? req.body.bed_type : existing.bed_type,
            room_size: req.body.room_size !== undefined ? req.body.room_size : existing.room_size,
            view_type: req.body.view_type !== undefined ? req.body.view_type : existing.view_type,
            amenities: req.body.amenities !== undefined ? req.body.amenities : existing.amenities,
            room_img_url: req.body.room_img_url !== undefined ? req.body.room_img_url : existing.room_img_url
        });

        await logActivity(req, 'UPDATE', 'PHÒNG', updated.room_number, `Đã cập nhật phòng số ${updated.room_number}`);
        res.json({ data: updated });
    } catch (error) {
        next(error);
    }
};

// [DELETE] /api/room-details/:id — Xóa chi tiết phòng
export const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await getRoomDetailById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy thông tin phòng.' });
        }

        // Chặn xóa phòng đang được thuê
        if (RENTED_STATUSES.includes(existing.status)) {
            return res.status(403).json({ error: 'Không thể xóa phòng đang được thuê. Hãy chờ phiên thuê kết thúc.' });
        }

        await deleteRoomDetail(id);
        await logActivity(req, 'DELETE', 'PHÒNG', existing.room_number, `Đã xóa phòng số ${existing.room_number}`);
        res.json({ message: 'Xóa phòng thành công.' });
    } catch (error) {
        next(error);
    }
};