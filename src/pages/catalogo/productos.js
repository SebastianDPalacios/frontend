import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import AppButton from "@core/components/ui/AppButton";
import CatalogListView from "views/modules/CatalogListView";
import PaginationControls from "components/molecules/PaginationControls";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
};

const ProductsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editDialog, setEditDialog] = useState({ open: false, product: null, values: {}, error: null, saving: false });
  const [yieldDialog, setYieldDialog] = useState({ open: false, product: null, value: "", error: null, saving: false });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, product: null, value: "", error: null, saving: false });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [response, categoriesResponse, taxRatesResponse] = await Promise.all([
        catalogService.getProducts({ page, pageSize, search: debouncedSearch }),
        catalogService.getProductCategories({ onlyActive: 1 }),
        catalogService.getTaxRates({ onlyActive: 0 }),
      ]);
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar el catalogo de productos");
        return;
      }
      setError(null);
      setItems(normalizeList(response.data));
      setTotal(Number(response.data?.total || 0));
      setCategories(normalizeList(categoriesResponse?.data ?? categoriesResponse));
      setTaxRates(normalizeList(taxRatesResponse?.data ?? taxRatesResponse));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Error de red al cargar productos"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize]);

  const getCategoryName = (categoryId) => {
    return categories.find((category) => String(category.id) === String(categoryId))?.name;
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const openEditDialog = (product) => setEditDialog({
    open: true,
    product,
    values: {
      name: product.name || "", description: product.description || "",
      category_id: String(product.category_id || ""), tax_rate_id: String(product.tax_rate_id || ""),
      unit: product.unit || "unit", base_price: String(product.base_price ?? ""),
      min_stock: String(product.min_stock ?? ""), units_per_bag: String(product.units_per_bag ?? ""),
      is_active: String(product.is_active ?? 1),
      includes_bonus: String(product.includes_bonus ?? 0),
    },
    error: null,
    saving: false,
  });

  const closeEditDialog = () => setEditDialog({ open: false, product: null, values: {}, error: null, saving: false });
  const setEditValue = (field, value) => setEditDialog((current) => ({ ...current, values: { ...current.values, [field]: value }, error: null }));
  const saveProduct = async () => {
    const values = editDialog.values;
    if (!values.name.trim() || !values.category_id) {
      setEditDialog((current) => ({ ...current, error: "Nombre y categoria son obligatorios" }));
      return;
    }
    setEditDialog((current) => ({ ...current, saving: true, error: null }));
    try {
      const result = await catalogService.updateProduct(editDialog.product.id, {
        p_name: values.name.trim(), p_description: values.description.trim() || null,
        p_category_id: Number(values.category_id), p_tax_rate_id: values.tax_rate_id ? Number(values.tax_rate_id) : null,
        p_unit: values.unit, p_base_price: Number(values.base_price || 0), p_min_stock: Number(values.min_stock || 0),
        p_units_per_bag: values.units_per_bag ? Number(values.units_per_bag) : null, p_is_active: Number(values.is_active),
        p_includes_bonus: Number(values.includes_bonus || 0),
      });
      if (result?.code !== 1) throw new Error(result?.message || "No se pudo actualizar el producto");
      toast.success("Producto actualizado");
      closeEditDialog();
      await loadProducts();
    } catch (requestError) {
      setEditDialog((current) => ({ ...current, saving: false, error: getApiErrorMessage(requestError, requestError.message) }));
    }
  };

  const openYieldDialog = (product) => {
    setYieldDialog({
      open: true,
      product,
      value: product?.units_per_bag ? String(product.units_per_bag) : "",
      error: null,
      saving: false,
    });
  };

  const closeYieldDialog = () => {
    setYieldDialog({ open: false, product: null, value: "", error: null, saving: false });
  };

  const saveYield = async () => {
    const numericValue = Number(yieldDialog.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setYieldDialog((current) => ({ ...current, error: "El rendimiento debe ser mayor que 0" }));
      return;
    }

    setYieldDialog((current) => ({ ...current, error: null, saving: true }));
    try {
      const result = await catalogService.updateProductYield(yieldDialog.product.id, {
        p_units_per_bag: numericValue,
      });

      if (result?.code !== 1) {
        setYieldDialog((current) => ({ ...current, error: result?.message || "No se pudo guardar el rendimiento", saving: false }));
        return;
      }

      toast.success(result?.message || "Rendimiento actualizado");
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === yieldDialog.product.id ? { ...item, units_per_bag: numericValue } : item
        )
      );
      closeYieldDialog();
    } catch (requestError) {
      setYieldDialog((current) => ({
        ...current,
        error: getApiErrorMessage(requestError, "Error de red al guardar el rendimiento"),
        saving: false,
      }));
    }
  };

  const openCategoryDialog = (product) => {
    setCategoryDialog({
      open: true,
      product,
      value: product?.category_id ? String(product.category_id) : "",
      error: null,
      saving: false,
    });
  };

  const closeCategoryDialog = () => {
    setCategoryDialog({ open: false, product: null, value: "", error: null, saving: false });
  };

  const saveProductCategory = async () => {
    if (!categoryDialog.value) {
      setCategoryDialog((current) => ({ ...current, error: "Selecciona una categoria activa" }));
      return;
    }

    const product = categoryDialog.product;
    setCategoryDialog((current) => ({ ...current, error: null, saving: true }));
    try {
      const result = await catalogService.updateProduct(product.id, {
        p_name: product.name,
        p_description: product.description || null,
        p_category_id: Number(categoryDialog.value),
        p_tax_rate_id: product.tax_rate_id ? Number(product.tax_rate_id) : null,
        p_unit: product.unit,
        p_base_price: Number(product.base_price || 0),
        p_min_stock: Number(product.min_stock || 0),
        p_units_per_bag: product.units_per_bag ? Number(product.units_per_bag) : null,
        p_is_active: Number(product.is_active ?? 1),
        p_includes_bonus: Number(product.includes_bonus || 0),
      });

      if (result?.code !== 1) {
        setCategoryDialog((current) => ({ ...current, error: result?.message || "No se pudo asignar la categoria", saving: false }));
        return;
      }

      toast.success("Categoria asignada al producto");
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === product.id ? { ...item, category_id: Number(categoryDialog.value) } : item
        )
      );
      closeCategoryDialog();
    } catch (requestError) {
      setCategoryDialog((current) => ({
        ...current,
        error: getApiErrorMessage(requestError, "Error de red al asignar categoria"),
        saving: false,
      }));
    }
  };

  return (
    <>
      <CatalogListView
        title="Productos"
        subtitle="Productos disponibles para venta, produccion e inventario."
        loading={loading}
        error={error}
        items={items}
        nameField="name"
        createHref="/catalogo/nuevo-producto"
        createLabel="Nuevo producto"
        searchPlaceholder="Buscar producto por nombre, SKU o codigo"
        typeLabel="Producto"
        showProductCategory
        getCategoryName={getCategoryName}
        onAssignCategory={openCategoryDialog}
        showProductYield
        onEditYield={openYieldDialog}
        onEdit={openEditDialog}
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        totalItems={total}
        pagination={(
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="center">
            <TextField select size="small" label="Por pagina" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} sx={{ minWidth: 130 }}>
              {[10, 20, 50, 100].map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
            </TextField>
            <PaginationControls currentPage={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} onPrevious={() => setPage((value) => value - 1)} onNext={() => setPage((value) => value + 1)} />
          </Stack>
        )}
      />

      <Dialog
        open={editDialog.open}
        onClose={editDialog.saving ? undefined : closeEditDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
      >
        <Box sx={{ px: { xs: 2.5, md: 4 }, py: 3, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: "secondary.main", color: "secondary.contrastText", display: "grid", placeItems: "center" }}>
                <EditOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>Editar producto</Typography>
                <Typography variant="body2" color="text.secondary">Actualiza su informacion comercial y operativa.</Typography>
              </Box>
            </Stack>
            <Chip label={`SKU: ${editDialog.product?.sku || "Sin SKU"}`} variant="outlined" color="secondary" sx={{ fontWeight: 800 }} />
          </Stack>
        </Box>
        <DialogContent sx={{ px: { xs: 2.5, md: 4 }, py: 3 }}>
          <Stack spacing={3}>
            {editDialog.error ? <Alert severity="error">{editDialog.error}</Alert> : null}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>Datos basicos</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField fullWidth label="Nombre" value={editDialog.values.name || ""} onChange={(e) => setEditValue("name", e.target.value)} required />
              <TextField fullWidth label="SKU (no editable)" value={editDialog.product?.sku || ""} disabled />
            </Stack>
            <TextField fullWidth label="Descripcion" value={editDialog.values.description || ""} onChange={(e) => setEditValue("description", e.target.value)} sx={{ mt: 2 }} />
            </Box>
            <Divider />
            <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>Clasificacion</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select fullWidth label="Categoria" value={editDialog.values.category_id || ""} onChange={(e) => setEditValue("category_id", e.target.value)}>{categories.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}</TextField>
              <TextField select fullWidth label="Tasa de impuesto" value={editDialog.values.tax_rate_id || ""} onChange={(e) => setEditValue("tax_rate_id", e.target.value)}><MenuItem value="">Sin impuesto</MenuItem>{taxRates.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name} ({item.rate_percent}%)</MenuItem>)}</TextField>
              <TextField select fullWidth label="Unidad" value={editDialog.values.unit || "unit"} onChange={(e) => setEditValue("unit", e.target.value)}>{[["unit", "Unidad"], ["kg", "Kilogramo"], ["g", "Gramo"], ["lb", "Libra"]].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
            </Stack>
            </Box>
            <Divider />
            <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>Operacion</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField fullWidth type="number" label="Precio base" value={editDialog.values.base_price || ""} onChange={(e) => setEditValue("base_price", e.target.value)} inputProps={{ min: 0 }} />
              <TextField fullWidth type="number" label="Stock minimo" value={editDialog.values.min_stock || ""} onChange={(e) => setEditValue("min_stock", e.target.value)} inputProps={{ min: 0 }} />
              <TextField fullWidth type="number" label="Unidades por bulto" value={editDialog.values.units_per_bag || ""} onChange={(e) => setEditValue("units_per_bag", e.target.value)} inputProps={{ min: 0.001, step: 0.001 }} />
              <TextField select fullWidth label="Estado" value={editDialog.values.is_active || "1"} onChange={(e) => setEditValue("is_active", e.target.value)}><MenuItem value="1">Activo</MenuItem><MenuItem value="0">Inactivo</MenuItem></TextField>
              <TextField select fullWidth label="Incluye vendaje" value={editDialog.values.includes_bonus || "0"} onChange={(e) => setEditValue("includes_bonus", e.target.value)}><MenuItem value="0">No</MenuItem><MenuItem value="1">Si</MenuItem></TextField>
            </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, md: 4 }, py: 2.5, bgcolor: "background.default", borderTop: "1px solid", borderColor: "divider", gap: 1 }}><AppButton variant="outlined" color="secondary" onClick={closeEditDialog} disabled={editDialog.saving}>Cancelar</AppButton><AppButton color="secondary" onClick={saveProduct} loading={editDialog.saving} loadingLabel="Guardando...">Guardar cambios</AppButton></DialogActions>
      </Dialog>

      <Dialog open={yieldDialog.open} onClose={yieldDialog.saving ? undefined : closeYieldDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Rendimiento por bulto</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {yieldDialog.product?.name || "Producto"}: unidades que salen de un bulto.
            </Typography>
            {yieldDialog.error ? <Alert severity="error">{yieldDialog.error}</Alert> : null}
            <TextField
              autoFocus
              fullWidth
              label="Unidades por bulto"
              type="number"
              value={yieldDialog.value}
              onChange={(event) => setYieldDialog((current) => ({ ...current, value: event.target.value, error: null }))}
              inputProps={{ min: 0.001, step: "0.001" }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" color="secondary" onClick={closeYieldDialog} disabled={yieldDialog.saving}>
            Cancelar
          </AppButton>
          <AppButton color="secondary" onClick={saveYield} loading={yieldDialog.saving} loadingLabel="Guardando...">
            Guardar
          </AppButton>
        </DialogActions>
      </Dialog>

      <Dialog open={categoryDialog.open} onClose={categoryDialog.saving ? undefined : closeCategoryDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Asignar categoria</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {categoryDialog.product?.name || "Producto"}: selecciona la categoria comercial del producto final.
            </Typography>
            {categoryDialog.error ? <Alert severity="error">{categoryDialog.error}</Alert> : null}
            <TextField
              select
              autoFocus
              fullWidth
              label="Categoria"
              value={categoryDialog.value}
              onChange={(event) => setCategoryDialog((current) => ({ ...current, value: event.target.value, error: null }))}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" color="secondary" onClick={closeCategoryDialog} disabled={categoryDialog.saving}>
            Cancelar
          </AppButton>
          <AppButton color="secondary" onClick={saveProductCategory} loading={categoryDialog.saving} loadingLabel="Guardando...">
            Guardar
          </AppButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProductsPage;
