"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardMedia,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseRounded";
import VideoIcon from "@mui/icons-material/VideoLibraryRounded";
import {
  getPublicVendorGallery,
  MediaType,
  GalleryItemCategory,
  type VendorGalleryItem,
} from "@/lib/services/vendor-gallery";
import { SERVER_BASE_URL } from "@/lib/config";

interface VendorGalleryViewProps {
  vendorId: string;
  vendorName?: string;
  eventId?: string; // Filter by specific event/bazaar
  compact?: boolean;
  maxItems?: number;
}

const categoryLabels: Record<GalleryItemCategory, string> = {
  [GalleryItemCategory.PRODUCT]: "Products",
  [GalleryItemCategory.BOOTH]: "Booths",
  [GalleryItemCategory.EVENT]: "Events",
  [GalleryItemCategory.OTHER]: "Other",
};

export function VendorGalleryView({
  vendorId,
  eventId,
  compact = false,
  maxItems,
}: VendorGalleryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    GalleryItemCategory | "all"
  >("all");
  const [selectedItem, setSelectedItem] = useState<VendorGalleryItem | null>(
    null
  );

  const { data, isLoading } = useQuery({
    queryKey: ["public-vendor-gallery", vendorId],
    queryFn: () => getPublicVendorGallery(vendorId),
    enabled: Boolean(vendorId),
  });

  const allItems = data?.data ?? [];

  // Filter by event if specified - only show items tied to this specific event
  let items = eventId
    ? allItems.filter((item) => item.eventId === eventId)
    : allItems;

  // Filter by category
  if (selectedCategory !== "all") {
    items = items.filter((item) => item.category === selectedCategory);
  }

  // Limit items if maxItems specified
  if (maxItems && items.length > maxItems) {
    items = items.slice(0, maxItems);
  }

  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((i) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
            <Skeleton
              variant="rectangular"
              height={120}
              sx={{ borderRadius: 2 }}
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No gallery items to display.
      </Typography>
    );
  }

  // Get unique categories from items
  const availableCategories = [
    ...new Set(allItems.map((item) => item.category)),
  ];

  return (
    <Box>
      {!compact && availableCategories.length > 1 && (
        <Tabs
          value={selectedCategory}
          onChange={(_, v) => setSelectedCategory(v)}
          sx={{ mb: 2 }}
        >
          <Tab value="all" label="All" />
          {availableCategories.map((cat) => (
            <Tab key={cat} value={cat} label={categoryLabels[cat]} />
          ))}
        </Tabs>
      )}

      <Grid container spacing={compact ? 1 : 2}>
        {items.map((item) => (
          <Grid
            size={{
              xs: compact ? 4 : 6,
              sm: compact ? 3 : 4,
              md: compact ? 2 : 3,
            }}
            key={item.id}
          >
            <GalleryItemCard
              item={item}
              compact={compact}
              onClick={() => setSelectedItem(item)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Lightbox Dialog */}
      <Dialog
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedItem && (
          <>
            <DialogTitle>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">{selectedItem.title}</Typography>
                <IconButton onClick={() => setSelectedItem(null)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              {selectedItem.mediaType === MediaType.VIDEO ? (
                <video
                  src={`${SERVER_BASE_URL}/${selectedItem.filePath}`}
                  controls
                  style={{ width: "100%", maxHeight: "70vh" }}
                />
              ) : (
                <Box
                  component="img"
                  src={`${SERVER_BASE_URL}/${selectedItem.filePath}`}
                  alt={selectedItem.title}
                  sx={{
                    width: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                  }}
                />
              )}
              {selectedItem.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  {selectedItem.description}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Chip
                  label={categoryLabels[selectedItem.category]}
                  size="small"
                />
                {selectedItem.eventName && (
                  <Chip
                    label={selectedItem.eventName}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

function GalleryItemCard({
  item,
  compact,
  onClick,
}: {
  item: VendorGalleryItem;
  compact: boolean;
  onClick: () => void;
}) {
  const isVideo = item.mediaType === MediaType.VIDEO;
  const mediaUrl = `${SERVER_BASE_URL}/${item.filePath}`;

  return (
    <Card
      sx={{
        cursor: "pointer",
        position: "relative",
        "&:hover": { opacity: 0.9 },
      }}
      onClick={onClick}
    >
      {isVideo ? (
        <CardMedia
          component="video"
          src={mediaUrl}
          sx={{ height: compact ? 80 : 120, objectFit: "cover" }}
        />
      ) : (
        <CardMedia
          component="img"
          src={mediaUrl}
          alt={item.title}
          sx={{ height: compact ? 80 : 120, objectFit: "cover" }}
        />
      )}
      {isVideo && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            bgcolor: "rgba(0,0,0,0.6)",
            borderRadius: 1,
            p: 0.5,
          }}
        >
          <VideoIcon sx={{ color: "white", fontSize: 16 }} />
        </Box>
      )}
      {!compact && (
        <Box sx={{ p: 1 }}>
          <Typography variant="caption" noWrap>
            {item.title}
          </Typography>
        </Box>
      )}
    </Card>
  );
}

// Dialog wrapper for viewing vendor gallery in a modal
interface VendorGalleryDialogProps {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  eventId?: string;
}

export function VendorGalleryDialog({
  open,
  onClose,
  vendorId,
  vendorName,
  eventId,
}: VendorGalleryDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">{vendorName}&apos;s Gallery</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <VendorGalleryView
          vendorId={vendorId}
          vendorName={vendorName}
          eventId={eventId}
        />
      </DialogContent>
    </Dialog>
  );
}
