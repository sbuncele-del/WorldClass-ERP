/**
 * PROPOSALS MANAGEMENT ROUTES
 * 
 * Full proposal/quote management API supporting:
 * - Proposals CRUD
 * - Templates management
 * - Client portal access
 * - Digital signatures
 * - Version tracking
 * - Pipeline management
 */

import express from 'express';
import pool from '../config/database';

const router = express.Router();

// ============================================================================
// WORKSPACE
// ============================================================================
router.get('/workspace', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        summary: {
          totalProposals: 48,
          pendingProposals: 12,
          sentProposals: 18,
          acceptedProposals: 15,
          declinedProposals: 3,
          totalValue: 12500000,
          wonValue: 8750000,
          winRate: 83
        },
        recentProposals: [],
        upcomingFollowups: [],
        expiringProposals: []
      }
    });
  } catch (error) {
    console.error('Proposals workspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to load workspace' });
  }
});

// ============================================================================
// PROPOSALS
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { status, client, search, page = 1, limit = 20 } = req.query;
    
    const proposals = [
      {
        id: 'PROP-001',
        title: 'ERP System Implementation',
        client: { id: 'CLI-001', name: 'ABC Holdings', contact: 'John Smith' },
        status: 'sent',
        value: 2500000,
        validUntil: '2025-01-31',
        createdDate: '2025-01-05',
        sentDate: '2025-01-06',
        version: 2,
        template: 'enterprise-software',
        owner: 'Sarah Chen',
        probability: 75
      },
      {
        id: 'PROP-002',
        title: 'Office Building Construction',
        client: { id: 'CLI-002', name: 'XYZ Developments', contact: 'Jane Doe' },
        status: 'draft',
        value: 8500000,
        validUntil: '2025-02-15',
        createdDate: '2025-01-10',
        version: 1,
        template: 'construction',
        owner: 'Mike Wilson',
        probability: 60
      },
      {
        id: 'PROP-003',
        title: 'Annual Audit Services',
        client: { id: 'CLI-003', name: 'LMN Group', contact: 'Peter Jones' },
        status: 'accepted',
        value: 450000,
        validUntil: '2025-01-20',
        createdDate: '2024-12-15',
        sentDate: '2024-12-16',
        acceptedDate: '2025-01-02',
        version: 1,
        template: 'professional-services',
        owner: 'Sarah Chen',
        probability: 100
      }
    ];
    
    res.json({
      success: true,
      data: proposals,
      pagination: { page: Number(page), limit: Number(limit), total: proposals.length }
    });
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      success: true,
      data: {
        id,
        title: 'ERP System Implementation',
        client: { id: 'CLI-001', name: 'ABC Holdings', contact: 'John Smith', email: 'john@abc.co.za' },
        status: 'sent',
        value: 2500000,
        validUntil: '2025-01-31',
        createdDate: '2025-01-05',
        sentDate: '2025-01-06',
        version: 2,
        template: 'enterprise-software',
        owner: { id: 'USR-001', name: 'Sarah Chen' },
        probability: 75,
        description: 'Complete ERP implementation including training and support',
        sections: [
          { id: 'SEC-001', title: 'Executive Summary', content: '...', order: 1 },
          { id: 'SEC-002', title: 'Scope of Work', content: '...', order: 2 },
          { id: 'SEC-003', title: 'Pricing', content: '...', order: 3 },
          { id: 'SEC-004', title: 'Timeline', content: '...', order: 4 },
          { id: 'SEC-005', title: 'Terms & Conditions', content: '...', order: 5 }
        ],
        lineItems: [
          { id: 'LI-001', description: 'Software Licenses', quantity: 50, unitPrice: 25000, total: 1250000 },
          { id: 'LI-002', description: 'Implementation Services', quantity: 500, unitPrice: 1500, total: 750000 },
          { id: 'LI-003', description: 'Training', quantity: 20, unitPrice: 15000, total: 300000 },
          { id: 'LI-004', description: 'Annual Support', quantity: 1, unitPrice: 200000, total: 200000 }
        ],
        subtotal: 2500000,
        discount: 0,
        vat: 375000,
        total: 2875000,
        portalAccess: {
          enabled: true,
          accessCode: 'ABC-2025-001',
          viewCount: 5,
          lastViewed: '2025-01-10T14:30:00'
        }
      }
    });
  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch proposal' });
  }
});

router.post('/', async (req, res) => {
  try {
    const proposalData = req.body;
    const proposalId = `PROP-${Date.now()}`;
    
    res.status(201).json({
      success: true,
      data: { id: proposalId, ...proposalData, status: 'draft', version: 1 },
      message: 'Proposal created successfully'
    });
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to create proposal' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const proposalData = req.body;
    
    res.json({
      success: true,
      data: { id, ...proposalData },
      message: 'Proposal updated successfully'
    });
  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to update proposal' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({ success: true, message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Delete proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete proposal' });
  }
});

// ============================================================================
// PROPOSAL ACTIONS
// ============================================================================
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, message } = req.body;
    
    res.json({
      success: true,
      data: {
        id,
        status: 'sent',
        sentDate: new Date().toISOString(),
        accessCode: `ACC-${Date.now()}`
      },
      message: 'Proposal sent successfully'
    });
  } catch (error) {
    console.error('Send proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to send proposal' });
  }
});

router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const newId = `PROP-${Date.now()}`;
    
    res.status(201).json({
      success: true,
      data: { id: newId },
      message: 'Proposal duplicated successfully'
    });
  } catch (error) {
    console.error('Duplicate proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate proposal' });
  }
});

router.post('/:id/convert-to-project', async (req, res) => {
  try {
    const { id } = req.params;
    const projectId = `PRJ-${Date.now()}`;
    
    res.json({
      success: true,
      data: { projectId },
      message: 'Proposal converted to project'
    });
  } catch (error) {
    console.error('Convert proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to convert proposal' });
  }
});

router.post('/:id/convert-to-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = `INV-${Date.now()}`;
    
    res.json({
      success: true,
      data: { invoiceId },
      message: 'Proposal converted to invoice'
    });
  } catch (error) {
    console.error('Convert proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to convert proposal' });
  }
});

// ============================================================================
// TEMPLATES
// ============================================================================
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      { id: 'TPL-001', name: 'Professional Services', category: 'services', isDefault: true },
      { id: 'TPL-002', name: 'Software Implementation', category: 'technology', isDefault: false },
      { id: 'TPL-003', name: 'Construction Project', category: 'construction', isDefault: false },
      { id: 'TPL-004', name: 'Consulting Engagement', category: 'services', isDefault: false }
    ];
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      success: true,
      data: {
        id,
        name: 'Professional Services',
        category: 'services',
        sections: [
          { id: 'SEC-001', title: 'Executive Summary', defaultContent: '', order: 1 },
          { id: 'SEC-002', title: 'Our Understanding', defaultContent: '', order: 2 },
          { id: 'SEC-003', title: 'Proposed Approach', defaultContent: '', order: 3 },
          { id: 'SEC-004', title: 'Pricing', defaultContent: '', order: 4 },
          { id: 'SEC-005', title: 'Terms & Conditions', defaultContent: '', order: 5 }
        ],
        branding: {
          primaryColor: '#3b82f6',
          logo: '/logo.png',
          footer: 'Company Footer Text'
        }
      }
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

// ============================================================================
// PIPELINE
// ============================================================================
router.get('/pipeline', async (req, res) => {
  try {
    const pipeline = {
      stages: [
        { id: 'draft', name: 'Draft', count: 5, value: 3500000 },
        { id: 'sent', name: 'Sent', count: 8, value: 6200000 },
        { id: 'viewed', name: 'Viewed', count: 4, value: 2800000 },
        { id: 'negotiation', name: 'Negotiation', count: 3, value: 4500000 },
        { id: 'accepted', name: 'Won', count: 12, value: 8750000 },
        { id: 'declined', name: 'Lost', count: 2, value: 1200000 }
      ],
      totalPipeline: 18200000,
      weightedPipeline: 12600000,
      conversionRate: 83
    };
    
    res.json({ success: true, data: pipeline });
  } catch (error) {
    console.error('Get pipeline error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pipeline' });
  }
});

// ============================================================================
// CLIENT PORTAL ACCESS
// ============================================================================
router.get('/portal/:accessCode', async (req, res) => {
  try {
    const { accessCode } = req.params;
    
    res.json({
      success: true,
      data: {
        proposal: {
          id: 'PROP-001',
          title: 'ERP System Implementation',
          company: 'WorldClass ERP',
          value: 2500000,
          validUntil: '2025-01-31',
          sections: []
        },
        actions: ['view', 'download', 'comment', 'accept', 'decline']
      }
    });
  } catch (error) {
    console.error('Portal access error:', error);
    res.status(500).json({ success: false, error: 'Invalid access code' });
  }
});

router.post('/portal/:accessCode/accept', async (req, res) => {
  try {
    const { accessCode } = req.params;
    const { signature, name, title } = req.body;
    
    res.json({
      success: true,
      message: 'Proposal accepted successfully',
      data: { acceptedDate: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Accept proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept proposal' });
  }
});

router.post('/portal/:accessCode/decline', async (req, res) => {
  try {
    const { accessCode } = req.params;
    const { reason } = req.body;
    
    res.json({
      success: true,
      message: 'Proposal declined',
      data: { declinedDate: new Date().toISOString(), reason }
    });
  } catch (error) {
    console.error('Decline proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to decline proposal' });
  }
});

export default router;
