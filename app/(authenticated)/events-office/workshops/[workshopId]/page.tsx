import WorkshopManager from "@/components/workshops/WorkshopManager";

interface WorkshopDetailsPageProps {
  params: Promise<{ workshopId: string }>;
}

export default async function EventsOfficeWorkshopDetailsPage({
  params,
}: WorkshopDetailsPageProps) {
  const { workshopId } = await params;
  return (
    <WorkshopManager
      variant="events-office"
      viewMode="detail"
      focusWorkshopId={workshopId}
    />
  );
}
