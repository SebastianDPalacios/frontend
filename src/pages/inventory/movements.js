import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, MenuItem, TextField } from "@mui/material";
import toast from "react-hot-toast";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const InventoryMovementsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [movementType, setMovementType] = useState("out");
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 15 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar movimientos de inventario");
          return;
        }

        const branches = normalizeRows(response.data?.branches);
        const products = normalizeRows(response.data?.products);
        const materials = normalizeRows(response.data?.raw_materials);

        const productItems = products.map((product) => ({
          id: `product-${product.id}`,
          item_type: "product",
          item_id: Number(product.id),
          name: getDisplayName(product),
        }));

        const materialItems = materials.map((material) => ({
          id: `raw_material-${material.id}`,
          item_type: "raw_material",
          item_id: Number(material.id),
          name: getDisplayName(material),
        }));

        setBranches(branches);
        setSelectedBranch(branches[0]?.id ? String(branches[0].id) : "");
        setItems([...productItems, ...materialItems]);
      } catch (requestError) {
        setError("Error de red al cargar movimientos de inventario");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const flowLinks = useMemo(
    () => [
      { label: "Resumen", href: "/inventory/overview" },
      { label: "Ordenes compra", href: "/inventory/purchase-orders" },
      { label: "Materia prima", href: "/inventory/raw-materials" },
      { label: "Productos", href: "/inventory/products" },
      { label: "Movimientos", href: "/inventory/movements", active: true },
    ],
    []
  );

  const onSubmitMovements = async () => {
    if (saving) {
      return;
    }

    setError(null);
    setFieldErrors({});

    const nextErrors = {};
    if (!selectedBranch) {
      nextErrors.selectedBranch = "Selecciona una sucursal";
    }

    if (movementType === "adjustment" && notes.trim().length < 5) {
      nextErrors.notes = "Para ajustes indica una nota de al menos 5 caracteres";
    }

    if (notes.length > 250) {
      nextErrors.notes = "Maximo 250 caracteres";
    }

    const invalidQuantity = items.some((item) => {
      const raw = quantities[item.id];
      if (raw === "" || raw === undefined || raw === null) {
        return false;
      }

      const value = Number(raw);
      return Number.isNaN(value) || value < 0;
    });

    if (invalidQuantity) {
      nextErrors.quantities = "No se permiten cantidades negativas";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Corrige los campos marcados");
      return;
    }

    const pending = items
      .map((item) => ({
        ...item,
        quantity: Number(quantities[item.id] || 0),
      }))
      .filter((item) => item.item_id > 0 && item.quantity > 0);

    if (pending.length === 0) {
      setError("Ingresa al menos una cantidad para aplicar movimientos");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.all(
        pending.map((item) =>
          inventoryService.applyMovement({
            p_branch_id: Number(selectedBranch),
            p_item_type: item.item_type,
            p_item_id: item.item_id,
            p_movement_type: movementType,
            p_quantity: item.quantity,
            p_unit_cost: null,
            p_reference_type: "manual",
            p_reference_id: null,
            p_notes: notes || null,
          })
        )
      );

      const failed = results.find((result) => result?.code !== 1);
      if (failed) {
        setError(failed?.message || "No se pudieron aplicar todos los movimientos");
        return;
      }

      toast.success(`Movimientos aplicados: ${pending.length}`);
      setQuantities({});
      setNotes("");
    } catch (requestError) {
      setError("Error de red al aplicar movimientos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Inventario - Movimientos" subtitle="Trazabilidad base de movimientos" links={flowLinks}>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <TextField select fullWidth label="Sucursal" value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={String(branch.id)}>
                {getDisplayName(branch)}
              </MenuItem>
            ))}
          </TextField>
          {fieldErrors.selectedBranch ? <Alert severity="warning" sx={{ mt: 1 }}>{fieldErrors.selectedBranch}</Alert> : null}
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField select fullWidth label="Tipo movimiento" value={movementType} onChange={(event) => setMovementType(event.target.value)}>
            <MenuItem value="in">Entrada</MenuItem>
            <MenuItem value="out">Salida</MenuItem>
            <MenuItem value="adjustment">Ajuste</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Notas"
            value={notes}
            onChange={(event) => {
              setFieldErrors((prev) => ({ ...prev, notes: null }));
              setNotes(event.target.value);
            }}
            error={Boolean(fieldErrors.notes)}
            helperText={fieldErrors.notes || " "}
          />
        </Grid>
      </Grid>
      <FlowTableCard
        title="Movimientos"
        loading={loading}
        error={null}
        columns={[
          { key: "item_type", label: "Tipo", render: (row) => (row.item_type === "product" ? "Producto" : "Materia prima") },
          { key: "name", label: "Item" },
          {
            key: "quantity",
            label: "Cantidad",
            render: (row) => (
              <TextField
                type="number"
                size="small"
                value={quantities[row.id] || ""}
                onChange={(event) => setQuantities((prev) => ({ ...prev, [row.id]: event.target.value }))}
                inputProps={{ min: 0 }}
                error={Boolean(fieldErrors.quantities)}
              />
            ),
          },
        ]}
        rows={items}
      />
      {fieldErrors.quantities ? <Alert severity="warning" sx={{ mt: 2 }}>{fieldErrors.quantities}</Alert> : null}
      <Grid container sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <AppButton color="secondary" onClick={onSubmitMovements} disabled={saving || loading}>
            {saving ? "Aplicando..." : "Aplicar movimientos"}
          </AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default InventoryMovementsPage;
