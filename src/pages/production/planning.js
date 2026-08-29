import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import toast from "react-hot-toast";
import ProductionPlanAssignmentForm from "components/organisms/production/ProductionPlanAssignmentForm";
import ProductionPlanDesktopForm from "components/organisms/production/ProductionPlanDesktopForm";
import ProductionPlanOverview from "components/organisms/production/ProductionPlanOverview";
import ProductionWorkDialog from "components/organisms/production/ProductionWorkDialog";
import AppButton from "@core/components/ui/AppButton";
import authService from "services/auth/auth-service";
import { isProductionOnlyUser } from "configs/access";
import catalogService from "services/catalog/catalog-service";
import employeesService from "services/employees/employees-service";
import productionService from "services/production/production-service";
import recipesService from "services/recipes/recipes-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const arrobaFormatter = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatArrobas = (value) => arrobaFormatter.format(Number(value || 0));
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
  productId: "",
  recipeId: "",
  requestMode: "units",
  requestedQuantity: "",
  unitsPerTray: "",
  trayCount: "",
  looseUnits: "",
  detailsOpen: false,
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

const getRecipeOutput = (recipes, row) => {
  const recipe = recipes.find((item) => String(item.id) === String(row.recipeId));
  const output = recipe?.outputs?.find((item) => String(item.product_id) === String(row.productId));
  return { recipe, output };
};

const calculatePlanRow = (recipes, row) => {
  const { recipe, output } = getRecipeOutput(recipes, row);
  const requestedQuantity = Number(row.requestedQuantity || 0);
  const yieldPerArroba = Number(output?.expected_quantity || 0);
  const estimatedUnits = row.requestMode === "units"
    ? requestedQuantity
    : row.requestMode === "bags" ? 0 : requestedQuantity * yieldPerArroba;
  const plannedArrobas = row.requestMode === "bags" ? 0 : row.requestMode === "arrobas" ? requestedQuantity : estimatedUnits / yieldPerArroba;
  return {
    recipe,
    output,
    plannedArrobas: Number.isFinite(plannedArrobas) ? plannedArrobas : 0,
    estimatedUnits: Number.isFinite(estimatedUnits) ? estimatedUnits : 0,
  };
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
  const theme = useTheme();
  const useCompactPlanning = useMediaQuery(theme.breakpoints.down("lg"));
  const currentUser = authService.getCurrentUser() || {};
  const isAdministrator = (currentUser.roles || []).some((role) => {
    const code = typeof role === "string" ? role : role?.code || role?.name;
    return ["ADMIN", "SUPER_ADMIN"].includes(String(code || "").toUpperCase());
  });
  const canManage = isAdministrator || isProductionOnlyUser(currentUser) || (currentUser.permissions || []).includes("production.manage");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [cancellingPlanId, setCancellingPlanId] = useState("");
  const [planToCancel, setPlanToCancel] = useState(null);
  const [formResetToken, setFormResetToken] = useState(0);
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
      const commonRequests = [productionService.getMyPlans(), productionService.getMyProductionBaseData()];
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
      const myBaseResponse = responses[1];

      if (myPlansResponse?.code !== 1) {
        setError(myPlansResponse?.message || "No se pudo cargar la planificación.");
        return;
      }

      setMyPlans(normalizeRows(myPlansResponse.data));

      if (myBaseResponse?.code === 1) {
        const myBranchRows = normalizeRows(myBaseResponse.data?.branches);
        const myRecipeRows = normalizeRows(myBaseResponse.data?.recipes).map((recipe) => ({
          ...recipe,
          displayName: String(recipe.notes || "").split(/\s+-\s+/)[0]
            || recipe.product_name
            || `Receta #${recipe.id}`,
          outputs: normalizeRows(recipe.outputs),
        }));
        const myBaker = myBaseResponse.data?.baker;
        if (!canManage) {
          setBranches(myBranchRows);
          setRecipes(myRecipeRows);
          setBakers(myBaker ? [myBaker] : []);
        }
      }

      if (canManage) {
        const recipeResponse = responses[2];
        if (recipeResponse?.code !== 1) {
          setError(recipeResponse?.message || "No se pudieron cargar las recetas vigentes.");
          return;
        }
        const branchRows = normalizeRows(responses[3]?.data);
        const employeeRows = normalizeRows(responses[4]?.data).filter((employee) => employee.job_type === "baker");
        setRecipes(groupRecipes(normalizeRows(recipeResponse.data)));
        setBranches(branchRows);
        setBakers(employeeRows);
        setPlans(normalizeRows(responses[5]?.data));
        setForm((current) => ({
          ...current,
          branchId: current.branchId || String(branchRows[0]?.id || ""),
          bakerId: current.bakerId || String(employeeRows[0]?.id || ""),
        }));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar la planificación."));
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

  const planSummary = useMemo(() => {
    const recipeGroups = new Map();
    const products = rows.map((row) => {
      const calculated = calculatePlanRow(recipes, row);
      if (calculated.recipe && calculated.output && row.requestMode !== "bags") {
        const key = String(calculated.recipe.id);
        const current = recipeGroups.get(key) || {
          recipeId: calculated.recipe.id,
          recipeName: calculated.recipe.displayName,
          plannedArrobas: 0,
        };
        current.plannedArrobas += calculated.plannedArrobas;
        recipeGroups.set(key, current);
      }
      return { ...row, ...calculated };
    });
    return { products, recipeGroups: Array.from(recipeGroups.values()) };
  }, [recipes, rows]);
  const totalArrobas = useMemo(
    () => planSummary.products.reduce((total, row) => total + row.plannedArrobas, 0),
    [planSummary]
  );
  const selectedBaker = useMemo(
    () => bakers.find((baker) => String(baker.id) === String(form.bakerId)),
    [bakers, form.bakerId]
  );

  const resetPlanForm = () => {
    setEditingPlanId("");
    setFormResetToken((current) => current + 1);
    setRows([emptyPlanRow()]);
    setForm((current) => ({
      ...current,
      branchId: canManage ? current.branchId : String(branches[0]?.id || ""),
      bakerId: canManage ? current.bakerId : String(bakers[0]?.id || ""),
      plannedDate: getTomorrow(),
      notes: "",
    }));
  };

  const planCanBeEdited = (plan) => !["completed", "cancelled"].includes(plan.status)
    && normalizeRows(plan.items).every((item) => !item.started_at && !item.production_batch_id)
    && normalizeRows(plan.items).every((item) => normalizeRows(item.outputs).every(
      (output) => Number(output.reserved_quantity || 0) === 0 && Number(output.direct_delivered_quantity || 0) === 0
    ));
  const currentUserId = Number(currentUser.user_id || currentUser.userId || currentUser.id);
  const userCanEditPlan = (plan) => (
    isAdministrator
    || Number(plan.created_by) === currentUserId
    || Number(plan.baker_user_id) === currentUserId
  );

  const editPlan = (plan) => {
    if (!planCanBeEdited(plan)) {
      setError("El plan ya tiene producción iniciada o reservas asociadas y no puede modificarse.");
      return;
    }
    setEditingPlanId(String(plan.id));
    setForm({
      branchId: String(plan.branch_id || ""),
      bakerId: String(plan.baker_employee_id || ""),
      plannedDate: String(plan.planned_date || "").split("T")[0],
      notes: plan.notes || "",
    });
    const assignments = normalizeRows(plan.product_assignments);
    const sourceRows = assignments.length
      ? assignments
      : normalizeRows(plan.items).flatMap((item) => normalizeRows(item.outputs).map((output) => ({
          ...output,
          recipe_id: item.recipe_id,
          request_mode: "arrobas",
          requested_quantity: item.arrobas,
        })));
    setRows(sourceRows.map((assignment, index) => ({
      rowKey: `plan-${plan.id}-${assignment.production_plan_output_id || index}`,
      productId: String(assignment.product_id || ""),
      recipeId: String(assignment.recipe_id || ""),
      requestMode: assignment.request_mode || "arrobas",
      requestedQuantity: String(assignment.requested_quantity || ""),
      unitsPerTray: String(assignment.units_per_tray ?? ""),
      trayCount: String(assignment.tray_count ?? ""),
      looseUnits: String(assignment.loose_units ?? ""),
      detailsOpen: false,
    })));
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const savePlan = async () => {
    if (!form.branchId || !form.bakerId || !form.plannedDate) {
      setError("Selecciona sucursal, fecha y panadero.");
      return;
    }
    if (!rows.every((row) => row.recipeId && row.productId && Number(row.requestedQuantity || 0) > 0)) {
      setError("Completa el producto, el tipo de solicitud y la cantidad de cada fila.");
      return;
    }
    if (new Set(rows.map((row) => String(row.productId))).size !== rows.length) {
      setError("Un producto no puede aparecer dos veces dentro del mismo plan.");
      return;
    }
    if (rows.some((row) => ["units", "bags"].includes(row.requestMode) && !Number.isInteger(Number(row.requestedQuantity)))) {
      setError("Las solicitudes por unidades o bultos deben usar cantidades enteras.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        p_branch_id: Number(form.branchId),
        p_baker_employee_id: Number(form.bakerId),
        p_planned_date: form.plannedDate,
        p_notes: form.notes || null,
        p_items: rows.map((row) => ({
          product_id: Number(row.productId),
          recipe_id: Number(row.recipeId),
          request_mode: row.requestMode,
          requested_quantity: Number(row.requestedQuantity),
          units_per_tray: row.unitsPerTray === "" ? null : Number(row.unitsPerTray),
          tray_count: row.trayCount === "" ? null : Number(row.trayCount),
          loose_units: row.looseUnits === "" ? null : Number(row.looseUnits),
        })),
      };
      const response = editingPlanId
        ? await productionService.updatePlan(editingPlanId, payload)
        : await productionService.createPlan(payload);
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo enviar el plan.");
        return;
      }
      toast.success(response.message || (editingPlanId ? "Plan actualizado" : "Plan enviado al panadero"));
      resetPlanForm();
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
        setError(response?.message || "No se pudo iniciar la producción.");
        return;
      }

      toast.success(response.message || "Producción iniciada");
      const ownerPlan = myPlans.find((plan) =>
        normalizeRows(plan.items).some((item) => String(item.id) === String(productionPlanItemId))
      );
      const ownerItem = normalizeRows(ownerPlan?.items).find(
        (item) => String(item.id) === String(productionPlanItemId)
      );
      openWorkDialog(ownerPlan, { ...ownerItem, started_at: new Date().toISOString() });
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al iniciar la producción."));
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

  const cancelPlan = async (plan) => {
    if (cancellingPlanId) return;
    setCancellingPlanId(String(plan.id));
    setError(null);
    try {
      const response = await productionService.cancelPlan(plan.id);
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo cancelar el plan.");
      toast.success(response.message || "Plan informativo cancelado");
      setPlanToCancel(null);
      if (String(editingPlanId) === String(plan.id)) resetPlanForm();
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cancelar el plan."));
    } finally {
      setCancellingPlanId("");
    }
  };
  return (
    <FlowPageLayout
      title="Producción del día siguiente"
      subtitle="Planifica cada producto por unidades, arrobas o bultos; el sistema utiliza internamente su receta vigente."
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando planificación...</Alert> : null}

      {canManage || editingPlanId ? (
        useCompactPlanning ? <ProductionPlanAssignmentForm
          branches={branches}
          bakers={bakers}
          recipes={recipes}
          form={form}
          rows={rows}
          totalArrobas={totalArrobas}
          summary={planSummary}
          selectedBaker={selectedBaker}
          saving={saving}
          loading={loading}
          formatNumber={formatNumber}
          formatArrobas={formatArrobas}
          onFormChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
          onDateChange={(value) => setForm((current) => ({ ...current, plannedDate: value }))}
          onRowChange={updateRow}
          onMoveRow={moveRow}
          onRemoveRow={(index) => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
          onAddRow={() => setRows((current) => [...current, emptyPlanRow()])}
          onSubmit={savePlan}
          editing={Boolean(editingPlanId)}
          onCancelEdit={resetPlanForm}
          resetToken={formResetToken}
        /> : <ProductionPlanDesktopForm
          branches={branches}
          bakers={bakers}
          recipes={recipes}
          form={form}
          rows={rows}
          totalArrobas={totalArrobas}
          summary={planSummary}
          selectedBaker={selectedBaker}
          saving={saving}
          loading={loading}
          formatNumber={formatNumber}
          formatArrobas={formatArrobas}
          onFormChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
          onDateChange={(value) => setForm((current) => ({ ...current, plannedDate: value }))}
          onRowChange={updateRow}
          onMoveRow={moveRow}
          onRemoveRow={(index) => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
          onAddRow={() => setRows((current) => [...current, emptyPlanRow()])}
          onSubmit={savePlan}
          editing={Boolean(editingPlanId)}
          onCancelEdit={resetPlanForm}
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
        onEditPlan={editPlan}
        onCancelPlan={setPlanToCancel}
        cancellingPlanId={cancellingPlanId}
        canEditPlan={userCanEditPlan}
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

      <Dialog
        open={Boolean(planToCancel)}
        onClose={() => !cancellingPlanId && setPlanToCancel(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
      >
        <Box sx={{ height: 7, bgcolor: "error.main" }} />
        <DialogTitle sx={{ px: { xs: 2.5, sm: 3 }, pt: 3, pb: 1, fontWeight: 950 }}>
          Cancelar lista informativa
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: "8px !important" }}>
          <Stack spacing={2}>
            <Typography color="text.secondary">
              Esta accion no elimina produccion ni modifica inventario. El panadero dejara de ver esta lista como vigente.
            </Typography>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
              <Typography sx={{ fontWeight: 900 }}>{planToCancel?.baker_name || "Panadero asignado"}</Typography>
              <Typography variant="body2" color="text.secondary">
                {String(planToCancel?.planned_date || "").split("T")[0]} · {planToCancel?.branch_name || "Sucursal"}
              </Typography>
            </Box>
            <Alert severity="warning">Podras consultar esta lista en el historial, pero ya no podra editarse.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2.5, sm: 3 }, pt: 1, gap: 1, flexDirection: { xs: "column-reverse", sm: "row" } }}>
          <AppButton
            fullWidth
            variant="outlined"
            color="inherit"
            disabled={Boolean(cancellingPlanId)}
            onClick={() => setPlanToCancel(null)}
          >
            Volver
          </AppButton>
          <AppButton
            fullWidth
            color="error"
            disabled={Boolean(cancellingPlanId)}
            onClick={() => cancelPlan(planToCancel)}
          >
            {cancellingPlanId ? "Cancelando..." : "Si, cancelar lista"}
          </AppButton>
        </DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default ProductionPlanningPage;



