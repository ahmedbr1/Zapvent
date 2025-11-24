import WorkshopManager from "@/components/workshops/WorkshopManager";

interface ProfessorWorkshopDetailsPageProps {
  params: Promise<{ workshopId: string }>;
}

export default async function ProfessorWorkshopDetailsPage({
  params,
}: ProfessorWorkshopDetailsPageProps) {
  const { workshopId } = await params;
  return (
    <WorkshopManager
      variant="professor"
      viewMode="detail"
      focusWorkshopId={workshopId}
    />
  );
}
