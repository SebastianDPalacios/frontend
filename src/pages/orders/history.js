import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, TextField } from "@mui/material";
import toast from "react-hot-toast";
import ordersService from "services/orders/orders-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const OrdersHistoryPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState({ customers: [], routes: [], products: [] });
  const [orderId, setOrderId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40, search });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar historico de pedidos");
          return;
        }
        setRows({
          customers: normalizeRows(response.data?.customers),
          routes: normalizeRows(response.data?.routes),
          products: normalizeRows(response.data?.products),
        });
      } catch (requestError) {
        setError("Error de red al cargar historico de pedidos");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(run, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const flowLinks = useMemo(
    () => [
      { label: "Dia", href: "/orders/day" },
      { label: "Historico", href: "/orders/history", active: true },
      { label: "Conteo", href: "/orders/count" },
    ],
    []
  );
  const routesUnavailable = !loading && rows.routes.length === 0;

  const runOrderAction = async (action) => {
    if (actionLoading) {
      return;
    }

    setError(null);
    setFieldErrors({});
    const parsedOrderId = Number(orderId);

    if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
      setFieldErrors({ orderId: "Ingresa un id de pedido valido" });
      setError("Corrige los campos marcados");
      return;
    }

    if (action === "cancel" && cancelReason.trim().length < 5) {
      setFieldErrors({ cancelReason: "Para cancelar indica un motivo de al menos 5 caracteres" });
      setError("Corrige los campos marcados");
      return;
    }

    setActionLoading(true);
    try {
      let result = null;

      if (action === "confirm") {
        result = await ordersService.confirmOrder(parsedOrderId);
      }

      if (action === "dispatch") {
        result = await ordersService.dispatchOrder(parsedOrderId);
      }

      if (action === "cancel") {
        result = await ordersService.cancelOrder(parsedOrderId, { p_reason: cancelReason.trim() || null });
      }

      if (result?.code !== 1) {
        setError(result?.message || "No se pudo ejecutar la accion de pedido");
        return;
      }

      toast.success(result?.message || "Accion aplicada correctamente");
    } catch (requestError) {
      setError("Error de red al ejecutar accion de pedido");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <FlowPageLayout title="Pedidos - Historico" subtitle="Consulta de catalogos para historico de pedidos" links={flowLinks}>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {routesUnavailable ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          El servicio de repartidores/rutas no esta disponible en esta version del backend.
        </Alert>
      ) : null}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField
            fullWidth
            type="number"
            label="Id pedido"
            value={orderId}
            onChange={(event) => {
              setFieldErrors((prev) => ({ ...prev, orderId: null }));
              setOrderId(event.target.value);
            }}
            inputProps={{ min: 1 }}
            error={Boolean(fieldErrors.orderId)}
            helperText={fieldErrors.orderId || " "}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Motivo cancelacion"
            value={cancelReason}
            onChange={(event) => {
              setFieldErrors((prev) => ({ ...prev, cancelReason: null }));
              setCancelReason(event.target.value);
            }}
            error={Boolean(fieldErrors.cancelReason)}
            helperText={fieldErrors.cancelReason || " "}
          />
        </Grid>
        <Grid item xs={12} md={3} sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <AppButton color="secondary" onClick={() => runOrderAction("confirm")} disabled={actionLoading}>Confirmar</AppButton>
          <AppButton color="secondary" variant="outlined" onClick={() => runOrderAction("dispatch")} disabled={actionLoading}>Despachar</AppButton>
          <AppButton color="error" variant="outlined" onClick={() => runOrderAction("cancel")} disabled={actionLoading}>Cancelar</AppButton>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FlowTableCard
            title="Clientes"
            loading={loading}
            error={error}
            columns={[{ key: "name", label: "Nombre", render: (row) => getDisplayName(row) }]}
            rows={rows.customers}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FlowTableCard
            title={routesUnavailable ? "Repartidores (no disponible)" : "Repartidores"}
            loading={loading}
            error={error}
            columns={[{ key: "name", label: "Descripcion", render: (row) => getDisplayName(row) }]}
            rows={rows.routes}
          />
        </Grid>
        <Grid item xs={12}>
          <FlowTableCard
            title="Productos"
            loading={loading}
            error={error}
            columns={[{ key: "name", label: "Descripcion", render: (row) => getDisplayName(row) }]}
            rows={rows.products}
          />
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default OrdersHistoryPage;
