import * as ServiceModel from '../models/serviceModel.js';
import { logActivity } from '../utils/logger.js';

// [GET] /services/page - Render giao diện quản lý (SSR)
export const renderPage = (req, res) => {
    res.render('pages/home-M', {
        user: req.user,
        title: 'Quản lý Dịch vụ chung'
    });
};

// [GET] /api/services - Lấy danh sách tất cả dịch vụ (JSON)
export const getAll = async (req, res, next) => {
    try {
        // Lấy category từ query parameters (VD: ?category=FB)
        const { category } = req.query; 
        const data = await ServiceModel.getAllServices(category);
        res.json({ data });
    } catch (error) {
        next(error);
    }
};

// [POST] /api/services - Tạo mới dịch vụ
export const create = async (req, res, next) => {
    try {
        const { category, name, unit, price, description } = req.body;

        // Kiểm tra dữ liệu bắt buộc
        if (!category || !name || !unit || price === undefined) {
            return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Loại, Tên, Đơn vị và Giá dịch vụ.' });
        }

        const newService = await ServiceModel.createService({
            category, name, unit, price, description
        });

        await logActivity(req, 'CREATE', 'DỊCH VỤ', newService.name, `Đã thêm mới dịch vụ "${newService.name}" (Loại: ${category})`);
        res.status(201).json({ data: newService });
    } catch (error) {
        next(error);
    }
};

// [PUT] /api/services/:id - Cập nhật thông tin dịch vụ
export const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { category, name, unit, price, description, is_active } = req.body;

        const existing = await ServiceModel.getServiceById(id);
        if (!existing) return res.status(404).json({ error: 'Không tìm thấy dịch vụ.' });

        const updated = await ServiceModel.updateService(id, {
            category: category || existing.category,
            name: name || existing.name,
            unit: unit || existing.unit,
            price: price !== undefined ? price : existing.price,
            description,
            is_active: is_active !== undefined ? is_active : existing.is_active
        });

        await logActivity(req, 'UPDATE', 'DỊCH VỤ', updated.name, `Đã cập nhật dịch vụ "${updated.name}"`);
        res.json({ data: updated });
    } catch (error) {
        next(error);
    }
};

// [DELETE] /api/services/:id - Xóa dịch vụ
export const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await ServiceModel.getServiceById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy dịch vụ.' });
        }

        await ServiceModel.deleteService(id);
        await logActivity(req, 'DELETE', 'DỊCH VỤ', existing.name, `Đã xóa dịch vụ "${existing.name}"`);
        res.json({ message: 'Xóa dịch vụ thành công.' });
    } catch (error) {
        next(error);
    }
};