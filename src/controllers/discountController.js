import * as DiscountModel from '../models/discountModel.js';
import { logActivity } from '../utils/logger.js';

export const renderPage = (req, res) => {
    res.render('pages/home-M', { user: req.user, title: 'Quản lý Mã giảm giá' });
};

export const getAll = async (req, res, next) => {
    try {
        const data = await DiscountModel.getAllDiscounts();
        res.json({ data });
    } catch (error) { next(error); }
};