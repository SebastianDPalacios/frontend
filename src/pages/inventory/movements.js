import { useEffect, useMemo, useState } from "react";
import { Alert, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, isIntegerUnit, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const itemTypeLabels = {
  all: "Todos",
  product: "Productos",
  raw_material: "Materia prima",
};

const movementTypeOptions = [
  {
    value: "adjustment_in",
    title: "Entrada de stock",
    helper: "Suma existencias por compra, inventario inicial o ajuste.",
    color: "success",
  },
  {
    value: "adjustment_out",
    title: "Salida de stock",
    helper: "Resta existencias por merma, ajuste o salida manual.",
    color: "warning",
  },
];

const MAX_INVENTORY_QUANTITY = 99999999999.999;

const formatNumber = (value, unit) => formatInventoryQuantity(value, unit);

const InventoryMovementsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [movementType, setMovementType] = useState("adjustment_in");
  const [itemTypeFilter, setItemTypeFilter] = useState("raw_material");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryService.getBaseData({
          onlyActive: 1,
          page: 1,
          pageSize: 50,
          branchId: selectedBranch || undefined,
        });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar movimientos de inventario");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        const products = normalizeRows(response.data?.products);
        const materials = normalizeRows(response.data?.raw_materials);

        const productItems = products.map((product) => ({
          id: `product-${product.id}`,
          item_type: "product",
          item_id: Number(product.id),
          name: getDisplayName(product),
          unit: product.unit || "unit",
          quantity_on_hand: product.quantity_on_hand || 0,
        }));

        const materialItems = materials.map((material) => ({
          id: `raw_material-${material.id}`,
          item_type: "raw_material",
          item_id: Number(material.id),
          name: getDisplayName(material),
          unit: material.unit || "unit",
          quantity_on_hand: material.quantity_on_hand || 0,
        }));

        setBranches(branchRows);
        setSelectedBranch((current) => current || (response.data?.selected_branch_id ? String(response.data.selected_branch_id) : ""));
        setItems([...materialItems, ...productItems]);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar movimientos de inventario"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [reloadKey, selectedBranch]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesType = itemTypeFilter === "all" || item.item_type === itemTypeFilter;
      const matchesSearch = !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch);
      return matchesType && matchesSearch;
    });
  }, [itemTypeFilter, items, search]);

  const selectedCount = Object.values(quantities).filter((value) => Number(value || 0) > 0).length;
  const selectedMovement = movementTypeOptions.find((option) => option.value === movementType) || movementTypeOptions[0];

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

    if (movementType.startsWith("adjustment") && notes.trim().length < 5) {
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
      return !Number.isFinite(value) || value < 0 || (isIntegerUnit(item.unit) && !Number.isInteger(value));
    });

    if (invalidQuantity) {
      nextErrors.quantities = "Revisa las cantidades: usa valores positivos y solo enteros cuando la unidad sea unidades";
    }

    const tooLargeQuantity = items.some((item) => {
      const raw = quantities[item.id];
      if (raw === "" || raw === undefined || raw === null) {
        return false;
      }

      return Number(raw) > MAX_INVENTORY_QUANTITY;
    });

    if (tooLargeQuantity) {
      nextErrors.quantities = `La cantidad maxima permitida por item es ${formatNumber(MAX_INVENTORY_QUANTITY)}`;
    }

    const insufficientStock = movementType === "adjustment_out"
      ? items.find((item) => Number(quantities[item.id] || 0) > Number(item.quantity_on_hand || 0))
      : null;

    if (insufficientStock) {
      nextErrors.quantities = `No puedes restar ${formatNumber(quantities[insufficientStock.id], insufficientStock.unit)} ${insufficientStock.unit} de ${insufficientStock.name}; disponible: ${formatNumber(insufficientStock.quantity_on_hand, insufficientStock.unit)} ${insufficientStock.unit}`;
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
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al aplicar movimientos"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Inventario - Movimientos" subtitle="Entradas y salidas manuales de stock">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Tipo de movimiento
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Elige si vas a sumar o restar inventario antes de capturar cantidades.
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            {movementTypeOptions.map((option) => {
              const isSelected = movementType === option.value;

              return (
                <Grid item xs={12} md={6} key={option.value}>
                  <Paper
                    variant="outlined"
                    onClick={() => setMovementType(option.value)}
                    sx={{
                      borderRadius: 2,
                      p: 2,
                      cursor: "pointer",
                      height: "100%",
                      borderColor: isSelected ? `${option.color}.main` : "divider",
                      bgcolor: isSelected ? "action.selected" : "background.paper",
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontWeight: 900 }}>{option.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.helper}
                        </Typography>
                      </Stack>
                      <Chip size="small" color={option.color} label={isSelected ? "Activo" : "Elegir"} variant={isSelected ? "filled" : "outlined"} />
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Sucursal" value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)} error={Boolean(fieldErrors.selectedBranch)} helperText={fieldErrors.selectedBranch || " "}>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={String(branch.id)}>
                  {getDisplayName(branch)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Ver" value={itemTypeFilter} onChange={(event) => setItemTypeFilter(event.target.value)}>
              <MenuItem value="raw_material">Materia prima</MenuItem>
              <MenuItem value="product">Productos</MenuItem>
              <MenuItem value="all">Todos</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Buscar item" value={search} onChange={(event) => setSearch(event.target.value)} />
          </Grid>
          <Grid item xs={12}>
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
      </Paper>

      {fieldErrors.quantities ? <Alert severity="warning" sx={{ mb: 2 }}>{fieldErrors.quantities}</Alert> : null}
      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", mb: 2 }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Items de inventario
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedMovement.title}: captura cantidades en la unidad base de cada item.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
            <Chip size="small" variant="outlined" label={`${selectedCount} con cantidad`} />
            <Chip size="small" color={selectedMovement.color} label={selectedMovement.title} />
            <AppButton color="secondary" onClick={onSubmitMovements} disabled={saving || loading}>
              {saving ? "Aplicando..." : "Aplicar movimientos"}
            </AppButton>
          </Stack>
        </Stack>

        {loading ? <Alert severity="info">Cargando items de inventario...</Alert> : null}
        {!loading && filteredItems.length === 0 ? (
          <Alert severity="info">No hay items para los filtros seleccionados.</Alert>
        ) : null}

        <Grid container spacing={2}>
          {filteredItems.map((item) => (
            <Grid item xs={12} md={6} xl={4} key={item.id}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  p: 2,
                  height: "100%",
                  borderColor: Number(quantities[item.id] || 0) > 0 ? "primary.main" : "divider",
                }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }} noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stock actual: {formatNumber(item.quantity_on_hand, item.unit)} {item.unit}
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={item.item_type === "product" ? "Producto" : "Materia prima"}
                      color={item.item_type === "product" ? "info" : "warning"}
                      variant="outlined"
                    />
                  </Stack>

                  <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, bgcolor: "action.hover" }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Disponible
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>
                          {formatNumber(item.quantity_on_hand, item.unit)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Unidad
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>
                          {item.unit}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <TextField
                    type="number"
                    label={`Cantidad a ${movementType === "adjustment_in" ? "sumar" : "restar"} (${item.unit})`}
                    value={quantities[item.id] || ""}
                    onChange={(event) => {
                      setFieldErrors((prev) => ({ ...prev, quantities: null }));
                      setQuantities((prev) => ({ ...prev, [item.id]: event.target.value }));
                    }}
                    inputProps={{ min: 0, max: MAX_INVENTORY_QUANTITY, step: isIntegerUnit(item.unit) ? 1 : 0.001 }}
                    error={Boolean(fieldErrors.quantities)}
                    fullWidth
                  />
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </FlowPageLayout>
  );
};

export default InventoryMovementsPage;
