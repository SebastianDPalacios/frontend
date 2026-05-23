import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, MenuItem, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import inventoryService from "services/inventory/inventory-service";
import ordersService from "services/orders/orders-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const InventoryPurchaseOrdersPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudieron cargar ordenes de compra");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        setBranches(branchRows);
        setMaterials(normalizeRows(response.data?.raw_materials));
        setSelectedBranch(branchRows[0]?.id ? String(branchRows[0].id) : "");
      } catch (requestError) {
        setError("Error de red al cargar ordenes de compra");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const flowLinks = useMemo(
    () => [
      { label: "Resumen", href: "/inventory/overview" },
      { label: "Ordenes compra", href: "/inventory/purchase-orders", active: true },
      { label: "Materia prima", href: "/inventory/raw-materials" },
      { label: "Productos", href: "/inventory/products" },
      { label: "Movimientos", href: "/inventory/movements" },
    ],
    []
  );

  const onReceivePurchaseOrder = async () => {
    if (saving) {
      return;
    }

    setError(null);
    const parsedId = Number(purchaseOrderId);
    if (!parsedId || parsedId <= 0) {
      setError("Ingresa un numero de orden de compra valido");
      return;
    }

    setSaving(true);
    try {
      const result = await ordersService.receivePurchaseOrder(parsedId);
      if (result?.code !== 1) {
        setError(result?.message || "No se pudo recepcionar la orden de compra");
        return;
      }

      toast.success(result?.message || `Orden de compra ${parsedId} recepcionada`);
      setPurchaseOrderId("");
    } catch (requestError) {
      setError("Error de red al recepcionar orden de compra");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Inventario - Ordenes de compra" subtitle="Preparacion de solicitudes por sucursal" links={flowLinks}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <TextField
            select
            fullWidth
            label="Sucursal"
            value={selectedBranch}
            onChange={(event) => setSelectedBranch(event.target.value)}
          >
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={String(branch.id)}>
                {getDisplayName(branch)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="number"
            label="Id orden compra"
            value={purchaseOrderId}
            onChange={(event) => setPurchaseOrderId(event.target.value)}
            inputProps={{ min: 1 }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <AppButton color="secondary" onClick={onReceivePurchaseOrder} disabled={saving || loading}>
            {saving ? "Procesando..." : "Recepcionar OC"}
          </AppButton>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mb: 2 }}>
        Sucursal seleccionada: {branches.find((branch) => String(branch.id) === selectedBranch)?.description || "N/A"}
      </Alert>

      <FlowTableCard
        title="Materias para compra"
        loading={loading}
        error={error}
        columns={[{ key: "name", label: "Materia", render: (row) => getDisplayName(row) }]}
        rows={materials}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        La recepcion de orden de compra ya se conecta al endpoint operativo del backend.
      </Typography>
    </FlowPageLayout>
  );
};

export default InventoryPurchaseOrdersPage;
