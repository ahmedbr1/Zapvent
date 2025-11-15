import WorkshopManager from "@/components/workshops/WorkshopManager";

interface ProfessorWorkshopDetailsPageProps {
  params: { workshopId: string };
}

export default function ProfessorWorkshopDetailsPage({
  params,
}: ProfessorWorkshopDetailsPageProps) {
  return (
    <WorkshopManager
      variant="professor"
      viewMode="detail"
      focusWorkshopId={params.workshopId}
    />
  );
}

