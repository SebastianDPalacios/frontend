import { useEffect, useState } from "react";
import { Alert, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import Link from "next/link";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

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

const getStockPriority = (row) => {
  const stock = Number(row.quantity_on_hand || 0);
  const minStock = Number(row.min_stock || 0);

  if (stock <= 0) {
    return 0;
  }

  if (stock < minStock) {
    return 1;
  }

  return 2;
};

const InventoryProductsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40, branchId: selectedBranch || undefined });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar inventario de productos");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        setBranches(branchRows);
        setRows(normalizeRows(response.data?.products));
        setSelectedBranch((current) => current || (response.data?.selected_branch_id ? String(response.data.selected_branch_id) : ""));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar inventario de productos"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedBranch]);

  const sortedRows = [...rows].sort((a, b) => {
    const priority = getStockPriority(a) - getStockPriority(b);
    if (priority !== 0) {
      return priority;
    }

    return getDisplayName(a).localeCompare(getDisplayName(b));
  });
  const emptyCount = rows.filter((row) => Number(row.quantity_on_hand || 0) <= 0).length;
  const lowCount = rows.filter((row) => Number(row.quantity_on_hand || 0) > 0 && Number(row.quantity_on_hand || 0) < Number(row.min_stock || 0)).length;

  return (
    <FlowPageLayout title="Inventario - Productos" subtitle="Existencias actuales por sucursal">
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid item xs={12} md={4}>
          <TextField select fullWidth label="Sucursal" value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={String(branch.id)}>
                {getDisplayName(branch)}
              </MenuItem>
            ))}
          </TextField>
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography variant="body2" color="text.secondary">
              Revisa existencias de producto terminado por sucursal. Los valores se muestran en la unidad base del producto.
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">Sin stock</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>{emptyCount}</Typography>
              <Chip size="small" color={emptyCount ? "error" : "success"} variant="outlined" label={emptyCount ? "Reponer primero" : "Todo con stock"} sx={{ alignSelf: "flex-start" }} />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">Bajo minimo</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>{lowCount}</Typography>
              <Chip size="small" color={lowCount ? "warning" : "success"} variant="outlined" label={lowCount ? "Revisar produccion" : "Sin alertas"} sx={{ alignSelf: "flex-start" }} />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">Accion rapida</Typography>
              <Typography sx={{ fontWeight: 800 }}>Entrada de producto</Typography>
              <AppButton component={Link} href="/inventory/movements" color="secondary">
                Cargar stock
              </AppButton>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

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

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
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
    </FlowPageLayout>
  );
};

export default InventoryProductsPage;
