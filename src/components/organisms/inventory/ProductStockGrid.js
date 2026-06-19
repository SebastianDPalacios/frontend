import Link from "next/link";
import { Alert, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const StockChip = ({ quantity, minStock }) => {
  const stock = Number(quantity || 0);
  const min = Number(minStock || 0);
  const isEmpty = stock <= 0;
  const isLow = !isEmpty && stock < min;

  return (
    <Chip
      size="small"
      label={isEmpty ? "Sin stock" : isLow ? "Bajo minimo" : "Disponible"}
      color={isEmpty ? "error" : isLow ? "warning" : "success"}
      variant={isEmpty || isLow ? "filled" : "outlined"}
      sx={{ minWidth: 112 }}
    />
  );
};

const ProductStockGrid = ({ loading, error, rows, sortedRows, getDisplayName, formatInventoryQuantity }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", mb: 2 }}
    >
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Stock de productos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {rows.length} productos registrados. Los criticos aparecen primero.
        </Typography>
      </Stack>
    </Stack>

    {error ? (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    ) : null}
    {loading ? <Alert severity="info">Cargando stock de productos...</Alert> : null}
    {!loading && rows.length === 0 ? <Alert severity="info">No hay productos para mostrar.</Alert> : null}

    <Grid container spacing={2}>
      {sortedRows.map((row) => {
        const isLow = Number(row.quantity_on_hand || 0) < Number(row.min_stock || 0);
        const isEmpty = Number(row.quantity_on_hand || 0) <= 0;
        const unit = row.unit || "unit";

        return (
          <Grid item xs={12} md={6} xl={4} key={row.id}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                p: 2,
                height: "100%",
                borderColor: isEmpty ? "error.main" : isLow ? "warning.main" : "divider",
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800 }} noWrap>
                      {getDisplayName(row)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unidad base: {unit}
                    </Typography>
                  </Stack>
                  <StockChip quantity={row.quantity_on_hand} minStock={row.min_stock} />
                </Stack>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Disponible
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {formatInventoryQuantity(row.quantity_on_hand, unit)} {unit}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Minimo
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {formatInventoryQuantity(row.min_stock, unit)} {unit}
                    </Typography>
                  </Grid>
                </Grid>

                <AppButton component={Link} href="/inventory/movements" variant="outlined" color="secondary">
                  Cargar movimiento
                </AppButton>
              </Stack>
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  </Paper>
);

export default ProductStockGrid;
