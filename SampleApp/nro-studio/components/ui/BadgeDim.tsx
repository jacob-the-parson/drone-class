// BadgeDim — THE dimension color language (Jacob's law, 2026-07-26):
//   2D = green (emerald) · 3D = orange (Blender heritage).
// Use BadgeDim for the pill, DIM_TEXT for inline colored text, wherever a
// 2D/3D marker appears (breadcrumb, dashboard cards, vault, modals…).
'use client';
import type { AppDimension } from '@/lib/registry.types';

export const DIM_TEXT: Record<AppDimension, string> = {
  '2d': 'text-emerald-600 dark:text-emerald-400',
  '3d': 'text-orange-600 dark:text-orange-400',
};

const DIM_BADGE: Record<AppDimension, string> = {
  '2d': 'border-emerald-300/60 bg-emerald-50/60 text-emerald-600 dark:border-emerald-700/50 dark:bg-emerald-900/30 dark:text-emerald-400',
  '3d': 'border-orange-300/60 bg-orange-50/60 text-orange-600 dark:border-orange-700/50 dark:bg-orange-900/30 dark:text-orange-400',
};

export function BadgeDim({ dim, className = '' }: { dim: AppDimension; className?: string }) {
  return (
    <span
      className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider ${DIM_BADGE[dim]} ${className}`}
    >
      {dim}
    </span>
  );
}
