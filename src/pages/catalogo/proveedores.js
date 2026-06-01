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
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
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
    return "PR";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const isSupplierActive = (supplier) => {
  const status = String(supplier.status ?? supplier.is_active ?? supplier.active ?? "ACTIVE").toUpperCase();
  return status === "ACTIVE" || status === "1" || status === "TRUE";
};

const SuppliersPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await catalogService.getSuppliers({ page: 1, pageSize: 20 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el catalogo de proveedores");
          return;
        }
        setItems(normalizeList(response.data));
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Error de red al cargar proveedores"));
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
      const values = [item.name, item.tax_id, item.email, item.phone, item.contact_name, item.address, item.id].filter(Boolean);
      return values.some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, search]);

  return (
    <FlowPageLayout title="Proveedores" subtitle="Listado operativo de proveedores">
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between", mb: 3 }}
      >
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            borderRadius: 3,
            p: { xs: 2, md: 2.5 },
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
            <TextField
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              label="Buscar"
              placeholder="Nombre, NIT, correo o contacto"
            />
            <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
              <Chip label={`${items.length} registrados`} variant="outlined" />
              <Chip label={`${filteredItems.length} visibles`} color="info" variant="outlined" />
            </Stack>
          </Stack>
        </Paper>
        <Button component={Link} href="/catalogo/nuevo-proveedor" variant="contained" color="secondary" sx={{ minHeight: 46, px: 3 }}>
          Nuevo proveedor
        </Button>
      </Stack>

      {loading ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Cargando proveedores...
          </Typography>
        </Stack>
      ) : null}

      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

      {!loading ? (
        <Grid container spacing={2.5}>
          {filteredItems.map((supplier, index) => {
            const active = isSupplierActive(supplier);

            return (
              <Grid item xs={12} md={6} xl={4} key={supplier.id ?? supplier.tax_id ?? index}>
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
                          {getInitials(supplier.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, wordBreak: "break-word" }}>
                            {supplier.name || "Sin nombre"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {supplier.tax_id || `Registro #${supplier.id || index + 1}`}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip
                        label={active ? "Activo" : "Inactivo"}
                        size="small"
                        color={active ? "success" : "default"}
                        variant={active ? "filled" : "outlined"}
                        sx={{ fontWeight: 800 }}
                      />
                    </Stack>

                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Contacto
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>{supplier.contact_name || "Sin contacto"}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Telefono
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>{supplier.phone || "Sin telefono"}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Correo
                        </Typography>
                        <Typography sx={{ fontWeight: 800, wordBreak: "break-word" }}>
                          {supplier.email || "Sin correo"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Direccion
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>{supplier.address || "Sin direccion"}</Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ flex: 1 }} />
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                      <StorefrontOutlinedIcon fontSize="small" />
                      <Typography variant="caption">Proveedor de insumos y compras</Typography>
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
          No hay proveedores para mostrar.
        </Alert>
      ) : null}
    </FlowPageLayout>
  );
};

export default SuppliersPage;
