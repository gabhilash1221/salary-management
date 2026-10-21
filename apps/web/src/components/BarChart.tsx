type ChartItem = {
  key: string;
  label: string;
  value: number;
  display: string;
};

export function BarChart({ items }: { items: ChartItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li
          key={item.key}
          className="grid items-center gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto]"
        >
          <span className="truncate text-sm" title={item.label}>
            {item.label}
          </span>
          <div
            className="h-3 overflow-hidden rounded-full bg-canvas"
            role="img"
            aria-label={`${item.label}: ${item.display}`}
          >
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted tabular-nums">
            {item.display}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({ items }: { items: ChartItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const first = items[0]?.label;
  const last = items.at(-1)?.label;
  return (
    <div>
      <div className="flex h-48 items-end gap-px">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex h-full min-w-0 flex-1 items-end"
            title={item.display}
          >
            <div
              className="w-full rounded-t bg-brand"
              style={{
                height: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%`,
              }}
              role="img"
              aria-label={item.display}
            />
          </div>
        ))}
      </div>
      {first && last ? (
        <div className="mt-2 flex justify-between gap-3 text-xs text-muted">
          <span>{first}</span>
          <span>{last}</span>
        </div>
      ) : null}
    </div>
  );
}
