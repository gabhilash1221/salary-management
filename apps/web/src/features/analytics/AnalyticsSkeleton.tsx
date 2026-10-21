import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';

const barWidths = ['w-4/5', 'w-3/5', 'w-2/5', 'w-11/12', 'w-1/2'];
const columnHeights = ['h-16', 'h-28', 'h-40', 'h-24', 'h-12', 'h-32', 'h-20'];

function BarRows() {
  return (
    <ul className="grid gap-3">
      {barWidths.map((width) => (
        <li
          key={width}
          className="grid items-center gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto]"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className={`h-3 ${width}`} />
          <Skeleton className="h-4 w-16" />
        </li>
      ))}
    </ul>
  );
}

export function DistributionSkeleton() {
  return (
    <div className="flex h-48 items-end gap-2">
      {columnHeights.map((height) => (
        <Skeleton
          key={height}
          className={`min-w-0 flex-1 rounded-t ${height}`}
        />
      ))}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-busy="true">
      <span className="sr-only">Loading analytics</span>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Skeleton className="mb-4 h-6 w-36" />
          <BarRows />
        </Card>
        <Card>
          <Skeleton className="mb-4 h-6 w-28" />
          <BarRows />
        </Card>
      </div>
      <Card>
        <Skeleton className="mb-2 h-6 w-44" />
        <Skeleton className="mb-4 h-4 w-72 max-w-full" />
        <DistributionSkeleton />
      </Card>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <Skeleton className="m-2 h-5 w-36" />
        {['a', 'b', 'c', 'd'].map((row) => (
          <div
            key={row}
            className="grid grid-cols-5 gap-3 border-t border-line px-2 py-3"
          >
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
