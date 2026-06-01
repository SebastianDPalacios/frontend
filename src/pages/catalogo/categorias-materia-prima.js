import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
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
    return "MP";
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

const RawMaterialCategoriesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await catalogService.getRawMaterialCategories({ onlyActive: 1 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el catalogo de categorias de materia prima");
          return;
        }
        setItems(normalizeList(response.data));
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Error de red al cargar categorias de materia prima"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

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
    <FlowPageLayout title="Categorias de materia prima" subtitle="Listado operativo de categorias de materia prima">
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
        <Button component={Link} href="/catalogo/nueva-categoria-materia-prima" variant="contained" color="secondary" sx={{ minHeight: 46, px: 3 }}>
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
                      <InventoryOutlinedIcon fontSize="small" />
                      <Typography variant="caption">Clasificacion para insumos y materias primas</Typography>
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
          No hay categorias de materia prima para mostrar.
        </Alert>
      ) : null}
    </FlowPageLayout>
  );
};

export default RawMaterialCategoriesPage;
