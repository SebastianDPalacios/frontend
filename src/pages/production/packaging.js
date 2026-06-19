import { useEffect, useMemo, useState } from "react";
import { Alert, Grid } from "@mui/material";
import toast from "react-hot-toast";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import PackagingBatchWorkPanel from "components/organisms/production/PackagingBatchWorkPanel";
import PackingReadyPanel from "components/organisms/production/PackingReadyPanel";
import PendingPackagingBatches from "components/organisms/production/PendingPackagingBatches";
import ProductionBatchCreatePanel from "components/organisms/production/ProductionBatchCreatePanel";
import catalogService from "services/catalog/catalog-service";
import employeesService from "services/employees/employees-service";
import productionService from "services/production/production-service";
import recipesService from "services/recipes/recipes-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

const formatNumber = (value) => numberFormatter.format(Number(value || 0));

const formatUnits = (value) => {
  const numberValue = Number(value || 0);
  const rounded = Math.round(numberValue);

  if (Math.abs(numberValue - rounded) < 0.01) {
    return numberFormatter.format(rounded);
  }

  return numberFormatter.format(numberValue);
};

const getTodayInputValue = () => toDateInputValue();

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const getRecipeName = (recipe) => {
  const notes = String(recipe?.notes || "").trim();
  return notes.split(/\s+-\s+/)[0] || recipe?.product_name || `Receta #${recipe?.id || ""}`;
};

const uniqueRecipes = (rows) => {
  const grouped = new Map();

  rows.forEach((recipe) => {
    const key = Number(recipe.id);
    const current = grouped.get(key) || {
      ...recipe,
      outputs: [],
    };

    if (recipe.product_id) {
      current.outputs.push({
        product_id: recipe.product_id,
        product_name: recipe.product_name,
        product_sku: recipe.product_sku,
        expected_quantity: recipe.output_quantity,
      });
    }

    grouped.set(key, current);
  });

  return Array.from(grouped.values());
};

const getPendingQty = (item) =>
  Math.max(
    Number(item?.pending_quantity || 0),
    Number(item?.produced_quantity || 0)
      - Number(item?.packed_quantity || 0)
      - Number(item?.damaged_quantity || 0)
      - Number(item?.missing_quantity || 0)
      - Number(item?.direct_delivered_quantity || 0)
      - Number(item?.reserved_quantity || 0),
    0
  );

const batchStatusLabels = {
  pending_packaging: "Pendiente",
  partially_packed: "Parcial",
  packed: "Empacado",
  cancelled: "Cancelado",
};

const formatShortDate = (value) => {
  if (!value) {
    return "-";
  }

  const [date] = String(value).split("T");
  return date;
};

const ProductionPackagingPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pendingBatches, setPendingBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingBatch, setSavingBatch] = useState(false);
  const [savingPacking, setSavingPacking] = useState(false);
  const [batchForm, setBatchForm] = useState({
    branchId: "",
    recipeId: "",
    bakerId: "",
    producedDate: getTodayInputValue(),
    batchQuantity: "1",
    notes: "",
  });
  const [selectedRecipeOutputIds, setSelectedRecipeOutputIds] = useState([]);
  const [packingForm, setPackingForm] = useState({
    packerId: "",
    packedDate: getTodayInputValue(),
    notes: "",
  });
  const [packingRows, setPackingRows] = useState({});

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [branchesResponse, recipesResponse, employeesResponse, pendingResponse] =
          await Promise.all([
            catalogService.getBranches({ onlyActive: 1 }),
            recipesService.getList({ onlyActive: 1 }),
            employeesService.getEmployees({ status: "active", page: 1, pageSize: 200 }),
            productionService.getPendingPackaging(),
          ]);

        if (branchesResponse?.code !== 1) {
          setError(branchesResponse?.message || "No se pudieron cargar sucursales");
          return;
        }
        if (recipesResponse?.code !== 1) {
          setError(recipesResponse?.message || "No se pudieron cargar recetas");
          return;
        }
        if (employeesResponse?.code !== 1) {
          setError(employeesResponse?.message || "No se pudieron cargar empleados");
          return;
        }
        if (pendingResponse?.code !== 1) {
          setError(pendingResponse?.message || "No se pudieron cargar pendientes de empaque");
          return;
        }

        const branchRows = normalizeRows(branchesResponse.data);
        const recipeRows = uniqueRecipes(Array.isArray(recipesResponse.data) ? recipesResponse.data : normalizeRows(recipesResponse.data));
        const employeeRows = normalizeRows(employeesResponse.data);
        const pendingRows = normalizeRows(pendingResponse.data);

        setBranches(branchRows);
        setRecipes(recipeRows);
        setEmployees(employeeRows);
        setPendingBatches(pendingRows);
        setBatchForm((current) => ({
          ...current,
          branchId: current.branchId || (branchRows[0]?.id ? String(branchRows[0].id) : ""),
          recipeId: current.recipeId || (recipeRows[0]?.id ? String(recipeRows[0].id) : ""),
          bakerId:
            current.bakerId ||
            (employeeRows.find((employee) => employee.job_type === "baker")?.id
              ? String(employeeRows.find((employee) => employee.job_type === "baker").id)
              : ""),
        }));
        setPackingForm((current) => ({
          ...current,
          packerId:
            current.packerId ||
            (employeeRows.find((employee) => employee.job_type === "packer")?.id
              ? String(employeeRows.find((employee) => employee.job_type === "packer").id)
              : ""),
        }));
        setSelectedBatchId((current) => {
          if (pendingRows.some((batch) => String(batch.production_batch_id) === String(current))) {
            return current;
          }
          return pendingRows[0]?.production_batch_id ? String(pendingRows[0].production_batch_id) : "";
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar conteo y empaque"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [refreshKey]);

  const selectedBatch = useMemo(
    () => pendingBatches.find((batch) => String(batch.production_batch_id) === String(selectedBatchId)) || null,
    [pendingBatches, selectedBatchId]
  );
  const selectedRecipe = recipes.find((recipe) => String(recipe.id) === String(batchForm.recipeId)) || null;
  const selectedRecipeOutputs = useMemo(() => selectedRecipe?.outputs || [], [selectedRecipe]);

  const selectedItems = useMemo(() => normalizeRows(selectedBatch?.items), [selectedBatch]);
  const selectedOutput = selectedItems.find((item) => String(item.production_batch_output_id) === String(selectedOutputId)) || selectedItems[0] || null;
  const bakers = employees.filter((employee) => employee.job_type === "baker");
  const packers = employees.filter((employee) => employee.job_type === "packer");
  const totalPending = selectedItems.reduce((acc, item) => acc + getPendingQty(item), 0);
  const totalPacked = selectedItems.reduce((acc, item) => acc + Number(packingRows[item.production_batch_output_id]?.packed_quantity || 0), 0);
  const totalDamaged = selectedItems.reduce((acc, item) => acc + Number(packingRows[item.production_batch_output_id]?.damaged_quantity || 0), 0);
  const totalMissing = selectedItems.reduce((acc, item) => acc + Number(packingRows[item.production_batch_output_id]?.missing_quantity || 0), 0);

  useEffect(() => {
    setSelectedOutputId((current) => {
      if (selectedItems.some((item) => String(item.production_batch_output_id) === String(current))) {
        return current;
      }
      return selectedItems[0]?.production_batch_output_id ? String(selectedItems[0].production_batch_output_id) : "";
    });

    setPackingRows((current) => {
      const next = {};
      selectedItems.forEach((item) => {
        const key = item.production_batch_output_id;
        next[key] = current[key] || {
          packed_quantity: "",
          damaged_quantity: "",
          missing_quantity: "",
          damage_reason: "packaging",
          missing_reason: "count_difference",
          notes: "",
        };
      });
      return next;
    });
  }, [selectedBatchId, selectedItems]);

  useEffect(() => {
    setSelectedRecipeOutputIds((current) => {
      const availableIds = selectedRecipeOutputs.map((output) => String(output.product_id));
      const stillValid = current.filter((id) => availableIds.includes(String(id)));

      if (stillValid.length > 0) {
        return stillValid;
      }

      return availableIds;
    });
  }, [batchForm.recipeId, selectedRecipeOutputs]);

  const createBatch = async () => {
    if (savingBatch) {
      return;
    }

    if (!batchForm.branchId || !batchForm.recipeId || !batchForm.bakerId || Number(batchForm.batchQuantity || 0) <= 0) {
      setError("Completa sucursal, receta, panadero y cantidad de arrobas");
      return;
    }

    if (selectedRecipeOutputIds.length === 0) {
      setError("Selecciona al menos un producto final para realizar");
      return;
    }

    setSavingBatch(true);
    setError(null);
    try {
      const result = await productionService.registerBatch({
        p_branch_id: Number(batchForm.branchId),
        p_recipe_id: Number(batchForm.recipeId),
        p_baker_employee_id: Number(batchForm.bakerId),
        p_produced_date: batchForm.producedDate || getTodayInputValue(),
        p_batch_quantity: Number(batchForm.batchQuantity),
        p_outputs: selectedRecipeOutputIds.map((productId) => ({ product_id: Number(productId) })),
        p_notes: batchForm.notes || null,
      });

      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo crear lote pendiente");
        setError(result?.message || "No se pudo crear lote pendiente");
        return;
      }

      toast.success(result?.message || "Lote pendiente creado");
      setBatchForm((current) => ({ ...current, notes: "", batchQuantity: "1" }));
      const createdId = result?.data?.production_batch_id;
      setRefreshKey((value) => value + 1);
      if (createdId) {
        setSelectedBatchId(String(createdId));
      }
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Error de red al crear lote");
      toast.error(message);
      setError(message);
    } finally {
      setSavingBatch(false);
    }
  };

  const createPackingReport = async () => {
    if (savingPacking || !selectedBatch) {
      return;
    }

    if (!packingForm.packerId) {
      setError("Selecciona el empaquetador");
      return;
    }

    const items = selectedItems
      .map((item) => {
        const row = packingRows[item.production_batch_output_id] || {};
        return {
          production_batch_output_id: Number(item.production_batch_output_id),
          packed_quantity: Number(row.packed_quantity || 0),
          damaged_quantity: Number(row.damaged_quantity || 0),
          missing_quantity: Number(row.missing_quantity || 0),
          damage_reason: row.damage_reason || "packaging",
          missing_reason: row.missing_reason || "count_difference",
          notes: row.notes || null,
        };
      })
      .filter((item) => item.packed_quantity > 0 || item.damaged_quantity > 0 || item.missing_quantity > 0);

    if (items.length === 0) {
      setError("Registra al menos una cantidad empacada, dañada o faltante");
      return;
    }

    const unjustifiedMissing = items.some(
      (item) => item.missing_quantity > 0 && (!item.missing_reason || !String(item.notes || "").trim())
    );

    if (unjustifiedMissing) {
      setError("Todo faltante debe incluir un motivo y una explicación");
      return;
    }

    const exceedsPending = items.some((item) => {
      const source = selectedItems.find((selectedItem) => Number(selectedItem.production_batch_output_id) === item.production_batch_output_id);
      return item.packed_quantity + item.damaged_quantity + item.missing_quantity > getPendingQty(source);
    });

    if (exceedsPending) {
      setError("La suma de empacados, dañados y faltantes supera el pendiente");
      return;
    }

    setSavingPacking(true);
    setError(null);
    try {
      const result = await productionService.createPackingReport({
        p_production_batch_id: Number(selectedBatch.production_batch_id),
        p_packer_employee_id: Number(packingForm.packerId),
        p_packed_date: packingForm.packedDate || getTodayInputValue(),
        p_items: items,
        p_notes: packingForm.notes || null,
      });

      if (result?.code !== 1) {
        setError(result?.message || "No se pudo registrar empaque");
        return;
      }

      toast.success(result?.message || "Empaque registrado");
      setPackingRows({});
      setPackingForm((current) => ({ ...current, notes: "" }));
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al registrar empaque"));
    } finally {
      setSavingPacking(false);
    }
  };

  const updatePackingRow = (key, values) => {
    setPackingRows((current) => ({
      ...current,
      [key]: { ...(current[key] || {}), ...values },
    }));
  };

  const markOutputReady = (item) => {
    const key = item.production_batch_output_id;
    const pendingQty = getPendingQty(item);
    updatePackingRow(key, {
      packed_quantity: pendingQty ? String(pendingQty) : "",
      damaged_quantity: "",
      missing_quantity: "",
      damage_reason: "packaging",
      missing_reason: "count_difference",
    });
  };

  const clearPackingRow = (item) => {
    const key = item.production_batch_output_id;
    updatePackingRow(key, {
      packed_quantity: "",
      damaged_quantity: "",
      missing_quantity: "",
      damage_reason: "packaging",
      missing_reason: "count_difference",
      notes: "",
    });
  };

  return (
    <FlowPageLayout
      title="Producción - Lotes y empaque"
      subtitle="Crea el lote con la receta vigente y registra lo empacado o dañado."
      links={[
        { label: "Resumen del día", href: "/production/day" },
        { label: "Reporte mensual", href: "/production/month" },
        { label: "Recetas", href: "/recipes" },
        { label: "Lotes y empaque", href: "/production/packaging", active: true },
        { label: "Faltantes", href: "/production/shortages" },
      ]}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <ProductionBatchCreatePanel
        batchForm={batchForm}
        branches={branches}
        bakers={bakers}
        createBatch={createBatch}
        formatNumber={formatNumber}
        getRecipeName={getRecipeName}
        loading={loading}
        recipes={recipes}
        savingBatch={savingBatch}
        selectedRecipe={selectedRecipe}
        selectedRecipeOutputIds={selectedRecipeOutputIds}
        setBatchForm={setBatchForm}
        setSelectedRecipeOutputIds={setSelectedRecipeOutputIds}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <PendingPackagingBatches
            batchStatusLabels={batchStatusLabels}
            formatShortDate={formatShortDate}
            formatUnits={formatUnits}
            getPendingQty={getPendingQty}
            loading={loading}
            pendingBatches={pendingBatches}
            selectedBatchId={selectedBatchId}
            setSelectedBatchId={setSelectedBatchId}
          />
        </Grid>

        <Grid item xs={12} lg={8}>
          <PackagingBatchWorkPanel
            formatNumber={formatNumber}
            formatUnits={formatUnits}
            getPendingQty={getPendingQty}
            selectedBatch={selectedBatch}
            selectedItems={selectedItems}
            selectedOutput={selectedOutput}
            setSelectedOutputId={setSelectedOutputId}
            totalDamaged={totalDamaged}
            totalMissing={totalMissing}
            totalPacked={totalPacked}
            totalPending={totalPending}
          />

          <PackingReadyPanel
            clearPackingRow={clearPackingRow}
            createPackingReport={createPackingReport}
            formatUnits={formatUnits}
            getPendingQty={getPendingQty}
            markOutputReady={markOutputReady}
            packers={packers}
            packingForm={packingForm}
            packingRows={packingRows}
            savingPacking={savingPacking}
            selectedBatch={selectedBatch}
            selectedItems={selectedItems}
            setPackingForm={setPackingForm}
            totalDamaged={totalDamaged}
            totalMissing={totalMissing}
            totalPacked={totalPacked}
            updatePackingRow={updatePackingRow}
          />
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default ProductionPackagingPage;

