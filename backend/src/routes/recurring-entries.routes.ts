import { Router } from 'express';
import { RecurringEntriesController } from '../controllers/recurring-entries.controller';

const router = Router();

// Get all recurring entries
router.get('/', RecurringEntriesController.getRecurringEntries);

// Get single recurring entry
router.get('/:id', RecurringEntriesController.getRecurringEntry);

// Create new recurring entry
router.post('/', RecurringEntriesController.createRecurringEntry);

// Update recurring entry
router.put('/:id', RecurringEntriesController.updateRecurringEntry);

// Delete recurring entry
router.delete('/:id', RecurringEntriesController.deleteRecurringEntry);

// Toggle active/inactive
router.patch('/:id/toggle', RecurringEntriesController.toggleActive);

// Generate journal entry from template
router.post('/:id/generate', RecurringEntriesController.generateEntry);

export default router;
