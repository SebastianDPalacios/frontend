import { useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

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

const formatUnit = (unit) => {
  const labels = {
    unit: "Unidad",
    g: "Gramo",
    ml: "Mililitro",
    kg: "Kilo",
    l: "Litro",
    tray: "Bandeja",
  };

  return labels[unit] || unit || "Sin unidad";
};

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
  showProductYield = false,
  onEditYield,
  showProductCategory = false,
  getCategoryName,
  onAssignCategory,
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

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: "auto" }}>
        <Table sx={{ minWidth: showProductYield || showProductCategory ? 1080 : 840 }}>
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  bgcolor: "background.default",
                  color: "text.secondary",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0,
                  textTransform: "uppercase",
                },
              }}
            >
              <TableCell>Producto</TableCell>
              <TableCell>SKU</TableCell>
              {showProductCategory ? <TableCell>Categoria</TableCell> : null}
              <TableCell>Unidad</TableCell>
              {showProductYield ? <TableCell align="right">Unid./bulto</TableCell> : null}
              <TableCell align="right">Valor</TableCell>
              <TableCell align="right">Stock minimo</TableCell>
              <TableCell>Estado</TableCell>
              {showProductYield || showProductCategory ? <TableCell align="right">Accion</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item, index) => {
          const displayName = getDisplayName(item, nameField);
          const statusLabel = Number(item.is_active ?? item.active ?? 1) === 1 ? "Activo" : "Inactivo";
          const price = formatCurrency(item.base_price ?? item.unit_cost);

          return (
            <TableRow key={item[itemKey] ?? `${nameField}-${index}`} sx={{ "&:last-child td": { borderBottom: 0 }, "&:hover": { bgcolor: "action.hover" } }}>
              <TableCell>
                <Stack spacing={0.25}>
                  <Typography sx={{ fontWeight: 900 }}>{displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {typeLabel} #{item.id || item[itemKey] || "N/A"}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell>
                <Typography sx={{ fontWeight: 800 }}>{item.sku || "Sin SKU"}</Typography>
              </TableCell>
              {showProductCategory ? (
                <TableCell>
                  <Typography sx={{ fontWeight: 800 }}>
                    {getCategoryName?.(item.category_id) || "Sin categoria"}
                  </Typography>
                </TableCell>
              ) : null}
              <TableCell>{formatUnit(item.unit)}</TableCell>
              {showProductYield ? (
                <TableCell align="right">
                  <Typography sx={{ fontWeight: 800 }}>
                    {item.units_per_bag ? Number(item.units_per_bag).toLocaleString("es-CO") : "Sin configurar"}
                  </Typography>
                </TableCell>
              ) : null}
              <TableCell align="right">
                <Typography sx={{ fontWeight: 800 }}>{price || "$ 0"}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ fontWeight: 800 }}>{Number(item.min_stock || 0).toLocaleString("es-CO")}</Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={statusLabel}
                  size="small"
                  color={statusLabel === "Activo" ? "success" : "default"}
                  variant={statusLabel === "Activo" ? "filled" : "outlined"}
                  sx={{ minWidth: 82, fontWeight: 800 }}
                />
              </TableCell>
              {showProductYield || showProductCategory ? (
                <TableCell align="right">
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {showProductCategory ? (
                      <Button size="small" variant="outlined" color="secondary" onClick={() => onAssignCategory?.(item)}>
                        Asignar categoria
                      </Button>
                    ) : null}
                    {showProductYield ? (
                      <Button size="small" variant="outlined" color="secondary" onClick={() => onEditYield?.(item)}>
                        Editar bulto
                      </Button>
                    ) : null}
                  </Stack>
                </TableCell>
              ) : null}
            </TableRow>
          );
            })}
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showProductYield || showProductCategory ? 9 : 6}>
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default CatalogListView;
