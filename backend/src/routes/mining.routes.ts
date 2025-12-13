/**
 * MINING INDUSTRY ROUTES - TENANT-AWARE
 * 
 * Mining-specific operations API:
 * - Mining sites & operations
 * - Production tracking
 * - Safety & compliance (MHSA)
 * - Equipment management
 */

import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = express.Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// ============================================================================
// WORKSPACE SUMMARY
// ============================================================================
router.get('/workspace', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    // Get aggregated stats for the workspace
    const [sitesResult, productionResult, incidentsResult, equipmentResult] = await Promise.all([
      pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'operational') as active_sites,
          COUNT(*) as total_sites
        FROM mining_sites WHERE tenant_id = $1 AND is_active = true`,
        [tenantId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(tonnes_extracted), 0) as total_production
        FROM mining_production 
        WHERE tenant_id = $1 
        AND production_date >= CURRENT_DATE - INTERVAL '30 days'`,
        [tenantId]
      ),
      pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'open') as open_incidents,
          MAX(incident_date) as last_incident
        FROM mining_safety_incidents WHERE tenant_id = $1`,
        [tenantId]
      ),
      pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'operational') as operational,
          COUNT(*) as total
        FROM mining_equipment WHERE tenant_id = $1 AND is_active = true`,
        [tenantId]
      )
    ]);

    const lastIncident = incidentsResult.rows[0]?.last_incident;
    const daysSinceLastIncident = lastIncident 
      ? Math.floor((Date.now() - new Date(lastIncident).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const equipmentUtilization = equipmentResult.rows[0]?.total > 0
      ? Math.round((equipmentResult.rows[0].operational / equipmentResult.rows[0].total) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          activeSites: parseInt(sitesResult.rows[0]?.active_sites || '0'),
          totalSites: parseInt(sitesResult.rows[0]?.total_sites || '0'),
          totalProduction: parseFloat(productionResult.rows[0]?.total_production || '0'),
          openIncidents: parseInt(incidentsResult.rows[0]?.open_incidents || '0'),
          daysSinceLastIncident,
          equipmentUtilization,
          operationalEquipment: parseInt(equipmentResult.rows[0]?.operational || '0'),
          totalEquipment: parseInt(equipmentResult.rows[0]?.total || '0')
        }
      }
    });
  } catch (error) {
    console.error('Mining workspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to load workspace' });
  }
});

// ============================================================================
// MINING SITES
// ============================================================================
router.get('/sites', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status } = req.query;

    let query = `
      SELECT id, code, name, location_lat, location_lng, province, address,
        site_type, mineral_type, status, employees_count, daily_capacity,
        mining_rights_number, mining_rights_expiry, safety_rating,
        last_inspection_date, created_at
      FROM mining_sites 
      WHERE tenant_id = $1 AND is_active = true
    `;
    const params: any[] = [tenantId];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    const sites = result.rows.map(site => ({
      id: site.id,
      code: site.code,
      name: site.name,
      location: {
        lat: parseFloat(site.location_lat) || null,
        lng: parseFloat(site.location_lng) || null,
        province: site.province,
        address: site.address
      },
      type: site.site_type,
      mineral: site.mineral_type,
      status: site.status,
      employees: site.employees_count,
      dailyCapacity: parseFloat(site.daily_capacity) || 0,
      miningRights: site.mining_rights_number,
      miningRightsExpiry: site.mining_rights_expiry,
      safetyRating: site.safety_rating,
      lastInspection: site.last_inspection_date
    }));

    res.json({ success: true, data: sites });
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sites' });
  }
});

router.get('/sites/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM mining_sites WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    const site = result.rows[0];
    res.json({
      success: true,
      data: {
        id: site.id,
        code: site.code,
        name: site.name,
        location: {
          lat: parseFloat(site.location_lat) || null,
          lng: parseFloat(site.location_lng) || null,
          province: site.province,
          address: site.address
        },
        type: site.site_type,
        mineral: site.mineral_type,
        status: site.status,
        employees: site.employees_count,
        dailyCapacity: parseFloat(site.daily_capacity) || 0,
        miningRights: {
          number: site.mining_rights_number,
          expiryDate: site.mining_rights_expiry
        },
        environmentalLicense: {
          number: site.environmental_license,
          expiryDate: site.environmental_license_expiry
        },
        safetyRating: site.safety_rating,
        lastInspection: site.last_inspection_date
      }
    });
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch site' });
  }
});

router.post('/sites', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { code, name, locationLat, locationLng, province, address, siteType, mineralType, 
            employeesCount, dailyCapacity, miningRightsNumber, miningRightsExpiry } = req.body;

    const result = await pool.query(
      `INSERT INTO mining_sites 
        (tenant_id, code, name, location_lat, location_lng, province, address, 
         site_type, mineral_type, employees_count, daily_capacity, 
         mining_rights_number, mining_rights_expiry, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'operational')
      RETURNING *`,
      [tenantId, code, name, locationLat, locationLng, province, address, 
       siteType, mineralType, employeesCount, dailyCapacity, miningRightsNumber, miningRightsExpiry]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Mining site created' });
  } catch (error: any) {
    console.error('Create site error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Site code already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create site' });
  }
});

router.put('/sites/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const updates = req.body;

    const result = await pool.query(
      `UPDATE mining_sites SET
        name = COALESCE($3, name),
        status = COALESCE($4, status),
        employees_count = COALESCE($5, employees_count),
        daily_capacity = COALESCE($6, daily_capacity),
        safety_rating = COALESCE($7, safety_rating),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [id, tenantId, updates.name, updates.status, updates.employeesCount, 
       updates.dailyCapacity, updates.safetyRating]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Site updated' });
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ success: false, error: 'Failed to update site' });
  }
});

// ============================================================================
// PRODUCTION TRACKING
// ============================================================================
router.get('/production', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { siteId, startDate, endDate, shift } = req.query;

    let query = `
      SELECT p.*, s.name as site_name, s.code as site_code
      FROM mining_production p
      LEFT JOIN mining_sites s ON p.site_id = s.id
      WHERE p.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (siteId) {
      params.push(siteId);
      query += ` AND p.site_id = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      query += ` AND p.production_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND p.production_date <= $${params.length}`;
    }
    if (shift) {
      params.push(shift);
      query += ` AND p.shift = $${params.length}`;
    }

    query += ' ORDER BY p.production_date DESC, p.shift ASC LIMIT 100';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(r => ({
        id: r.id,
        siteId: r.site_id,
        siteName: r.site_name,
        siteCode: r.site_code,
        date: r.production_date,
        shift: r.shift,
        tonnesExtracted: parseFloat(r.tonnes_extracted) || 0,
        tonnesProcessed: parseFloat(r.tonnes_processed) || 0,
        grade: parseFloat(r.grade) || null,
        recoveryRate: parseFloat(r.recovery_rate) || null,
        notes: r.notes
      }))
    });
  } catch (error) {
    console.error('Get production error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch production' });
  }
});

router.post('/production', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { siteId, productionDate, shift, tonnesExtracted, tonnesProcessed, grade, recoveryRate, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO mining_production 
        (tenant_id, site_id, production_date, shift, tonnes_extracted, tonnes_processed, grade, recovery_rate, notes, recorded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [tenantId, siteId, productionDate, shift, tonnesExtracted, tonnesProcessed, grade, recoveryRate, notes, userId]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Production recorded' });
  } catch (error) {
    console.error('Record production error:', error);
    res.status(500).json({ success: false, error: 'Failed to record production' });
  }
});

// ============================================================================
// SAFETY INCIDENTS
// ============================================================================
router.get('/safety/incidents', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { siteId, status, severity } = req.query;

    let query = `
      SELECT i.*, s.name as site_name
      FROM mining_safety_incidents i
      LEFT JOIN mining_sites s ON i.site_id = s.id
      WHERE i.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (siteId) {
      params.push(siteId);
      query += ` AND i.site_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND i.status = $${params.length}`;
    }
    if (severity) {
      params.push(severity);
      query += ` AND i.severity = $${params.length}`;
    }

    query += ' ORDER BY i.incident_date DESC LIMIT 100';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(r => ({
        id: r.id,
        siteId: r.site_id,
        siteName: r.site_name,
        date: r.incident_date,
        type: r.incident_type,
        severity: r.severity,
        description: r.description,
        locationInSite: r.location_in_site,
        injuriesCount: r.injuries_count,
        fatalitiesCount: r.fatalities_count,
        rootCause: r.root_cause,
        correctiveActions: r.corrective_actions,
        status: r.status
      }))
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch incidents' });
  }
});

router.post('/safety/incidents', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { siteId, incidentDate, incidentType, severity, description, locationInSite, 
            injuriesCount, fatalitiesCount } = req.body;

    const result = await pool.query(
      `INSERT INTO mining_safety_incidents 
        (tenant_id, site_id, incident_date, incident_type, severity, description, 
         location_in_site, injuries_count, fatalities_count, reported_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
      RETURNING *`,
      [tenantId, siteId, incidentDate, incidentType, severity, description, 
       locationInSite, injuriesCount || 0, fatalitiesCount || 0, userId]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Incident reported' });
  } catch (error) {
    console.error('Report incident error:', error);
    res.status(500).json({ success: false, error: 'Failed to report incident' });
  }
});

router.put('/safety/incidents/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const { status, rootCause, correctiveActions } = req.body;

    const result = await pool.query(
      `UPDATE mining_safety_incidents SET
        status = COALESCE($3, status),
        root_cause = COALESCE($4, root_cause),
        corrective_actions = COALESCE($5, corrective_actions),
        closed_at = CASE WHEN $3 = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [id, tenantId, status, rootCause, correctiveActions]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Incident updated' });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ success: false, error: 'Failed to update incident' });
  }
});

// ============================================================================
// EQUIPMENT
// ============================================================================
router.get('/equipment', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { siteId, status, type } = req.query;

    let query = `
      SELECT e.*, s.name as site_name
      FROM mining_equipment e
      LEFT JOIN mining_sites s ON e.site_id = s.id
      WHERE e.tenant_id = $1 AND e.is_active = true
    `;
    const params: any[] = [tenantId];

    if (siteId) {
      params.push(siteId);
      query += ` AND e.site_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND e.equipment_type = $${params.length}`;
    }

    query += ' ORDER BY e.name ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(e => ({
        id: e.id,
        code: e.code,
        name: e.name,
        type: e.equipment_type,
        siteId: e.site_id,
        siteName: e.site_name,
        manufacturer: e.manufacturer,
        model: e.model,
        serialNumber: e.serial_number,
        status: e.status,
        capacity: parseFloat(e.capacity) || null,
        capacityUnit: e.capacity_unit,
        lastMaintenance: e.last_maintenance_date,
        nextMaintenance: e.next_maintenance_date,
        operatingHours: parseFloat(e.operating_hours) || 0
      }))
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch equipment' });
  }
});

router.post('/equipment', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { code, name, equipmentType, siteId, manufacturer, model, serialNumber, 
            capacity, capacityUnit } = req.body;

    const result = await pool.query(
      `INSERT INTO mining_equipment 
        (tenant_id, code, name, equipment_type, site_id, manufacturer, model, 
         serial_number, capacity, capacity_unit, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'operational')
      RETURNING *`,
      [tenantId, code, name, equipmentType, siteId, manufacturer, model, 
       serialNumber, capacity, capacityUnit]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Equipment added' });
  } catch (error: any) {
    console.error('Add equipment error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Equipment code already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to add equipment' });
  }
});

router.put('/equipment/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const { status, siteId, lastMaintenanceDate, nextMaintenanceDate, operatingHours } = req.body;

    const result = await pool.query(
      `UPDATE mining_equipment SET
        status = COALESCE($3, status),
        site_id = COALESCE($4, site_id),
        last_maintenance_date = COALESCE($5, last_maintenance_date),
        next_maintenance_date = COALESCE($6, next_maintenance_date),
        operating_hours = COALESCE($7, operating_hours)
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [id, tenantId, status, siteId, lastMaintenanceDate, nextMaintenanceDate, operatingHours]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipment not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Equipment updated' });
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ success: false, error: 'Failed to update equipment' });
  }
});

export default router;
