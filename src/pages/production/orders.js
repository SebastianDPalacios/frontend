import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, TextField } from "@mui/material";
import toast from "react-hot-toast";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const ProductionOrdersPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState({ products: [], materials: [] });
  const [orderId, setOrderId] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await productionService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudieron cargar ordenes de produccion");
          return;
        }

        setRows({
          products: normalizeRows(response.data?.products),
          materials: normalizeRows(response.data?.raw_materials),
        });
      } catch (requestError) {
        setError("Error de red al cargar ordenes de produccion");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const flowLinks = useMemo(
    () => [
      { label: "Dia", href: "/production/day" },
      { label: "Registrar", href: "/production/register" },
      { label: "Ordenes", href: "/production/orders", active: true },
    ],
    []
  );

  const onCloseOrder = async () => {
    if (closing) {
      return;
    }

    setError(null);
    setFieldErrors({});
    const parsedId = Number(orderId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setFieldErrors({ orderId: "Ingresa un id de orden de produccion valido" });
      setError("Corrige los campos marcados");
      return;
    }

    setClosing(true);
    try {
      const result = await productionService.closeOrder(parsedId);
      if (result?.code !== 1) {
        setError(result?.message || "No se pudo cerrar la orden de produccion");
        return;
      }

      toast.success(result?.message || `Orden ${parsedId} cerrada`);
      setOrderId("");
    } catch (requestError) {
      setError("Error de red al cerrar la orden de produccion");
    } finally {
      setClosing(false);
    }
  };

  return (
    <FlowPageLayout title="Produccion - Ordenes" subtitle="Vista base para planificar ordenes" links={flowLinks}>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <TextField fullWidth type="number" label="Id orden produccion" value={orderId} onChange={(event) => setOrderId(event.target.value)} inputProps={{ min: 1 }} />
          {fieldErrors.orderId ? <Alert severity="warning" sx={{ mt: 1 }}>{fieldErrors.orderId}</Alert> : null}
        </Grid>
        <Grid item xs={12} md={3}>
          <AppButton color="secondary" onClick={onCloseOrder} disabled={closing}>{closing ? "Cerrando..." : "Cerrar orden"}</AppButton>
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FlowTableCard
            title="Productos"
            loading={loading}
            error={error}
            columns={[{ key: "name", label: "Producto", render: (row) => getDisplayName(row) }]}
            rows={rows.products}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FlowTableCard
            title="Materias primas"
            loading={loading}
            error={error}
            columns={[{ key: "name", label: "Materia", render: (row) => getDisplayName(row) }]}
            rows={rows.materials}
          />
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default ProductionOrdersPage;
