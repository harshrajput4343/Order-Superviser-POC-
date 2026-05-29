/**
 * StatCard — Dashboard metric card with coloured background variant.
 *
 * Extracted from page.tsx (where it lived inline as a page-level function)
 * into a reusable component. The old `color` prop names (primary, accent,
 * green, yellow, purple) are mapped to the new design token classes so that
 * the call-site in page.tsx still works without changes to the prop API.
 */

import React from 'react';

type Variant = 'blue' | 'green' | 'amber' | 'violet' | 'rose'
             | 'primary' | 'accent' | 'yellow' | 'purple';  // legacy aliases

const VARIANT_CLASSES: Record<string, { card: string; icon: string }> = {
  blue:    { card: 'stat-card-blue',   icon: 'text-blue-600'   },
  green:   { card: 'stat-card-green',  icon: 'text-green-600'  },
  amber:   { card: 'stat-card-amber',  icon: 'text-amber-600'  },
  violet:  { card: 'stat-card-violet', icon: 'text-violet-600' },
  rose:    { card: 'stat-card-rose',   icon: 'text-rose-600'   },
  // Legacy aliases from old page.tsx colorMap
  primary: { card: 'stat-card-blue',   icon: 'text-blue-600'   },
  accent:  { card: 'stat-card-green',  icon: 'text-green-600'  },
  yellow:  { card: 'stat-card-amber',  icon: 'text-amber-600'  },
  purple:  { card: 'stat-card-violet', icon: 'text-violet-600' },
};

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: Variant | string;
}

export function StatCard({ label, value, icon, color = 'blue' }: StatCardProps) {
  const { card, icon: iconColor } = VARIANT_CLASSES[color] ?? VARIANT_CLASSES.blue;

  return (
    <div className={`glass-card ${card} p-5 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-2xl ${iconColor}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-muted)' }}>
        {label}
      </div>
    </div>
  );
}
