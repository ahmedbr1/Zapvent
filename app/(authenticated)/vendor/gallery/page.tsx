"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
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
import { API_BASE_URL } from "@/lib/config";

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
  const [filterCategory, setFilterCategory] = useState<
    GalleryItemCategory | "all"
  >("all");

  const galleryQuery = useQuery({
    queryKey: ["vendor-gallery", token],
    queryFn: () => getMyVendorGallery(token!),
    enabled: Boolean(token),
  });

  const items = galleryQuery.data?.data ?? [];
  const filteredItems =
    filterCategory === "all"
      ? items
      : items.filter((item) => item.category === filterCategory);

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

      {/* Filter */}
      <Stack direction="row" spacing={1} mb={3}>
        <Chip
          label="All"
          onClick={() => setFilterCategory("all")}
          color={filterCategory === "all" ? "primary" : "default"}
          variant={filterCategory === "all" ? "filled" : "outlined"}
        />
        {Object.entries(categoryLabels).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            onClick={() => setFilterCategory(key as GalleryItemCategory)}
            color={filterCategory === key ? "primary" : "default"}
            variant={filterCategory === key ? "filled" : "outlined"}
          />
        ))}
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
      ) : filteredItems.length === 0 ? (
        <Alert severity="info">
          {filterCategory === "all"
            ? "Your gallery is empty. Add photos and videos of your products and past booths!"
            : `No items in the "${categoryLabels[filterCategory as GalleryItemCategory]}" category.`}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredItems.map((item) => (
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
  const mediaUrl = `${API_BASE_URL}/${item.filePath}`;

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
  const [category, setCategory] = useState<GalleryItemCategory>(
    GalleryItemCategory.PRODUCT
  );
  const [eventId, setEventId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("No file selected");
      return addVendorGalleryItem(
        file,
        { title, description, category, eventId: eventId || undefined },
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
    setCategory(GalleryItemCategory.PRODUCT);
    setEventId("");
    setFile(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
          <TextField
            label="Event ID (optional)"
            placeholder="Link to a specific event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            fullWidth
          />
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
        <Button onClick={onClose}>Cancel</Button>
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
