import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-[#E5E7EB] rounded-md",
        className
      )}
      {...props}
    />
  );
}

export function RoomCardSkeleton() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-sm flex flex-col">
      <Skeleton className="w-full h-52 rounded-none" />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-20 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5, rows = 1 }: { cols?: number; rows?: number }) {
  return (
    <div className="w-full divide-y divide-[#F3F4F6]">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-3.5 px-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

