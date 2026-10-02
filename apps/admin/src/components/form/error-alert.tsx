export function ErrorAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/25 bg-danger/8 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}
