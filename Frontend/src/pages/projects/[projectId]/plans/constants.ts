import {
  FileText,
  Layout,
  Stack,
  ChatCircleText,
  Database,
  Rocket,
} from '@phosphor-icons/react';
import { PricingTier } from './types';

export const DEFAULT_PRICING_TIERS: Record<string, PricingTier[]> = {
  'One-Time Purchase': [
    { name: 'Basic', price: '$49', features: ['Core features access', 'Basic support', '1 user license'] },
    { name: 'Pro', price: '$99', features: ['All Basic features', 'Priority support', '5 user licenses', 'Advanced features'] },
    { name: 'Lifetime', price: '$299', features: ['All Pro features', 'Lifetime updates', 'Unlimited users', 'Premium support'] }
  ],
  'Subscription': [
    { name: 'Starter', price: '$9 / month', annual_price: '$89 / year', features: ['Basic features', '1 user', 'Email support'] },
    { name: 'Growth', price: '$29 / month', annual_price: '$279 / year', features: ['All Starter features', '5 users', 'Priority support', 'Analytics'] },
    { name: 'Business', price: '$99 / month', annual_price: '$949 / year', features: ['All Growth features', 'Unlimited users', 'Dedicated support', 'Custom integrations'] }
  ],
  'Freemium': [
    { name: 'Free', price: '$0', features: ['Limited features', '1 project', 'Community support'] },
    { name: 'Plus', price: '$15 / month', annual_price: '$149 / year', features: ['All Free features', '10 projects', 'Priority support', 'Advanced features'] },
    { name: 'Pro', price: '$49 / month', annual_price: '$469 / year', features: ['All Plus features', 'Unlimited projects', 'Premium support', 'API access'] }
  ],
  'Pay-Per-Use / Credits': [
    { name: 'Starter Pack', price: '$10 / 1k credits', features: ['1,000 credits', 'Basic usage', 'No expiry'] },
    { name: 'Standard Pack', price: '$49 / 10k credits', features: ['10,000 credits', '20% bonus credits', 'Priority processing'] },
    { name: 'Enterprise Pack', price: '$199 / 50k credits', features: ['50,000 credits', '50% bonus credits', 'Dedicated support', 'Custom limits'] }
  ],
  'Pay-Per-User': [
    { name: 'Team', price: '$5 / user / month', features: ['Per user billing', 'Basic features', 'Email support'] },
    { name: 'Business', price: '$15 / user / month', features: ['All Team features', 'Advanced features', 'Priority support'] },
    { name: 'Enterprise', price: '$35 / user / month', features: ['All Business features', 'SSO', 'Dedicated support', 'Custom limits'] }
  ],
  'In-App Purchases': [
    { name: 'Remove Ads', price: '$4.99 one-time', features: ['Ad-free experience', 'Permanent unlock'] },
    { name: 'Theme Pack', price: '$2.99 one-time', features: ['5 premium themes', 'Dark mode variants'] },
    { name: 'Pro Bundle', price: '$9.99 / month', features: ['All premium features', 'Early access', 'Exclusive content'] }
  ]
};

export const DOC_INFO: Record<string, { label: string; icon: any; summary: string; color: string }> = {
  PRD: {
    label: 'Product Requirements',
    icon: FileText,
    summary: 'Core goals, target audience, user stories, and success metrics for the initiative.',
    color: 'blue'
  },
  APP_FLOW: {
    label: 'App Flow',
    icon: Layout,
    summary: 'Detailed navigation mapping and state transitions across all application screens.',
    color: 'purple'
  },
  TECH_STACK: {
    label: 'Tech Stack',
    icon: Stack,
    summary: 'Recommended frontend, backend, database, and infrastructure components.',
    color: 'green'
  },
  FRONTEND_GUIDELINES: {
    label: 'Frontend Guidelines',
    icon: ChatCircleText,
    summary: 'Component architecture, state management, styling patterns, and UI/UX standards.',
    color: 'orange'
  },
  BACKEND_SCHEMA: {
    label: 'Backend Schema',
    icon: Database,
    summary: 'ER diagrams, API endpoints, authentication logic, and data relationship models.',
    color: 'red'
  },
  IMPLEMENTATION_PLAN: {
    label: 'Implementation Plan',
    icon: Rocket,
    summary: 'Phased development roadmap with milestones, tasks, and resource allocation.',
    color: 'cyan'
  }
};

// Constants for Blueprint Canvas
export const GRID_SIZE = 20;
export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 160;
