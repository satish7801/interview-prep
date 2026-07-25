import PathOverview from "@/components/PathOverview";

export default async function PathPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  return <PathOverview trackId={trackId} />;
}
