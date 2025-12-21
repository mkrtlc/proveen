import React from 'react';

// Base skeleton component with shimmer animation
const SkeletonBase: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

// Stat Card Skeleton
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl p-5 border border-gray-200/60 shadow-sm">
    <SkeletonBase className="h-4 w-32 mb-4" />
    <div className="flex items-baseline gap-2 mb-2">
      <SkeletonBase className="h-8 w-16" />
      <SkeletonBase className="h-4 w-12" />
    </div>
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 6 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-4 px-6">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </td>
    ))}
  </tr>
);

// Card Grid Skeleton (for creatives/reviews)
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <SkeletonBase className="aspect-[4/5] w-full" />
        <div className="p-3">
          <SkeletonBase className="h-4 w-3/4 mb-2" />
          <SkeletonBase className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// Review Card Skeleton
export const ReviewCardSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-xl border border-gray-100">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <SkeletonBase className="w-10 h-10 rounded-full" />
        <div>
          <SkeletonBase className="h-4 w-24 mb-2" />
          <SkeletonBase className="h-3 w-32" />
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBase key={i} className="w-4 h-4 rounded" />
        ))}
      </div>
    </div>
    <SkeletonBase className="h-4 w-full mb-2" />
    <SkeletonBase className="h-4 w-5/6" />
  </div>
);

// Chart Skeleton
export const ChartSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
    <div className="mb-6">
      <SkeletonBase className="h-6 w-48 mb-2" />
      <SkeletonBase className="h-4 w-64" />
    </div>
    <div className="h-[300px] w-full">
      <SkeletonBase className="h-full w-full" />
    </div>
  </div>
);

// Activity Item Skeleton
export const ActivityItemSkeleton: React.FC = () => (
  <div className="relative flex gap-3">
    <SkeletonBase className="size-8 rounded-full shrink-0" />
    <div className="flex-1">
      <SkeletonBase className="h-4 w-full mb-2" />
      <SkeletonBase className="h-3 w-32" />
    </div>
  </div>
);

// Source Card Skeleton
export const SourceCardSkeleton: React.FC = () => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <SkeletonBase className="w-6 h-6 rounded" />
        <SkeletonBase className="h-4 w-32" />
      </div>
      <SkeletonBase className="w-5 h-5 rounded" />
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBase className="h-3 w-16" />
        <SkeletonBase className="h-4 w-8" />
      </div>
      <div className="flex items-center justify-between">
        <SkeletonBase className="h-3 w-20" />
        <SkeletonBase className="h-4 w-24" />
      </div>
      <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
        <SkeletonBase className="h-3 w-32" />
        <SkeletonBase className="w-10 h-5 rounded-full" />
      </div>
    </div>
  </div>
);

// Text Line Skeleton
export const TextLineSkeleton: React.FC<{ width?: string; height?: string }> = ({ 
  width = '100%', 
  height = '1rem' 
}) => (
  <SkeletonBase className="rounded" style={{ width, height }} />
);

// Sidebar Navigation Item Skeleton
export const SidebarNavSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
    <SkeletonBase className="w-6 h-6 rounded" />
    <SkeletonBase className="h-4 w-20" />
  </div>
);

// Custom skeleton for any element
export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ 
  className = '', 
  style 
}) => (
  <SkeletonBase className={className} style={style} />
);

export default SkeletonBase;
