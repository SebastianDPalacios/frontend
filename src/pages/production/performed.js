import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@mui/material";
import ProductionIngredientUsagePanel from "components/organisms/production/ProductionIngredientUsagePanel";
import ProductionRegistrationForm from "components/organisms/production/ProductionRegistrationForm";
import toast from "react-hot-toast";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import productionService from "services/production/production-service";
import authService from "services/auth/auth-service";
import { canManageProduction } from "configs/access";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const createProductionRequestKey = () => `production:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

const ProductionPerformedPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [baker, setBaker] = useState(null);
  const [bakers, setBakers] = useState([]);
  const currentUser = authService.getCurrentUser() || {};
  const isAdministrator = canManageProduction(currentUser);
  const [usageRefreshKey, setUsageRefreshKey] = useState(0);
  const requestRef = useRef({ signature: "", key: "" });
  const [form, setForm] = useState({ bakerEmployeeId: "", branchId: "", productId: "", producedQuantity: "", producedDate: toDateInputValue(), retroactiveReason: "" });

  const products = useMemo(() => recipes.flatMap((recipe) => normalizeRows(recipe.outputs).map((output) => ({
    ...output,
    recipe_id: recipe.id,
    recipe_name: recipe.recipe_name || recipe.product_name || `Receta #${recipe.id}`,
    recipe_version: recipe.version_no,
    recipe_items: normalizeRows(recipe.items),
  }))).filter((product, index, rows) => rows.findIndex((row) => String(row.product_id) === String(product.product_id)) === index), [recipes]);
  const selectedProduct = useMemo(() => products.find((product) => String(product.product_id) === String(form.productId)) || null, [form.productId, products]);
  const ingredientPreview = useMemo(() => {
    const producedQuantity = Number(form.producedQuantity || 0);
    const expectedQuantity = Number(selectedProduct?.expected_quantity || 0);
    if (!selectedProduct || !Number.isInteger(producedQuantity) || producedQuantity <= 0 || expectedQuantity <= 0) return null;

    const factor = producedQuantity / expectedQuantity;
    const calculateIngredients = (items) => {
      const ingredients = new Map();
      items.forEach((item) => {
        const unit = item.raw_material_unit || "unidad";
        const key = `${item.raw_material_id}-${unit}`;
        const quantity = Number(item.quantity || 0) * factor * (1 + Number(item.wastage_percent || 0) / 100);
        const current = ingredients.get(key) || {
          id: item.raw_material_id,
          name: item.raw_material_name || "Ingrediente sin nombre",
          unit,
          quantity: 0,
        };
        current.quantity += quantity;
        ingredients.set(key, current);
      });
      return [...ingredients.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
    };

    const productGroups = new Map();
    normalizeRows(selectedProduct.items).forEach((item) => {
      const concept = String(item.concept || "ADEREZO").trim().toUpperCase();
      if (!productGroups.has(concept)) productGroups.set(concept, []);
      productGroups.get(concept).push(item);
    });

    const productIngredientGroups = [...productGroups.entries()].map(([concept, items]) => ({
      concept,
      ingredients: calculateIngredients(items),
    }));

    return {
      productName: selectedProduct.product_name,
      recipeName: selectedProduct.recipe_name,
      recipeVersion: selectedProduct.recipe_version,
      producedQuantity,
      batches: factor,
      baseIngredients: calculateIngredients(normalizeRows(selectedProduct.recipe_items)),
      productIngredientGroups,
      ingredients: calculateIngredients([
        ...normalizeRows(selectedProduct.recipe_items),
        ...normalizeRows(selectedProduct.items),
      ]),
    };
  }, [form.producedQuantity, selectedProduct]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productionService.getMyProductionBaseData();
      if (response?.code !== 1) throw new Error(response?.message || "No se pudieron cargar los datos de produccion.");
      const branchRows = normalizeRows(response.data?.branches);
      setBranches(branchRows);
      setRecipes(normalizeRows(response.data?.recipes));
      setBaker(response.data?.baker || null);
      setBakers(normalizeRows(response.data?.bakers));
      setForm((current) => ({ ...current, branchId: current.branchId || String(branchRows[0]?.id || "") }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar los datos de produccion."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveProduction = async () => {
    if (saving) return;
    const producedQuantity = Number(form.producedQuantity || 0);
    const yieldPerBatch = Number(selectedProduct?.expected_quantity || 0);
    if (!baker) return setError(isAdministrator ? "Selecciona el panadero responsable." : "Tu usuario debe tener un empleado panadero activo para registrar produccion.");
    if (!Number(form.branchId) || !selectedProduct) return setError("Selecciona la sucursal y el producto elaborado.");
    if (!Number.isInteger(producedQuantity) || producedQuantity <= 0) return setError("La cantidad producida debe ser un numero entero mayor a cero.");
    if (!Number.isFinite(yieldPerBatch) || yieldPerBatch <= 0) return setError("El producto no tiene un rendimiento valido en su receta vigente.");
    const today = toDateInputValue();
    if (form.producedDate > today) return setError("No se puede registrar produccion con fecha futura.");
    if (!isAdministrator && form.producedDate < today) return setError("Solo un administrador puede registrar produccion retroactiva.");
    if (isAdministrator && form.producedDate < today && form.retroactiveReason.trim().length < 5) return setError("Indica el motivo del registro retroactivo.");

    const requestPayload = {
      p_baker_employee_id: Number(baker.id),
      p_branch_id: Number(form.branchId),
      p_recipe_id: Number(selectedProduct.recipe_id),
      p_batch_quantity: producedQuantity / yieldPerBatch,
      p_produced_date: form.producedDate,
      p_retroactive_reason: form.producedDate < today ? form.retroactiveReason.trim() : null,
      p_outputs: [{ product_id: Number(selectedProduct.product_id), produced_quantity: producedQuantity }],
    };
    const signature = JSON.stringify(requestPayload);
    if (requestRef.current.signature !== signature) {
      requestRef.current = { signature, key: createProductionRequestKey() };
    }

    setSaving(true);
    setError(null);
    try {
      const response = await productionService.registerMyBatch({
        ...requestPayload,
        p_client_request_key: requestRef.current.key,
      });
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo registrar la produccion.");
      toast.success(response.message || "Produccion registrada");
      requestRef.current = { signature: "", key: "" };
      setForm((current) => ({ ...current, productId: "", producedQuantity: "", retroactiveReason: "" }));
      setUsageRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al registrar la produccion."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Produccion realizada" subtitle="Selecciona el producto e indica libremente las unidades completas elaboradas.">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando produccion...</Alert> : null}
      <ProductionRegistrationForm
        isAdministrator={isAdministrator}
        baker={baker}
        bakers={bakers}
        branches={branches}
        products={products}
        selectedProduct={selectedProduct}
        form={form}
        saving={saving}
        today={toDateInputValue()}
        onBakerChange={(bakerEmployeeId) => {
          setForm((current) => ({ ...current, bakerEmployeeId }));
          setBaker(bakers.find((item) => String(item.id) === String(bakerEmployeeId)) || null);
          setError(null);
        }}
        onFormChange={(field, value) => setForm((current) => ({
          ...current,
          [field]: value,
          ...(field === "producedDate" ? { retroactiveReason: "" } : {}),
        }))}
        onProductChange={(product) => setForm((current) => ({
          ...current,
          productId: product ? String(product.product_id) : "",
          producedQuantity: "",
        }))}
        onSubmit={saveProduction}
      />
      <ProductionIngredientUsagePanel
        branchId={form.branchId}
        referenceDate={form.producedDate}
        refreshKey={usageRefreshKey}
        preview={ingredientPreview}
      />
    </FlowPageLayout>
  );
};

export default ProductionPerformedPage;
