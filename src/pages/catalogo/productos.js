import { useEffect, useState } from "react";
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import AppButton from "@core/components/ui/AppButton";
import CatalogListView from "views/modules/CatalogListView";

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
  const [yieldDialog, setYieldDialog] = useState({ open: false, product: null, value: "", error: null, saving: false });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, product: null, value: "", error: null, saving: false });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [response, categoriesResponse] = await Promise.all([
        catalogService.getProducts({ page: 1, pageSize: 200 }),
        catalogService.getProductCategories({ onlyActive: 1 }),
      ]);
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar el catalogo de productos");
        return;
      }
      setError(null);
      setItems(normalizeList(response.data));
      setCategories(normalizeList(categoriesResponse?.data ?? categoriesResponse));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Error de red al cargar productos"));
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId) => {
    return categories.find((category) => String(category.id) === String(categoryId))?.name;
  };

  useEffect(() => {
    loadProducts();
  }, []);

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
      />

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
