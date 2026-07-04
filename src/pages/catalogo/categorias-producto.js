import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import FlowPageLayout from "views/modules/FlowPageLayout";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
};

const getInitials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "CP";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const isCategoryActive = (category) => {
  const status = String(category.is_active ?? category.active ?? "1").toUpperCase();
  return status === "1" || status === "TRUE" || status === "ACTIVE";
};

const ProductCategoriesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    isActive: "1",
  });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await catalogService.getProductCategories({ onlyActive: 0 });
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar el catalogo de categorias de producto");
        return;
      }
      setItems(normalizeList(response.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Error de red al cargar categorias de producto"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openEditDialog = (category) => {
    setEditCategory(category);
    setEditForm({
      name: category.name || "",
      description: category.description || "",
      isActive: isCategoryActive(category) ? "1" : "0",
    });
    setEditOpen(true);
  };

  const closeEditDialog = () => {
    if (editSaving) {
      return;
    }
    setEditOpen(false);
    setEditCategory(null);
  };

  const saveEdit = async () => {
    const name = editForm.name.trim();
    if (!editCategory?.id || name.length < 2) {
      toast.error("Indica un nombre de categoria valido");
      return;
    }

    setEditSaving(true);
    try {
      const response = await catalogService.updateProductCategory(editCategory.id, {
        p_name: name,
        p_description: editForm.description.trim() || null,
        p_is_active: Number(editForm.isActive),
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo actualizar la categoria");
        return;
      }

      toast.success("Categoria actualizada");
      setEditOpen(false);
      setEditCategory(null);
      await loadCategories();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Error de red al actualizar categoria"));
    } finally {
      setEditSaving(false);
    }
  };

  const toggleCategoryStatus = async (category) => {
    const nextActive = isCategoryActive(category) ? 0 : 1;
    try {
      const response = await catalogService.updateProductCategory(category.id, {
        p_name: category.name,
        p_description: category.description || null,
        p_is_active: nextActive,
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo actualizar la categoria");
        return;
      }

      toast.success(nextActive ? "Categoria activada" : "Categoria desactivada");
      await loadCategories();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Error de red al actualizar categoria"));
    }
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const values = [item.name, item.description, item.id].filter(Boolean);
      return values.some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, search]);

  return (
    <FlowPageLayout title="Categorias de producto" subtitle="Listado operativo de categorias de producto">
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between", mb: 3 }}
      >
        <Paper variant="outlined" sx={{ flex: 1, borderRadius: 3, p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
            <TextField
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              label="Buscar"
              placeholder="Nombre o descripcion"
            />
            <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
              <Chip label={`${items.length} registradas`} variant="outlined" />
              <Chip label={`${filteredItems.length} visibles`} color="info" variant="outlined" />
            </Stack>
          </Stack>
        </Paper>
        <Button component={Link} href="/catalogo/nueva-categoria-producto" variant="contained" color="secondary" sx={{ minHeight: 46, px: 3 }}>
          Nueva categoria
        </Button>
      </Stack>

      {loading ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Cargando categorias...
          </Typography>
        </Stack>
      ) : null}

      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

      {!loading ? (
        <Grid container spacing={2.5}>
          {filteredItems.map((category, index) => {
            const active = isCategoryActive(category);

            return (
              <Grid item xs={12} sm={6} lg={4} key={category.id ?? category.name ?? index}>
                <Paper
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    p: 2,
                    transition: "border-color 160ms ease, box-shadow 160ms ease",
                    "&:hover": {
                      borderColor: "secondary.main",
                      boxShadow: "0 14px 32px rgba(13, 21, 37, 0.08)",
                    },
                  }}
                >
                  <Stack spacing={2} sx={{ height: "100%" }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                      <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
                        <Avatar
                          sx={{
                            width: 44,
                            height: 44,
                            bgcolor: "secondary.light",
                            color: "secondary.contrastText",
                            fontWeight: 900,
                          }}
                        >
                          {getInitials(category.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, wordBreak: "break-word" }}>
                            {category.name || "Sin nombre"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Registro #{category.id || index + 1}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip
                        label={active ? "Activa" : "Inactiva"}
                        size="small"
                        color={active ? "success" : "default"}
                        variant={active ? "filled" : "outlined"}
                        sx={{ fontWeight: 800 }}
                      />
                    </Stack>

                    <Box
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        bgcolor: "background.default",
                        p: 1.5,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Descripcion
                      </Typography>
                      <Typography sx={{ fontWeight: 700, mt: 0.5, wordBreak: "break-word" }}>
                        {category.description || "Sin descripcion registrada"}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }} />
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                      <CategoryOutlinedIcon fontSize="small" />
                      <Typography variant="caption">Clasificacion para productos terminados</Typography>
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        onClick={() => openEditDialog(category)}
                      >
                        Editar categoria
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        color={active ? "error" : "success"}
                        onClick={() => toggleCategoryStatus(category)}
                      >
                        {active ? "Desactivar" : "Activar"}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      ) : null}

      {!loading && filteredItems.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No hay categorias de producto para mostrar.
        </Alert>
      ) : null}

      <Dialog open={editOpen} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editCategory ? `Editar categoria #${editCategory.id}` : "Editar categoria"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Nombre"
              value={editForm.name}
              onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
              inputProps={{ maxLength: 120 }}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Descripcion"
              value={editForm.description}
              onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
              inputProps={{ maxLength: 255 }}
            />
            <TextField
              select
              fullWidth
              label="Estado"
              value={editForm.isActive}
              onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.value }))}
            >
              <MenuItem value="1">Activa</MenuItem>
              <MenuItem value="0">Inactiva</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" color="secondary" onClick={closeEditDialog} disabled={editSaving}>
            Cancelar
          </Button>
          <Button variant="contained" color="secondary" onClick={saveEdit} disabled={editSaving}>
            {editSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default ProductCategoriesPage;
