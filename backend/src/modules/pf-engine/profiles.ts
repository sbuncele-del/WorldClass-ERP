/**
 * ProjectFlow PM Engine — project profiles (Phase 7)
 *
 * Config, not forks: one universal engine, four bundles of {terminology,
 * starter WBS, defaults}. Construction is the flagship (deepest domain
 * layer); general/professional_services/events derive as lighter subsets.
 * This is data, not code branching - every profile runs through the exact
 * same WBS/CPM/EVA/governance/closure engine built in Phases 1-6.
 */

export type PfProfileId = 'construction' | 'general' | 'professional_services' | 'events';

export interface PfProfile {
  id: PfProfileId;
  name: string;
  description: string;
  /** Generic PMBOK term -> profile-specific term. UI layer, not schema. */
  terminology: Record<string, string>;
  /** Seeded as top-level WBS elements when a profile is first applied to an empty WBS. */
  starterWbs: string[];
  defaults: { productivityFactor: number; showCidbField: boolean };
}

export const PF_PROFILES: Record<PfProfileId, PfProfile> = {
  construction: {
    id: 'construction',
    name: 'Construction & Engineering',
    description: 'The flagship profile — deepest terminology and defaults, built for CIDB-graded contractors and engineering works.',
    terminology: {
      wbsElement: 'Trade Package', activity: 'Task', resource: 'Crew / Plant',
      riskRegister: 'Site Risk Register', stakeholder: 'Stakeholder',
      procurementItem: 'Materials & Subcontracts', changeRequest: 'Variation Order',
    },
    starterWbs: ['Site Establishment', 'Substructure', 'Superstructure', 'Services & Finishes', 'Handover'],
    defaults: { productivityFactor: 0.85, showCidbField: true },
  },
  general: {
    id: 'general',
    name: 'General Project Management',
    description: 'The PMBOK baseline — lightest terminology layer, suited to any internal or client project without a specialised domain.',
    terminology: {
      wbsElement: 'Work Package', activity: 'Task', resource: 'Resource',
      riskRegister: 'Risk Register', stakeholder: 'Stakeholder',
      procurementItem: 'Procurement Item', changeRequest: 'Change Request',
    },
    starterWbs: ['Initiation', 'Planning', 'Execution', 'Closeout'],
    defaults: { productivityFactor: 1.0, showCidbField: false },
  },
  professional_services: {
    id: 'professional_services',
    name: 'Professional Services',
    description: 'A lighter subset for consulting/advisory engagements — phases replace trades, deliverables replace materials.',
    terminology: {
      wbsElement: 'Workstream', activity: 'Deliverable', resource: 'Consultant',
      riskRegister: 'Risk Register', stakeholder: 'Client Stakeholder',
      procurementItem: 'Subcontracted Deliverable', changeRequest: 'Scope Change',
    },
    starterWbs: ['Discovery', 'Design', 'Delivery', 'Review & Handover'],
    defaults: { productivityFactor: 1.0, showCidbField: false },
  },
  events: {
    id: 'events',
    name: 'Events & Activations',
    description: 'A lighter subset for time-boxed events — a compressed lifecycle around a single fixed date.',
    terminology: {
      wbsElement: 'Workstream', activity: 'Run-sheet Item', resource: 'Crew / Vendor',
      riskRegister: 'Risk Register', stakeholder: 'Stakeholder',
      procurementItem: 'Supplier Booking', changeRequest: 'Change Request',
    },
    starterWbs: ['Pre-Event', 'Event Day', 'Post-Event'],
    defaults: { productivityFactor: 1.0, showCidbField: false },
  },
};

export const isPfProfileId = (value: string): value is PfProfileId =>
  Object.prototype.hasOwnProperty.call(PF_PROFILES, value);
