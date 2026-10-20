export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return <p className="text-muted">{message}</p>;
}
