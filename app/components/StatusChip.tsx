import { Chip, ChipProps } from "@mui/material";
import { UserStatus, VendorStatus } from "@/lib/types";

interface StatusChipProps {
  status: UserStatus | VendorStatus | string;
  size?: ChipProps["size"];
}

export default function StatusChip({
  status,
  size = "small",
}: StatusChipProps) {
  const getStatusColor = (status: string): ChipProps["color"] => {
    switch (status.toLowerCase()) {
      case "active":
      case "approved":
        return "success";
      case "pending":
        return "warning";
      case "blocked":
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Chip
      label={status}
      color={getStatusColor(status)}
      size={size}
      sx={{ fontWeight: 500 }}
    />
  );
}
