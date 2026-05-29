import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Box, Button, Chip, CircularProgress, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import AppCard from "@core/components/ui/AppCard";

const formatCurrency = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const getDisplayName = (item, nameField) => item[nameField] || item.name || item.description || "Sin nombre";

const CatalogListView = ({
  title,
  subtitle,
  loading,
  error,
  items = [],
  itemKey = "id",
  nameField = "name",
  createHref,
  createLabel = "Nuevo registro",
  searchPlaceholder = "Buscar",
  typeLabel = "Registro",
  emptyMessage = "No hay registros para mostrar.",
}) => {
  const [search, setSearch] = useState("");
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const values = [getDisplayName(item, nameField), item.sku, item.description, item.code, item.id].filter(Boolean);
      return values.some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, nameField, search]);

  if (loading) {
    return <CircularProgress size={28} />;
  }

  return (
    <>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ alignItems: { xs: "stretch", md: "flex-end" }, justifyContent: "space-between", mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: 24, sm: 30 }, fontWeight: 900 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        {createHref ? (
          <Button component={Link} href={createHref} variant="contained" color="secondary" sx={{ minHeight: 46, px: 3 }}>
            {createLabel}
          </Button>
        ) : null}
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 2.5 }, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              label="Buscar"
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", md: "flex-end" }} flexWrap="wrap">
              <Chip label={`${items.length} registrados`} variant="outlined" />
              <Chip label={`${filteredItems.length} visibles`} color="info" variant="outlined" />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={{ xs: 2, md: 2.5 }}>
        {filteredItems.map((item, index) => {
          const displayName = getDisplayName(item, nameField);
          const statusLabel = Number(item.is_active ?? item.active ?? 1) === 1 ? "Activo" : "Inactivo";
          const price = formatCurrency(item.base_price ?? item.unit_cost);

          return (
          <Grid item xs={12} sm={6} lg={4} key={item[itemKey] ?? `${nameField}-${index}`}>
            <AppCard sx={{ height: "100%" }} contentSx={{ height: "100%" }}>
              <Stack spacing={2} sx={{ height: "100%" }}>
                <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, wordBreak: "break-word" }}>
                      {displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {typeLabel} #{item.id || item[itemKey] || "N/A"}
                    </Typography>
                  </Box>
                  <Chip
                    label={statusLabel}
                    size="small"
                    color={statusLabel === "Activo" ? "success" : "default"}
                    variant={statusLabel === "Activo" ? "filled" : "outlined"}
                  />
                </Stack>

                <Grid container spacing={1.5}>
                  {item.sku ? (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        SKU
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{item.sku}</Typography>
                    </Grid>
                  ) : null}
                  {item.unit ? (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Unidad
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{item.unit}</Typography>
                    </Grid>
                  ) : null}
                  {price ? (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Valor
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{price}</Typography>
                    </Grid>
                  ) : null}
                  {item.min_stock !== undefined && item.min_stock !== null ? (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Stock minimo
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{item.min_stock}</Typography>
                    </Grid>
                  ) : null}
                </Grid>
              </Stack>
            </AppCard>
          </Grid>
          );
        })}
      </Grid>
      {!loading && filteredItems.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          {emptyMessage}
        </Alert>
      ) : null}
    </>
  );
};

export default CatalogListView;
