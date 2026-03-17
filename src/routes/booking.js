import express from 'express';
import {
    rentRoom,
    getActiveRent,
    updateRent,
    getReservations,
    reserveRoom,
    updateReservationData,
    cancelRes,
    getServices,
    addService,
    deleteService,
    checkout
} from '../controllers/bookingController.js';

const router = express.Router();

// --- API THUÊ PHÒNG TRỰC TIẾP ---
router.post('/rent', rentRoom);
router.get('/active/:roomId', getActiveRent);
router.put('/rent/:id', updateRent);

// --- API ĐẶT PHÒNG TRƯỚC (RESERVATION) ---
router.get('/reservations/:roomId', getReservations);
router.post('/reserve', reserveRoom);
router.put('/reserve/:id', updateReservationData);
router.delete('/reserve/:id', cancelRes);

// --- API DỊCH VỤ PHÁT SINH (BOOKING SERVICES) ---
router.get('/:bookingId/services', getServices);
router.post('/:bookingId/services', addService);
router.delete('/services/:serviceId', deleteService);

// --- API THANH TOÁN CHECKOUT ---
router.post('/checkout/:id', checkout);
export default router;
