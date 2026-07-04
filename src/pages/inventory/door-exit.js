import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import AppButton from "@core/components/ui/AppButton";
import SectionHeader from "components/atoms/SectionHeader";
import PaginationControls from "components/molecules/PaginationControls";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, isIntegerUnit, normalizeRows } from "views/modules/flow-utils";

const ITEMS_PAGE_SIZE = 12;
const MAX_INVENTORY_QUANTITY = 99999999999.999;
const DOOR_EXIT_NOTE = "Salida a puerta";

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const DoorExitPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState(DOOR_EXIT_NOTE);
  const [quantities, setQuantities] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await inventoryService.getBaseData({
          onlyActive: 1,
          page: 1,
          pageSize: 300,
          branchId: selectedBranch || undefined,
        });

        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el inventario para salida a puerta");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        const productRows = normalizeRows(response.data?.products).map((product) => ({
          id: `product-${product.id}`,
          item_id: Number(product.id),
          name: getDisplayName(product),
          sku: product.sku || "",
          unit: product.unit || "unit",
          quantity_on_hand: Number(product.quantity_on_hand || 0),
        }));

        setBranches(branchRows);
        setProducts(productRows);
        setSelectedBranch((current) => current || (response.data?.selected_branch_id ? String(response.data.selected_branch_id) : ""));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar inventario"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [reloadKey, selectedBranch]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedBranch]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      if (!normalizedSearch) return true;
      return product.name.toLowerCase().includes(normalizedSearch) || product.sku.toLowerCase().includes(normalizedSearch);
    });
  }, [products, search]);

  const totalPages = Math.max(Math.ceil(filteredProducts.length / ITEMS_PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PAGE_SIZE, currentPage * ITEMS_PAGE_SIZE);

  const selectedProducts = useMemo(
    () =>
      products
        .map((product) => ({
          ...product,
          quantity: Number(quantities[product.id] || 0),
        }))
        .filter((product) => product.quantity > 0),
    [products, quantities]
  );

  const selectedTotal = selectedProducts.reduce((total, product) => total + product.quantity, 0);

  const clearFieldError = (field) => {
    setFieldErrors((current) => ({ ...current, [field]: null }));
  };

  const onQuantityChange = (product, rawValue) => {
    clearFieldError("quantities");
    setQuantities((current) => ({
      ...current,
      [product.id]: rawValue,
    }));
  };

  const onSubmit = async () => {
    if (saving) return;

    setError(null);
    setFieldErrors({});

    const nextErrors = {};
    if (!selectedBranch) {
      nextErrors.selectedBranch = "Selecciona una sucursal";
    }

    if (notes.trim().length < 5) {
      nextErrors.notes = "Indica una nota de al menos 5 caracteres";
    }

    if (notes.length > 250) {
      nextErrors.notes = "Maximo 250 caracteres";
    }

    const invalidQuantity = products.some((product) => {
      const raw = quantities[product.id];
      if (raw === "" || raw === undefined || raw === null) return false;
      const value = Number(raw);
      return !Number.isFinite(value) || value < 0 || (isIntegerUnit(product.unit) && !Number.isInteger(value));
    });

    if (invalidQuantity) {
      nextErrors.quantities = "Revisa las cantidades: usa valores positivos y enteros cuando la unidad sea unidad";
    }

    const tooLargeQuantity = products.some((product) => Number(quantities[product.id] || 0) > MAX_INVENTORY_QUANTITY);
    if (tooLargeQuantity) {
      nextErrors.quantities = `La cantidad maxima permitida por producto es ${formatInventoryQuantity(MAX_INVENTORY_QUANTITY)}`;
    }

    const insufficientStock = selectedProducts.find((product) => product.quantity > product.quantity_on_hand);
    if (insufficientStock) {
      nextErrors.quantities = `No puedes sacar ${formatInventoryQuantity(insufficientStock.quantity, insufficientStock.unit)} ${insufficientStock.unit} de ${insufficientStock.name}; disponible: ${formatInventoryQuantity(insufficientStock.quantity_on_hand, insufficientStock.unit)} ${insufficientStock.unit}`;
    }

    if (selectedProducts.length === 0) {
      nextErrors.quantities = "Ingresa al menos un producto para sacar a puerta";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Corrige los campos marcados");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.all(
        selectedProducts.map((product) =>
          inventoryService.applyMovement({
            p_branch_id: Number(selectedBranch),
            p_item_type: "product",
            p_item_id: product.item_id,
            p_movement_type: "adjustment_out",
            p_quantity: product.quantity,
            p_unit_cost: null,
            p_reference_type: "manual",
            p_reference_id: null,
            p_notes: notes.trim() || DOOR_EXIT_NOTE,
          })
        )
      );

      const failed = results.find((result) => result?.code !== 1);
      if (failed) {
        setError(failed?.message || "No se pudieron aplicar todas las salidas");
        return;
      }

      toast.success(`Salida a puerta registrada: ${selectedProducts.length} producto(s)`);
      setQuantities({});
      setNotes(DOOR_EXIT_NOTE);
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al registrar salida a puerta"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout
      title="Salida a puerta"
      subtitle="Descuenta del inventario los productos terminados que salen fisicamente de la sucursal."
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Sucursal"
              value={selectedBranch}
              onChange={(event) => setSelectedBranch(event.target.value)}
              error={Boolean(fieldErrors.selectedBranch)}
              helperText={fieldErrors.selectedBranch || " "}
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
              label="Buscar producto"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              helperText="Solo productos terminados"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Nota"
              value={notes}
              onChange={(event) => {
                clearFieldError("notes");
                setNotes(event.target.value);
              }}
              error={Boolean(fieldErrors.notes)}
              helperText={fieldErrors.notes || "Queda guardada en el historial de inventario"}
            />
          </Grid>
        </Grid>
      </Paper>

      {fieldErrors.quantities ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {fieldErrors.quantities}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", mb: 2 }}
            >
              <SectionHeader
                title="Productos disponibles"
                subtitle="Captura la cantidad que sale a puerta. El sistema valida que exista stock suficiente."
              />
              <Chip variant="outlined" label={`${filteredProducts.length} producto(s)`} />
            </Stack>

            {loading ? <Alert severity="info">Cargando productos...</Alert> : null}
            {!loading && filteredProducts.length === 0 ? <Alert severity="info">No hay productos para la busqueda actual.</Alert> : null}

            <Grid container spacing={2}>
              {visibleProducts.map((product) => {
                const selectedQuantity = Number(quantities[product.id] || 0);
                const hasQuantity = selectedQuantity > 0;

                return (
                  <Grid item xs={12} sm={6} key={product.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        p: 2,
                        height: "100%",
                        borderColor: hasQuantity ? "secondary.main" : "divider",
                        bgcolor: hasQuantity ? "action.selected" : "background.paper",
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 900 }} noWrap>
                              {product.name}
                            </Typography>
                            {product.sku ? (
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {product.sku}
                              </Typography>
                            ) : null}
                          </Box>
                          <Chip size="small" color={product.quantity_on_hand > 0 ? "success" : "default"} label="Producto" variant="outlined" />
                        </Stack>

                        <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25, bgcolor: "background.default" }}>
                          <Typography variant="caption" color="text.secondary">
                            Disponible
                          </Typography>
                          <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
                            {formatInventoryQuantity(product.quantity_on_hand, product.unit)} {product.unit}
                          </Typography>
                        </Paper>

                        <TextField
                          type="number"
                          label={`Cantidad a sacar (${product.unit})`}
                          value={quantities[product.id] || ""}
                          onChange={(event) => onQuantityChange(product, event.target.value)}
                          inputProps={{
                            min: 0,
                            max: Math.min(product.quantity_on_hand, MAX_INVENTORY_QUANTITY),
                            step: isIntegerUnit(product.unit) ? 1 : 0.001,
                          }}
                          fullWidth
                        />
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            {filteredProducts.length > ITEMS_PAGE_SIZE ? (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setPage((current) => Math.max(current - 1, 1))}
                onNext={() => setPage((current) => Math.min(current + 1, totalPages))}
                label={`Mostrando ${(currentPage - 1) * ITEMS_PAGE_SIZE + 1}-${Math.min(currentPage * ITEMS_PAGE_SIZE, filteredProducts.length)} de ${filteredProducts.length}`}
                sx={{ mt: 2 }}
              />
            ) : null}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, position: { lg: "sticky" }, top: { lg: 16 } }}>
            <Stack spacing={2}>
              <SectionHeader title="Resumen de salida" subtitle="Revisa antes de descontar inventario." />

              <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, bgcolor: "background.default" }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Productos
                    </Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{selectedProducts.length}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Cantidad total
                    </Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{formatInventoryQuantity(selectedTotal)}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {selectedProducts.length > 0 ? (
                <Stack spacing={1}>
                  {selectedProducts.map((product) => (
                    <Paper key={product.id} variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }} noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Disponible: {formatInventoryQuantity(product.quantity_on_hand, product.unit)} {product.unit}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 900 }}>
                          {formatInventoryQuantity(product.quantity, product.unit)} {product.unit}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">Aun no has seleccionado productos para salida.</Alert>
              )}

              <AppButton color="secondary" onClick={onSubmit} disabled={saving || loading}>
                {saving ? "Registrando..." : "Registrar salida a puerta"}
              </AppButton>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default DoorExitPage;
