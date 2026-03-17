import {
    getAllRoomTypes,
    getRoomTypeById,
    createRoomType,
    updateRoomType,
    deleteRoomType,
} from '../models/roomTypeModel.js';
import { logActivity } from '../utils/logger.js';

// [GET] /room-types — Render trang quản lý loại phòng
export const renderPage = (req, res) => {
    res.render('pages/home-M', {
        user: req.user,
        title: 'Quản lý loại phòng',
    });
};

// [GET] /api/room-types — Lấy tất cả loại phòng
export const getAll = async (req, res, next) => {
    try {
        const data = await getAllRoomTypes();
        res.json({ data });
    } catch (error) {
        next(error);
    }
};

// [POST] /api/room-types — Tạo mới loại phòng
export const create = async (req, res, next) => {
    try {
        const { name, description, hourly_price, daily_price } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Tên loại phòng không được để trống.' });
        }

        const newRoomType = await createRoomType({
            name: name.trim(),
            description,
            hourly_price,
            daily_price,
        });

        await logActivity(req, 'CREATE', 'LOẠI PHÒNG', newRoomType.name, `Đã thêm mới loại phòng "${newRoomType.name}"`);
        res.status(201).json({ data: newRoomType });
    } catch (error) {
        next(error);
    }
};

// [PUT] /api/room-types/:id — Cập nhật loại phòng
export const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, hourly_price, daily_price } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Tên loại phòng không được để trống.' });
        }

        const existing = await getRoomTypeById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy loại phòng.' });
        }

        const updated = await updateRoomType(id, {
            name: name.trim(),
            description,
            hourly_price,
            daily_price,
        });

        await logActivity(req, 'UPDATE', 'LOẠI PHÒNG', updated.name, `Đã cập nhật loại phòng "${updated.name}"`);
        res.json({ data: updated });
    } catch (error) {
        next(error);
    }
};

// [DELETE] /api/room-types/:id — Xóa loại phòng
export const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await getRoomTypeById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy loại phòng.' });
        }

        await deleteRoomType(id);
        await logActivity(req, 'DELETE', 'LOẠI PHÒNG', existing.name, `Đã xóa loại phòng "${existing.name}"`);
        res.json({ message: 'Xóa loại phòng thành công.' });
    } catch (error) {
        next(error);
    }
};
