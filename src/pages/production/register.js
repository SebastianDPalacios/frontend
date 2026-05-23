import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, MenuItem, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import productionService from "services/production/production-service";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const ProductionRegisterPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState({});
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [productionResponse, inventoryResponse] = await Promise.all([
          productionService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 }),
          inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 }),
        ]);

        if (productionResponse?.code !== 1) {
          setError(productionResponse?.message || "No se pudo cargar registro de produccion");
          return;
        }

        if (inventoryResponse?.code !== 1) {
          setError(inventoryResponse?.message || "No se pudieron cargar sucursales");
          return;
        }

        const branchRows = normalizeRows(inventoryResponse.data?.branches);
        setBranches(branchRows);
        setSelectedBranch(branchRows[0]?.id ? String(branchRows[0].id) : "");
        setProducts(normalizeRows(productionResponse.data?.products));
      } catch (requestError) {
        setError("Error de red al cargar registro de produccion");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const flowLinks = useMemo(
    () => [
      { label: "Dia", href: "/production/day" },
      { label: "Registrar", href: "/production/register", active: true },
      { label: "Ordenes", href: "/production/orders" },
    ],
    []
  );

  const totalBatches = Object.values(batches).reduce((acc, value) => acc + Number(value || 0), 0);

  const onSubmitProduction = async () => {
    if (saving) {
      return;
    }

    setError(null);
    setFieldErrors({});
    const entries = products
      .map((product) => ({
        productId: Number(product.id),
        quantity: Number(batches[product.id] || 0),
      }))
      .filter((item) => item.productId > 0 && item.quantity > 0);

    const nextErrors = {};
    if (!selectedBranch) {
      nextErrors.selectedBranch = "Selecciona una sucursal";
    }

    if (notes.length > 250) {
      nextErrors.notes = "Maximo 250 caracteres";
    }

    const invalidBatch = products.some((product) => {
      const raw = batches[product.id];
      if (raw === "" || raw === undefined || raw === null) {
        return false;
      }

      const value = Number(raw);
      return Number.isNaN(value) || value < 0;
    });

    if (invalidBatch) {
      nextErrors.batches = "No se permiten lotes negativos";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Corrige los campos marcados antes de registrar");
      return;
    }

    if (entries.length === 0) {
      setError("Ingresa al menos un lote para registrar produccion");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.all(
        entries.map((item) =>
          productionService.registerResult({
            p_branch_id: Number(selectedBranch),
            p_product_id: item.productId,
            p_recipe_id: null,
            p_produced_qty: item.quantity,
            p_reference_type: "manual",
            p_reference_id: null,
            p_notes: notes || null,
          })
        )
      );

      const failed = results.find((result) => result?.code !== 1);
      if (failed) {
        setError(failed?.message || "No se pudo registrar toda la produccion");
        return;
      }

      toast.success(`Produccion registrada para ${entries.length} productos`);
      setBatches({});
      setNotes("");
    } catch (requestError) {
      setError("Error de red al registrar produccion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Produccion - Registrar" subtitle="Carga de lotes diarios de produccion" links={flowLinks}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <TextField select fullWidth label="Sucursal" value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={String(branch.id)}>
                {getDisplayName(branch)}
              </MenuItem>
            ))}
          </TextField>
          {fieldErrors.selectedBranch ? <Typography variant="caption" color="error">{fieldErrors.selectedBranch}</Typography> : null}
        </Grid>
        <Grid item xs={12} md={3}>
          <Alert severity="info">Total lotes: {totalBatches}</Alert>
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
        title="Productos a producir"
        loading={loading}
        error={error}
        columns={[
          { key: "name", label: "Producto", render: (row) => getDisplayName(row) },
          {
            key: "batch",
            label: "Lotes",
            render: (row) => (
              <TextField
                type="number"
                size="small"
                value={batches[row.id] || ""}
                onChange={(event) => setBatches((prev) => ({ ...prev, [row.id]: event.target.value }))}
                inputProps={{ min: 0 }}
                error={Boolean(fieldErrors.batches)}
              />
            ),
          },
        ]}
        rows={products}
      />
      {fieldErrors.batches ? <Typography variant="caption" color="error" sx={{ mt: 1 }}>{fieldErrors.batches}</Typography> : null}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        El registro usa endpoint real de produccion y crea movimientos de salida de receta cuando aplique.
      </Typography>
      <Grid container sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <AppButton color="secondary" onClick={onSubmitProduction} disabled={saving || loading}>
            {saving ? "Registrando..." : "Registrar produccion"}
          </AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default ProductionRegisterPage;
