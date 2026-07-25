"use client";

export default function ContentStatus({
  loading,
  error,
  label = "content",
}: {
  loading: boolean;
  error: string | null;
  label?: string;
}) {
  if (loading) {
    return <div className="page-loading">Loading {label}…</div>;
  }
  if (error) {
    return (
      <div className="page-loading error">
        Could not load {label}. {error}
      </div>
    );
  }
  return null;
}
