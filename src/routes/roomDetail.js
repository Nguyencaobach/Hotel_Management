import express from 'express';
import { renderPage, getAll, create, update, remove } from '../controllers/roomDetailController.js';
import { cacheHTML } from '../middlewares/shared/cache.js';

const router = express.Router();

router.get('/page', cacheHTML(10), renderPage); // GET /room-details/page → render trang view (cache 10 phút)
router.get('/', getAll);         // GET    /api/room-details
router.post('/', create);        // POST   /api/room-details
router.put('/:id', update);      // PUT    /api/room-details/:id
router.delete('/:id', remove);   // DELETE /api/room-details/:id

export default router;