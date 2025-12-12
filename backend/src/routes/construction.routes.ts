/**
 * CONSTRUCTION INDUSTRY ROUTES
 * 
 * Construction-specific operations API:
 * - Project sites
 * - CIDB compliance (South Africa)
 * - Safety management (OHS Act)
 * - Progress tracking
 * - Materials & resources
 * - Subcontractor management
 * - Quality control
 */

import express from 'express';

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
          activeProjects: 12,
          totalContractValue: 285000000,
          onSchedule: 9,
          delayed: 3,
          safetyIncidentsYTD: 4,
          daysSinceLastIncident: 28,
          avgProgress: 62
        },
        projectsAtRisk: [],
        upcomingInspections: [],
        resourceUtilization: 78
      }
    });
  } catch (error) {
    console.error('Construction workspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to load workspace' });
  }
});

// ============================================================================
// CONSTRUCTION PROJECTS
// ============================================================================
router.get('/projects', async (req, res) => {
  try {
    const { status, cidbGrade } = req.query;
    
    const projects = [
      {
        id: 'CONST-001',
        name: 'Sandton Office Tower',
        client: 'Property Holdings Ltd',
        location: { address: 'Sandton CBD, Johannesburg', province: 'Gauteng' },
        type: 'commercial',
        cidbGrade: '9GB',
        contractValue: 125000000,
        status: 'active',
        progress: 45,
        startDate: '2025-01-15',
        targetCompletion: '2026-06-30',
        projectManager: 'David Nkosi',
        safetyOfficer: 'Maria Santos'
      },
      {
        id: 'CONST-002',
        name: 'N2 Highway Extension',
        client: 'SANRAL',
        location: { address: 'N2 between Port Elizabeth and Grahamstown', province: 'Eastern Cape' },
        type: 'civil',
        cidbGrade: '9CE',
        contractValue: 85000000,
        status: 'active',
        progress: 72,
        startDate: '2024-06-01',
        targetCompletion: '2025-12-31',
        projectManager: 'Johan van Wyk',
        safetyOfficer: 'Sipho Dlamini'
      },
      {
        id: 'CONST-003',
        name: 'Cape Town Residential Complex',
        client: 'Urban Developers',
        location: { address: 'Century City, Cape Town', province: 'Western Cape' },
        type: 'residential',
        cidbGrade: '7GB',
        contractValue: 45000000,
        status: 'active',
        progress: 28,
        startDate: '2025-03-01',
        targetCompletion: '2026-03-31',
        projectManager: 'Fatima Adams',
        safetyOfficer: 'Peter Muller'
      }
    ];
    
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      success: true,
      data: {
        id,
        name: 'Sandton Office Tower',
        client: { name: 'Property Holdings Ltd', contact: 'James Smith', phone: '+27 11 555 1234' },
        location: { address: 'Sandton CBD, Johannesburg', province: 'Gauteng', coordinates: { lat: -26.1076, lng: 28.0567 } },
        type: 'commercial',
        cidbGrade: '9GB',
        contractValue: 125000000,
        status: 'active',
        progress: 45,
        startDate: '2025-01-15',
        targetCompletion: '2026-06-30',
        team: {
          projectManager: { name: 'David Nkosi', phone: '+27 82 555 1111' },
          safetyOfficer: { name: 'Maria Santos', phone: '+27 82 555 2222' },
          siteForeman: { name: 'Thabo Mokoena', phone: '+27 82 555 3333' }
        },
        phases: [
          { id: 'PH-001', name: 'Foundation', progress: 100, status: 'completed' },
          { id: 'PH-002', name: 'Structure', progress: 65, status: 'in-progress' },
          { id: 'PH-003', name: 'Finishing', progress: 0, status: 'pending' }
        ],
        budget: {
          contracted: 125000000,
          spent: 52000000,
          committed: 18000000,
          remaining: 55000000
        }
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

// ============================================================================
// CIDB COMPLIANCE
// ============================================================================
router.get('/cidb/registration', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        registrationNumber: 'CIDB-2020-12345',
        companyName: 'WorldClass Construction (Pty) Ltd',
        grades: [
          { category: 'GB', grade: 9, description: 'General Building', expiryDate: '2026-03-31' },
          { category: 'CE', grade: 8, description: 'Civil Engineering', expiryDate: '2026-03-31' }
        ],
        status: 'active',
        bbbeeLevel: 2,
        taxClearance: { status: 'valid', expiryDate: '2025-12-31' },
        coida: { status: 'valid', certificateNumber: 'COIDA-2025-789' }
      }
    });
  } catch (error) {
    console.error('Get CIDB registration error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch CIDB registration' });
  }
});

router.get('/cidb/grades', async (req, res) => {
  try {
    const grades = {
      GB: [
        { grade: 1, maxValue: 200000, description: 'R0 - R200,000' },
        { grade: 2, maxValue: 500000, description: 'R200,001 - R500,000' },
        { grade: 3, maxValue: 1500000, description: 'R500,001 - R1,500,000' },
        { grade: 4, maxValue: 3000000, description: 'R1,500,001 - R3,000,000' },
        { grade: 5, maxValue: 6500000, description: 'R3,000,001 - R6,500,000' },
        { grade: 6, maxValue: 13000000, description: 'R6,500,001 - R13,000,000' },
        { grade: 7, maxValue: 40000000, description: 'R13,000,001 - R40,000,000' },
        { grade: 8, maxValue: 130000000, description: 'R40,000,001 - R130,000,000' },
        { grade: 9, maxValue: null, description: 'Above R130,000,000' }
      ]
    };
    
    res.json({ success: true, data: grades });
  } catch (error) {
    console.error('Get CIDB grades error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch CIDB grades' });
  }
});

// ============================================================================
// SAFETY (OHS ACT)
// ============================================================================
router.get('/safety/incidents', async (req, res) => {
  try {
    const { projectId, severity } = req.query;
    
    const incidents = [
      {
        id: 'SAFE-001',
        project: 'CONST-001',
        date: '2025-11-15',
        type: 'near-miss',
        severity: 'low',
        description: 'Unsecured scaffolding reported',
        reportedBy: 'Site Inspector',
        status: 'closed',
        actionsTaken: 'Scaffolding secured and re-inspected',
        investigationComplete: true
      }
    ];
    
    res.json({ success: true, data: incidents });
  } catch (error) {
    console.error('Get safety incidents error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch safety incidents' });
  }
});

router.post('/safety/incidents', async (req, res) => {
  try {
    const incidentData = req.body;
    const incidentId = `SAFE-${Date.now()}`;
    
    res.status(201).json({
      success: true,
      data: { id: incidentId, ...incidentData, status: 'open' },
      message: 'Safety incident reported'
    });
  } catch (error) {
    console.error('Report safety incident error:', error);
    res.status(500).json({ success: false, error: 'Failed to report incident' });
  }
});

router.get('/safety/inspections', async (req, res) => {
  try {
    const inspections = [
      {
        id: 'INSP-001',
        project: 'CONST-001',
        type: 'weekly-safety',
        date: '2025-12-09',
        inspector: 'Maria Santos',
        result: 'pass',
        score: 92,
        findings: [
          { area: 'PPE Compliance', status: 'pass', notes: 'All workers wearing required PPE' },
          { area: 'Scaffolding', status: 'pass', notes: 'Properly secured and tagged' },
          { area: 'Housekeeping', status: 'minor', notes: 'Some debris to be cleared' }
        ],
        nextInspection: '2025-12-16'
      }
    ];
    
    res.json({ success: true, data: inspections });
  } catch (error) {
    console.error('Get inspections error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inspections' });
  }
});

// ============================================================================
// MATERIALS & RESOURCES
// ============================================================================
router.get('/materials', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const materials = [
      {
        id: 'MAT-001',
        project: 'CONST-001',
        name: 'Ready-mix Concrete',
        unit: 'm³',
        budgeted: 5000,
        delivered: 2250,
        used: 2100,
        remaining: 150,
        supplier: 'AfriSam',
        unitCost: 1850
      },
      {
        id: 'MAT-002',
        project: 'CONST-001',
        name: 'Reinforcement Steel',
        unit: 'tonnes',
        budgeted: 450,
        delivered: 280,
        used: 265,
        remaining: 15,
        supplier: 'ArcelorMittal SA',
        unitCost: 15500
      }
    ];
    
    res.json({ success: true, data: materials });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch materials' });
  }
});

// ============================================================================
// SUBCONTRACTORS
// ============================================================================
router.get('/subcontractors', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const subcontractors = [
      {
        id: 'SUB-001',
        company: 'Elite Electrical (Pty) Ltd',
        cidbGrade: '6EB',
        bbbeeLevel: 2,
        scope: 'Electrical installations',
        project: 'CONST-001',
        contractValue: 8500000,
        progress: 35,
        status: 'active',
        contact: { name: 'Sam Naidoo', phone: '+27 83 555 4444' }
      },
      {
        id: 'SUB-002',
        company: 'Pro Plumbing Services',
        cidbGrade: '5EP',
        bbbeeLevel: 3,
        scope: 'Plumbing and drainage',
        project: 'CONST-001',
        contractValue: 4200000,
        progress: 50,
        status: 'active',
        contact: { name: 'Ahmed Patel', phone: '+27 83 555 5555' }
      }
    ];
    
    res.json({ success: true, data: subcontractors });
  } catch (error) {
    console.error('Get subcontractors error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subcontractors' });
  }
});

// ============================================================================
// QUALITY CONTROL
// ============================================================================
router.get('/quality/checklists', async (req, res) => {
  try {
    const { projectId, phase } = req.query;
    
    const checklists = [
      {
        id: 'QC-001',
        project: 'CONST-001',
        phase: 'Structure',
        name: 'Concrete Pour Checklist',
        items: [
          { item: 'Reinforcement inspection', status: 'pass', inspector: 'QC Engineer', date: '2025-12-10' },
          { item: 'Formwork alignment', status: 'pass', inspector: 'Site Foreman', date: '2025-12-10' },
          { item: 'Slump test', status: 'pass', result: '75mm', inspector: 'Lab Tech', date: '2025-12-10' },
          { item: 'Cube samples taken', status: 'pass', quantity: 6, inspector: 'Lab Tech', date: '2025-12-10' }
        ],
        overallStatus: 'approved',
        approvedBy: 'David Nkosi',
        approvalDate: '2025-12-10'
      }
    ];
    
    res.json({ success: true, data: checklists });
  } catch (error) {
    console.error('Get quality checklists error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch checklists' });
  }
});

// ============================================================================
// PROGRESS CLAIMS
// ============================================================================
router.get('/claims', async (req, res) => {
  try {
    const { projectId, status } = req.query;
    
    const claims = [
      {
        id: 'CLAIM-001',
        project: 'CONST-001',
        claimNumber: 6,
        period: 'November 2025',
        grossValue: 12500000,
        retention: 625000,
        previouslyCertified: 39500000,
        thisCertificate: 11875000,
        status: 'submitted',
        submittedDate: '2025-12-05',
        dueDate: '2025-12-20'
      }
    ];
    
    res.json({ success: true, data: claims });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch claims' });
  }
});

export default router;
