import WorkshopManager from "@/components/workshops/WorkshopManager";

interface WorkshopDetailsPageProps {
  params: { workshopId: string };
}

export default function EventsOfficeWorkshopDetailsPage({
  params,
}: WorkshopDetailsPageProps) {
  return (
    <WorkshopManager
      variant="events-office"
      viewMode="detail"
      focusWorkshopId={params.workshopId}
    />
  );
}

