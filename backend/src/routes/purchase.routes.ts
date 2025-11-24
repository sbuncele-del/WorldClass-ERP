import express from 'express';
import * as purchaseController from '../controllers/purchase.controller';
import * as purchaseWorkspaceController from '../modules/purchase/controllers/purchase.workspace.controller';

const router = express.Router();

// ==================== WORKSPACE ====================
router.get('/workspace', purchaseWorkspaceController.getPurchaseWorkspace);

// ==================== SUPPLIER ROUTES ====================
router.get('/suppliers', purchaseController.getSuppliers);
router.get('/suppliers/:id', purchaseController.getSupplierById);
router.post('/suppliers', purchaseController.createSupplier);
router.put('/suppliers/:id', purchaseController.updateSupplier);
router.delete('/suppliers/:id', purchaseController.deleteSupplier);

// ==================== VENDOR ROUTES (Aliases for Suppliers) ====================
router.get('/vendors', purchaseController.getSuppliers);
router.get('/vendors/:id', purchaseController.getSupplierById);
router.post('/vendors', purchaseController.createSupplier);
router.put('/vendors/:id', purchaseController.updateSupplier);
router.delete('/vendors/:id', purchaseController.deleteSupplier);

// ==================== REQUISITION ROUTES ====================
router.get('/requisitions', purchaseController.getRequisitions);
router.get('/requisitions/:id', purchaseController.getRequisitionById);
router.post('/requisitions', purchaseController.createRequisition);
router.put('/requisitions/:id', purchaseController.updateRequisition);
router.delete('/requisitions/:id', purchaseController.deleteRequisition);
router.post('/requisitions/:id/approve', purchaseController.approveRequisition);
router.post('/requisitions/:id/reject', purchaseController.rejectRequisition);

// ==================== PURCHASE ORDER ROUTES ====================
router.get('/purchase-orders', purchaseController.getPurchaseOrders);
router.get('/purchase-orders/:id', purchaseController.getPurchaseOrderById);
router.post('/purchase-orders', purchaseController.createPurchaseOrder);
router.put('/purchase-orders/:id', purchaseController.updatePurchaseOrder);
router.post('/purchase-orders/:id/send', purchaseController.sendPurchaseOrder);
router.post('/purchase-orders/:id/acknowledge', purchaseController.acknowledgePurchaseOrder);
router.post('/purchase-orders/:id/cancel', purchaseController.cancelPurchaseOrder);

// ==================== GOODS RECEIPT ROUTES ====================
router.get('/goods-receipts', purchaseController.getGoodsReceipts);
router.get('/goods-receipts/:id', purchaseController.getGoodsReceiptById);
router.post('/goods-receipts', purchaseController.createGoodsReceipt);
router.put('/goods-receipts/:id', purchaseController.updateGoodsReceipt);
router.delete('/goods-receipts/:id', purchaseController.deleteGoodsReceipt);
router.post('/goods-receipts/:id/confirm', purchaseController.confirmGoodsReceipt);

// ==================== VENDOR INVOICE ROUTES ====================
router.get('/vendor-invoices', purchaseController.getVendorInvoices);
router.get('/vendor-invoices/:id', purchaseController.getVendorInvoiceById);
router.post('/vendor-invoices', purchaseController.createVendorInvoice);
router.put('/vendor-invoices/:id', purchaseController.updateVendorInvoice);
router.delete('/vendor-invoices/:id', purchaseController.deleteVendorInvoice);
router.post('/vendor-invoices/:id/approve', purchaseController.approveVendorInvoice);
router.post('/vendor-invoices/:id/reject', purchaseController.rejectVendorInvoice);
router.post('/vendor-invoices/:id/pay', purchaseController.payVendorInvoice);

export default router;
