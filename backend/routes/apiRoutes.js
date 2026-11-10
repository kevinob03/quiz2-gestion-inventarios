import { Router } from 'express';
import * as assistant from '../controllers/assistantController.js';
import * as dashboard from '../controllers/dashboardController.js';
import * as health from '../controllers/healthController.js';
import * as inventory from '../controllers/inventoryController.js';
import * as locations from '../controllers/locationController.js';
import * as materials from '../controllers/materialController.js';
import * as orders from '../controllers/orderController.js';
import * as suppliers from '../controllers/supplierController.js';

const router = Router();
const asyncRoute = (handler) => (req, res, next) => (
  Promise.resolve(handler(req, res, next)).catch(next)
);

router.get('/health', asyncRoute(health.health));
router.get('/assistant/status', assistant.status);
router.post('/assistant/chat', asyncRoute(assistant.chat));
router.get('/dashboard', asyncRoute(dashboard.dashboard));

router.get('/materials', asyncRoute(materials.list));
router.post('/materials', asyncRoute(materials.create));
router.put('/materials/:id', asyncRoute(materials.update));
router.delete('/materials/:id', asyncRoute(materials.archive));
router.get('/materials/:id/trace', asyncRoute(inventory.trace));

router.get('/locations', asyncRoute(locations.list));
router.post('/locations', asyncRoute(locations.create));
router.get('/inventory', asyncRoute(inventory.inventory));
router.get('/movements', asyncRoute(inventory.movements));
router.post('/movements', asyncRoute(inventory.createMovementEntry));
router.get('/alerts/reorder', asyncRoute(inventory.reorderAlerts));

router.get('/suppliers', asyncRoute(suppliers.list));
router.post('/suppliers', asyncRoute(suppliers.create));
router.put('/suppliers/:id', asyncRoute(suppliers.update));
router.delete('/suppliers/:id', asyncRoute(suppliers.archive));

router.get('/orders', asyncRoute(orders.list));
router.post('/orders', asyncRoute(orders.create));
router.get('/orders/possible-duplicates', asyncRoute(orders.possibleDuplicates));

export default router;
