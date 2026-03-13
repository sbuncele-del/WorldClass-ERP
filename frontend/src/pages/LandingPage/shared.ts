/**
 * SiyaBusa Landing Page — Shared types, animation variants & utilities
 * Used across all landing page components and sub-pages
 */

// ─── Types ───
export interface ModuleFeature {
  title: string;
  description: string;
}

export interface Module {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  businessBenefit: string;
  complianceBenefit: string;
  color: string;
  features: ModuleFeature[];
  keyMetrics: string[];
}

// ─── Animation Variants (Framer Motion) ───
export const fadeInUp = {
  hidden: { opacity: 0.01, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0.01 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

export const scaleIn = {
  hidden: { opacity: 0.01, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

// Need React type for Module interface
import type React from 'react';
