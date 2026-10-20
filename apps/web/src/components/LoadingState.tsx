export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return <p className="loading">{message}</p>;
}
