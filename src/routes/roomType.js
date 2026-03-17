import express from 'express';
import { renderPage, getAll, create, update, remove } from '../controllers/roomTypeController.js';
import { cacheHTML } from '../middlewares/shared/cache.js';

const router = express.Router();

router.get('/page', cacheHTML(10), renderPage); // GET /room-types/page → render trang view (cache 10 phút)
router.get('/', getAll);         // GET    /api/room-types
router.post('/', create);        // POST   /api/room-types
router.put('/:id', update);      // PUT    /api/room-types/:id
router.delete('/:id', remove);   // DELETE /api/room-types/:id

export default router;
