import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
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
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
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

const formatPercent = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  }).format(number);
};

const isTaxActive = (taxRate) => {
  const status = String(taxRate.is_active ?? taxRate.active ?? "1").toUpperCase();
  return status === "1" || status === "TRUE" || status === "ACTIVE";
};

const TaxRatesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await catalogService.getTaxRates({ onlyActive: 1 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el catalogo de tasas de impuesto");
          return;
        }
        setItems(normalizeList(response.data));
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Error de red al cargar tasas de impuesto"));
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
      const values = [item.name, item.code, item.rate_percent, item.id].filter(Boolean);
      return values.some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, search]);

  return (
    <FlowPageLayout title="Tasas de impuesto" subtitle="Listado operativo de tasas de impuesto">
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
              placeholder="Nombre, codigo o porcentaje"
            />
            <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
              <Chip label={`${items.length} registradas`} variant="outlined" />
              <Chip label={`${filteredItems.length} visibles`} color="info" variant="outlined" />
            </Stack>
          </Stack>
        </Paper>
        <Button component={Link} href="/catalogo/nueva-tasa-impuesto" variant="contained" color="secondary" sx={{ minHeight: 46, px: 3 }}>
          Nueva tasa
        </Button>
      </Stack>

      {loading ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Cargando tasas de impuesto...
          </Typography>
        </Stack>
      ) : null}

      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

      {!loading ? (
        <Grid container spacing={2.5}>
          {filteredItems.map((taxRate, index) => {
            const active = isTaxActive(taxRate);

            return (
              <Grid item xs={12} sm={6} lg={4} key={taxRate.id ?? taxRate.code ?? index}>
                <Paper
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    overflow: "hidden",
                    transition: "border-color 160ms ease, box-shadow 160ms ease",
                    "&:hover": {
                      borderColor: "secondary.main",
                      boxShadow: "0 14px 32px rgba(13, 21, 37, 0.08)",
                    },
                  }}
                >
                  <Stack spacing={2} sx={{ height: "100%", p: 2 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: "secondary.main",
                          color: "secondary.contrastText",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <PercentOutlinedIcon />
                      </Box>
                      <Chip
                        label={active ? "Activa" : "Inactiva"}
                        size="small"
                        color={active ? "success" : "default"}
                        variant={active ? "filled" : "outlined"}
                        sx={{ fontWeight: 800 }}
                      />
                    </Stack>

                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
                        {formatPercent(taxRate.rate_percent)}%
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, mt: 1, wordBreak: "break-word" }}>
                        {taxRate.name || "Sin nombre"}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }} />

                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                      <Chip label={taxRate.code || "Sin codigo"} variant="outlined" size="small" sx={{ fontWeight: 800 }} />
                      <Chip label={`Registro #${taxRate.id || index + 1}`} variant="outlined" size="small" />
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
          No hay tasas de impuesto para mostrar.
        </Alert>
      ) : null}
    </FlowPageLayout>
  );
};

export default TaxRatesPage;
