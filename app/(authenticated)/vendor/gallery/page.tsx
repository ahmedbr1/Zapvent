"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import VideoIcon from "@mui/icons-material/VideoLibraryRounded";
import ImageIcon from "@mui/icons-material/ImageRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessIcon from "@mui/icons-material/ExpandLessRounded";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import {
  getMyVendorGallery,
  addVendorGalleryItem,
  updateVendorGalleryItem,
  deleteVendorGalleryItem,
  MediaType,
  GalleryItemCategory,
  type VendorGalleryItem,
} from "@/lib/services/vendor-gallery";
import { formatRelative } from "@/lib/date";
import { SERVER_BASE_URL } from "@/lib/config";

const categoryLabels: Record<GalleryItemCategory, string> = {
  [GalleryItemCategory.PRODUCT]: "Product",
  [GalleryItemCategory.BOOTH]: "Booth",
  [GalleryItemCategory.EVENT]: "Event",
  [GalleryItemCategory.OTHER]: "Other",
};

export default function VendorGalleryPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VendorGalleryItem | null>(
    null
  );

  const galleryQuery = useQuery({
    queryKey: ["vendor-gallery"],
    queryFn: () => getMyVendorGallery(token!),
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const items = useMemo(
    () => galleryQuery.data?.data ?? [],
    [galleryQuery.data?.data]
  );

  // Group items by event
  const groupedItems = useMemo(() => {
    const groups: Record<
      string,
      { eventName: string; items: VendorGalleryItem[] }
    > = {};

    items.forEach((item) => {
      const key = item.eventId || "general";
      const eventName = item.eventName || "General Gallery";

      if (!groups[key]) {
        groups[key] = { eventName, items: [] };
      }
      groups[key].items.push(item);
    });

    // Sort: specific events first (by name), then general at the end
    return Object.entries(groups).sort(([keyA], [keyB]) => {
      if (keyA === "general") return 1;
      if (keyB === "general") return -1;
      return groups[keyA].eventName.localeCompare(groups[keyB].eventName);
    });
  }, [items]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isGroupExpanded = (key: string) => expandedGroups[key] !== false; // Default to expanded

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteVendorGalleryItem(itemId, token!),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Item deleted", { variant: "success" });
        queryClient.invalidateQueries({ queryKey: ["vendor-gallery"] });
      } else {
        enqueueSnackbar(result.message || "Failed to delete", {
          variant: "error",
        });
      }
    },
  });

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight={700}>
          My Gallery
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Add Item
        </Button>
      </Stack>

      {galleryQuery.isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
              <Skeleton
                variant="rectangular"
                height={200}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <Alert severity="info">
          Your gallery is empty. Add photos and videos of your products and past
          booths!
        </Alert>
      ) : (
        <Stack spacing={4}>
          {groupedItems.map(([eventKey, group]) => (
            <Box key={eventKey}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  mb: 2,
                  pb: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6" fontWeight={600}>
                    {group.eventName}
                  </Typography>
                  <Chip
                    label={`${group.items.length} item${group.items.length !== 1 ? "s" : ""}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <IconButton size="small" onClick={() => toggleGroup(eventKey)}>
                  {isGroupExpanded(eventKey) ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </IconButton>
              </Stack>
              <Collapse in={isGroupExpanded(eventKey)}>
                <Grid container spacing={3}>
                  {group.items.map((item) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
                      <GalleryCard
                        item={item}
                        onEdit={() => setEditingItem(item)}
                        onDelete={() => {
                          if (confirm("Delete this item?")) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        deleting={deleteMutation.isPending}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Collapse>
            </Box>
          ))}
        </Stack>
      )}

      {/* Upload Dialog */}
      <UploadGalleryItemDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        token={token!}
        onSuccess={() => {
          setUploadDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ["vendor-gallery"] });
        }}
      />

      {/* Edit Dialog */}
      {editingItem && (
        <EditGalleryItemDialog
          item={editingItem}
          open={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          token={token!}
          onSuccess={() => {
            setEditingItem(null);
            queryClient.invalidateQueries({ queryKey: ["vendor-gallery"] });
          }}
        />
      )}
    </Box>
  );
}

function GalleryCard({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: VendorGalleryItem;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const isVideo = item.mediaType === MediaType.VIDEO;
  const mediaUrl = `${SERVER_BASE_URL}/${item.filePath}`;

  return (
    <Card>
      {isVideo ? (
        <CardMedia
          component="video"
          src={mediaUrl}
          controls
          sx={{ height: 180 }}
        />
      ) : (
        <CardMedia
          component="img"
          src={mediaUrl}
          alt={item.title}
          sx={{ height: 180, objectFit: "cover" }}
        />
      )}
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          {isVideo ? (
            <VideoIcon color="primary" />
          ) : (
            <ImageIcon color="secondary" />
          )}
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {item.title}
          </Typography>
        </Stack>
        {item.description && (
          <Typography variant="body2" color="text.secondary" mb={1} noWrap>
            {item.description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} mb={1}>
          <Chip
            label={categoryLabels[item.category]}
            size="small"
            variant="outlined"
          />
          {item.eventName && <Chip label={item.eventName} size="small" />}
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block">
          Added {formatRelative(item.createdAt)}
        </Typography>
        <Stack direction="row" spacing={1} mt={1}>
          <IconButton size="small" onClick={onEdit}>
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={onDelete}
            disabled={deleting}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

function UploadGalleryItemDialog({
  open,
  onClose,
  token,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventId, setEventId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Fetch vendor's approved bazaar applications
  const applicationsQuery = useQuery({
    queryKey: ["vendor-applications-for-gallery"],
    queryFn: async () => {
      const response = (await import("@/lib/api-client").then((m) =>
        m.apiFetch("/vendors/my-applications", {
          method: "GET",
          token,
        })
      )) as {
        success: boolean;
        data: Array<{ eventId: string; eventName: string; status: string }>;
      };
      // Only return approved applications
      return response.success
        ? response.data.filter((app) => app.status === "approved")
        : [];
    },
    enabled: Boolean(token) && open,
  });

  const approvedBazaars = applicationsQuery.data ?? [];

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("No file selected");
      return addVendorGalleryItem(
        file,
        { title, description, eventId: eventId || undefined },
        token
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Item added!", { variant: "success" });
        onSuccess();
        resetForm();
      } else {
        enqueueSnackbar(result.message || "Upload failed", {
          variant: "error",
        });
      }
    },
    onError: (err: Error) => {
      enqueueSnackbar(err.message || "Upload failed", { variant: "error" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventId("");
    setFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Gallery Item</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
          <FormControl fullWidth>
            <InputLabel>Bazaar / Booth</InputLabel>
            <Select
              value={eventId}
              label="Bazaar / Booth"
              onChange={(e) => setEventId(e.target.value)}
            >
              <MenuItem value="">
                <em>None (General gallery item)</em>
              </MenuItem>
              {approvedBazaars.map((app) => (
                <MenuItem key={app.eventId} value={app.eventId}>
                  {app.eventName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" component="label">
            {file ? file.name : "Select Image or Video"}
            <input
              type="file"
              hidden
              accept="video/*,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => uploadMutation.mutate()}
          disabled={!file || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditGalleryItemDialog({
  item,
  open,
  onClose,
  token,
  onSuccess,
}: {
  item: VendorGalleryItem;
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [category, setCategory] = useState(item.category);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateVendorGalleryItem(item.id, { title, description, category }, token),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Item updated!", { variant: "success" });
        onSuccess();
      } else {
        enqueueSnackbar(result.message || "Update failed", {
          variant: "error",
        });
      }
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Item</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) =>
                setCategory(e.target.value as GalleryItemCategory)
              }
            >
              {Object.entries(categoryLabels).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
