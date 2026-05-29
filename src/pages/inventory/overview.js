import { useEffect, useState } from "react";
import { Alert, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const MetricCard = ({ label, value, helper, color = "primary" }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        {value}
      </Typography>
      <Chip label={helper} color={color} variant="outlined" sx={{ alignSelf: "flex-start" }} />
    </Stack>
  </Paper>
);

const getStockState = (item) => {
  const stock = Number(item.quantity_on_hand || 0);
  const min = Number(item.min_stock || 0);

  if (stock <= 0) {
    return { label: "Sin stock", color: "error", priority: 0 };
  }

  if (stock < min) {
    return { label: "Bajo minimo", color: "warning", priority: 1 };
  }

  return { label: "Disponible", color: "success", priority: 2 };
};

const sortByCriticality = (rows) => {
  return [...rows].sort((a, b) => {
    const stateDiff = getStockState(a).priority - getStockState(b).priority;
    if (stateDiff !== 0) {
      return stateDiff;
    }

    return getDisplayName(a).localeCompare(getDisplayName(b));
  });
};

const CriticalList = ({ title, subtitle, rows, emptyMessage, actionHref }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}
    >
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>
      <AppButton component={Link} href={actionHref} color="secondary" variant="outlined">
        Ver detalle
      </AppButton>
    </Stack>

    {rows.length === 0 ? (
      <Alert severity="success">{emptyMessage}</Alert>
    ) : (
      <Stack spacing={1.5}>
        {rows.map((item) => {
          const unit = item.unit || "unit";
          const state = getStockState(item);

          return (
            <Paper key={item.id} variant="outlined" sx={{ borderRadius: 2, p: 2, borderColor: `${state.color}.main` }}>
              <Stack spacing={1}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
                  <Typography sx={{ fontWeight: 800 }}>{getDisplayName(item)}</Typography>
                  <Chip size="small" color={state.color} label={state.label} />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Chip label={`Disponible ${formatInventoryQuantity(item.quantity_on_hand, unit)} ${unit}`} size="small" />
                  <Chip label={`Minimo ${formatInventoryQuantity(item.min_stock, unit)} ${unit}`} size="small" variant="outlined" />
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    )}
  </Paper>
);

const InventoryOverviewPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 50 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar base de inventario");
          return;
        }

        setBranches(normalizeRows(response.data?.branches));
        setProducts(normalizeRows(response.data?.products));
        setRawMaterials(normalizeRows(response.data?.raw_materials));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar inventario"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const emptyProducts = products.filter((item) => Number(item.quantity_on_hand || 0) <= 0);
  const emptyMaterials = rawMaterials.filter((item) => Number(item.quantity_on_hand || 0) <= 0);
  const lowProducts = products.filter((item) => Number(item.quantity_on_hand || 0) > 0 && Number(item.quantity_on_hand || 0) < Number(item.min_stock || 0));
  const lowMaterials = rawMaterials.filter((item) => Number(item.quantity_on_hand || 0) > 0 && Number(item.quantity_on_hand || 0) < Number(item.min_stock || 0));
  const criticalMaterials = sortByCriticality([...emptyMaterials, ...lowMaterials]).slice(0, 5);
  const criticalProducts = sortByCriticality([...emptyProducts, ...lowProducts]).slice(0, 5);
  const totalAlerts = emptyProducts.length + emptyMaterials.length + lowProducts.length + lowMaterials.length;

  return (
    <FlowPageLayout title="Inventario - Resumen" subtitle="Estado general de stock por sucursal">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando resumen de inventario...</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <MetricCard label="Sucursales" value={branches.length} helper="Operativas" color="info" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Materias primas" value={rawMaterials.length} helper={`${emptyMaterials.length} sin stock · ${lowMaterials.length} bajo minimo`} color={emptyMaterials.length ? "error" : lowMaterials.length ? "warning" : "success"} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Productos" value={products.length} helper={`${emptyProducts.length} sin stock · ${lowProducts.length} bajo minimo`} color={emptyProducts.length ? "error" : lowProducts.length ? "warning" : "success"} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Alertas" value={totalAlerts} helper={totalAlerts ? "Items a revisar" : "Inventario estable"} color={totalAlerts ? "warning" : "success"} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <CriticalList
            title="Materias criticas"
            subtitle="Insumos que pueden frenar produccion."
            rows={criticalMaterials}
            emptyMessage="No hay materias primas criticas en este momento."
            actionHref="/inventory/raw-materials"
          />
        </Grid>

        <Grid item xs={12} lg={6}>
          <CriticalList
            title="Productos criticos"
            subtitle="Producto terminado con stock bajo o agotado."
            rows={criticalProducts}
            emptyMessage="No hay productos criticos en este momento."
            actionHref="/inventory/products"
          />
        </Grid>

        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
            >
              <Stack spacing={0.5}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Accesos rapidos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Operaciones frecuentes de inventario.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "flex-end" }}>
                <AppButton component={Link} href="/inventory/movements" color="secondary">
                  Registrar movimiento
                </AppButton>
                <AppButton component={Link} href="/inventory/purchase-orders" color="secondary" variant="outlined">
                  Compras y recepciones
                </AppButton>
                <AppButton component={Link} href="/inventory/raw-materials" color="secondary" variant="outlined">
                  Materias primas
                </AppButton>
                <AppButton component={Link} href="/inventory/products" color="secondary" variant="outlined">
                  Productos
                </AppButton>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default InventoryOverviewPage;
