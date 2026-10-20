export function ErrorState({ message }: { message: string }) {
  return (
    <p className="text-danger" role="alert">
      {message}
    </p>
  );
}
