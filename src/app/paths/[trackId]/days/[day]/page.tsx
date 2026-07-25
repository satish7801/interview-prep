import DayContent from "@/components/DayContent";

export default async function DayPage({
  params,
}: {
  params: Promise<{ trackId: string; day: string }>;
}) {
  const { trackId, day } = await params;
  const dayN = Number(day);
  return <DayContent trackId={trackId} dayN={dayN} />;
}
