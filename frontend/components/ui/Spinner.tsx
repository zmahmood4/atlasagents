export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-[var(--accent-blue)] border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}
