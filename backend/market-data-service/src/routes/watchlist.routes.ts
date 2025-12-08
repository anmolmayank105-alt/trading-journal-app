/**
 * Watchlist Routes
 */

import { Router } from 'express';
import { watchlistController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

router.get('/', watchlistController.getWatchlists.bind(watchlistController) as any);
router.get('/:id', watchlistController.getWatchlistById.bind(watchlistController) as any);
router.post('/', watchlistController.createWatchlist.bind(watchlistController) as any);
router.put('/:id', watchlistController.updateWatchlist.bind(watchlistController) as any);
router.delete('/:id', watchlistController.deleteWatchlist.bind(watchlistController) as any);

// Items
router.post('/:id/items', watchlistController.addItem.bind(watchlistController) as any);
router.delete('/:id/items/:symbol', watchlistController.removeItem.bind(watchlistController) as any);

// Default
router.post('/:id/default', watchlistController.setDefault.bind(watchlistController) as any);

export default router;
