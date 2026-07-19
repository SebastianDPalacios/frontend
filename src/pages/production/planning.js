import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@mui/material";
import toast from "react-hot-toast";
import ProductionPlanAssignmentForm from "components/organisms/production/ProductionPlanAssignmentForm";
import ProductionPlanOverview from "components/organisms/production/ProductionPlanOverview";
import ProductionWorkDialog from "components/organisms/production/ProductionWorkDialog";
import authService from "services/auth/auth-service";
import catalogService from "services/catalog/catalog-service";
import employeesService from "services/employees/employees-service";
import productionService from "services/production/production-service";
import recipesService from "services/recipes/recipes-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const toDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateValue(date);
};

const emptyPlanRow = () => ({
  rowKey: `plan-${Date.now()}-${Math.random()}`,
  recipeId: "",
  arrobas: "1",
  productIds: [],
});

const groupRecipes = (rows) => {
  const grouped = new Map();
  rows.forEach((recipe) => {
    const key = String(recipe.id);
    const current = grouped.get(key) || {
      ...recipe,
      displayName: String(recipe.notes || "").split(/\s+-\s+/)[0] || recipe.product_name || `Receta #${recipe.id}`,
      outputs: [],
    };
    if (recipe.product_id) {
      current.outputs.push({
        product_id: recipe.product_id,
        product_name: recipe.product_name || `Producto #${recipe.product_id}`,
        expected_quantity: recipe.output_quantity,
      });
    }
    grouped.set(key, current);
  });
  return Array.from(grouped.values());
};
const buildProductionQuantities = (item) => normalizeRows(item?.outputs).reduce((acc, output) => {
  const expectedTotal = Math.round(Number(output.expected_quantity || 0) * Number(item?.arrobas || 1) * 1000) / 1000;
  acc[String(output.product_id)] = String(output.produced_quantity ?? expectedTotal);
  return acc;
}, {});

const buildProductionPayload = (item, quantities) => normalizeRows(item?.outputs).map((output) => ({
  product_id: Number(output.product_id),
  produced_quantity: Number(quantities[String(output.product_id)] || 0),
}));

const ProductionPlanningPage = () => {
  const currentUser = authService.getCurrentUser() || {};
  const canManage = (currentUser.roles || []).some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role))
    || (currentUser.permissions || []).includes("production.manage");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingItemId, setStartingItemId] = useState("");
  const [finishingItemId, setFinishingItemId] = useState("");
  const [workDialog, setWorkDialog] = useState({ plan: null, item: null, canFinish: true });
  const [productionQuantities, setProductionQuantities] = useState({});
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [bakers, setBakers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [myPlans, setMyPlans] = useState([]);
  const [form, setForm] = useState({
    branchId: "",
    bakerId: "",
    plannedDate: getTomorrow(),
    notes: "",
  });
  const [rows, setRows] = useState([emptyPlanRow()]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const commonRequests = [productionService.getMyPlans()];
      const adminRequests = canManage
        ? [
            recipesService.getList({ onlyActive: 1 }),
            catalogService.getBranches({ onlyActive: 1 }),
            employeesService.getEmployees({ status: "active", page: 1, pageSize: 200 }),
            productionService.getPlans(),
          ]
        : [];
      const responses = await Promise.all([...commonRequests, ...adminRequests]);
      const myPlansResponse = responses[0];

      if (myPlansResponse?.code !== 1) {
        setError(myPlansResponse?.message || "No se pudo cargar la planificaciÃ³n.");
        return;
      }

      setMyPlans(normalizeRows(myPlansResponse.data));

      if (canManage) {
        const recipeResponse = responses[1];
        if (recipeResponse?.code !== 1) {
          setError(recipeResponse?.message || "No se pudieron cargar las recetas vigentes.");
          return;
        }
        const branchRows = normalizeRows(responses[2]?.data);
        const employeeRows = normalizeRows(responses[3]?.data).filter((employee) => employee.job_type === "baker");
        setRecipes(groupRecipes(normalizeRows(recipeResponse.data)));
        setBranches(branchRows);
        setBakers(employeeRows);
        setPlans(normalizeRows(responses[4]?.data));
        setForm((current) => ({
          ...current,
          branchId: current.branchId || String(branchRows[0]?.id || ""),
          bakerId: current.bakerId || String(employeeRows[0]?.id || ""),
        }));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar la planificaciÃ³n."));
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateRow = (index, values) => setRows((current) => current.map((row, rowIndex) => (
    rowIndex === index ? { ...row, ...values } : row
  )));
  const moveRow = (index, direction) => setRows((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const totalArrobas = useMemo(
    () => rows.reduce((total, row) => total + Number(row.arrobas || 0), 0),
    [rows]
  );
  const selectedBaker = useMemo(
    () => bakers.find((baker) => String(baker.id) === String(form.bakerId)),
    [bakers, form.bakerId]
  );

  const savePlan = async () => {
    if (!form.branchId || !form.bakerId || !form.plannedDate) {
      setError("Selecciona sucursal, fecha y panadero.");
      return;
    }
    if (!rows.every((row) => row.recipeId && Number(row.arrobas || 0) > 0 && row.productIds.length > 0)) {
      setError("Completa cada receta, sus arrobas y al menos un producto final.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await productionService.createPlan({
        p_branch_id: Number(form.branchId),
        p_baker_employee_id: Number(form.bakerId),
        p_planned_date: form.plannedDate,
        p_notes: form.notes || null,
        p_items: rows.map((row) => ({
          recipe_id: Number(row.recipeId),
          arrobas: Number(row.arrobas),
          product_ids: row.productIds.map(Number),
        })),
      });
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo enviar el plan.");
        return;
      }
      toast.success(response.message || "Plan enviado al panadero");
      setRows([emptyPlanRow()]);
      setForm((current) => ({ ...current, notes: "" }));
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al enviar el plan."));
    } finally {
      setSaving(false);
    }
  };

  const openWorkDialog = (plan, item, options = {}) => {
    setProductionQuantities(buildProductionQuantities(item));
    setWorkDialog({ plan, item, canFinish: options.canFinish !== false });
  };

  const startPlanItem = async (productionPlanItemId) => {
    if (startingItemId) return;

    setStartingItemId(String(productionPlanItemId));
    setError(null);
    try {
      const response = await productionService.startPlanItem(productionPlanItemId);
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo iniciar la producciÃ³n.");
        return;
      }

      toast.success(response.message || "ProducciÃ³n iniciada");
      const ownerPlan = myPlans.find((plan) =>
        normalizeRows(plan.items).some((item) => String(item.id) === String(productionPlanItemId))
      );
      const ownerItem = normalizeRows(ownerPlan?.items).find(
        (item) => String(item.id) === String(productionPlanItemId)
      );
      openWorkDialog(ownerPlan, { ...ownerItem, started_at: new Date().toISOString() });
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al iniciar la producciÃ³n."));
    } finally {
      setStartingItemId("");
    }
  };

  const finishPlanItem = async (productionPlanItemId) => {
    if (finishingItemId) return;

    const currentItem = workDialog.item;
    const outputPayload = buildProductionPayload(currentItem, productionQuantities);
    if (!outputPayload.length || outputPayload.some((output) => !Number.isFinite(output.produced_quantity) || output.produced_quantity <= 0)) {
      setError("Todas las cantidades realizadas deben ser mayores a cero.");
      return;
    }

    setFinishingItemId(String(productionPlanItemId));
    setError(null);
    try {
      const response = await productionService.finishPlanItem(productionPlanItemId, { p_outputs: outputPayload });
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo finalizar la produccion.");
        return;
      }

      toast.success(response.message || "Produccion finalizada");
      setWorkDialog((current) => ({
        ...current,
        plan: current.plan ? { ...current.plan, status: "completed" } : current.plan,
        item: current.item
          ? {
              ...current.item,
              finished_at: new Date().toISOString(),
              production_batch_id: response.data?.production_batch_id,
              outputs: normalizeRows(current.item.outputs).map((output) => ({
                ...output,
                produced_quantity: productionQuantities[String(output.product_id)],
              })),
            }
          : current.item,
      }));
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al finalizar la produccion."));
    } finally {
      setFinishingItemId("");
    }
  };
  return (
    <FlowPageLayout
      title="ProducciÃ³n del dÃ­a siguiente"
      subtitle="Asigna recetas por arrobas y consulta las unidades esperadas para cada panadero."
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando planificaciÃ³n...</Alert> : null}

      {canManage ? (
        <ProductionPlanAssignmentForm
          branches={branches}
          bakers={bakers}
          recipes={recipes}
          form={form}
          rows={rows}
          totalArrobas={totalArrobas}
          selectedBaker={selectedBaker}
          saving={saving}
          loading={loading}
          formatNumber={formatNumber}
          onFormChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
          onDateChange={(value) => setForm((current) => ({ ...current, plannedDate: value }))}
          onRowChange={updateRow}
          onMoveRow={moveRow}
          onRemoveRow={(index) => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
          onAddRow={() => setRows((current) => [...current, emptyPlanRow()])}
          onSubmit={savePlan}
        />
      ) : null}

      <ProductionPlanOverview
        canManage={canManage}
        loading={loading}
        myPlans={myPlans}
        plans={plans}
        startingItemId={startingItemId}
        formatNumber={formatNumber}
        onStartItem={startPlanItem}
        onViewItem={openWorkDialog}
      />

      <ProductionWorkDialog
        open={Boolean(workDialog.item)}
        plan={workDialog.plan}
        item={workDialog.item}
        finishing={Boolean(finishingItemId)}
        canFinish={workDialog.canFinish}
        productionQuantities={productionQuantities}
        onQuantityChange={(productId, value) => setProductionQuantities((current) => ({ ...current, [String(productId)]: value }))}
        onClose={() => setWorkDialog({ plan: null, item: null, canFinish: true })}
        onFinish={finishPlanItem}
      />
    </FlowPageLayout>
  );
};

export default ProductionPlanningPage;



