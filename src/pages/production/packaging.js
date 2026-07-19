import { useEffect, useMemo, useState } from "react";
import { Alert, Grid } from "@mui/material";
import toast from "react-hot-toast";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import PackagingBatchWorkPanel from "components/organisms/production/PackagingBatchWorkPanel";
import PackingReadyPanel from "components/organisms/production/PackingReadyPanel";
import PendingPackagingBatches from "components/organisms/production/PendingPackagingBatches";
import employeesService from "services/employees/employees-service";
import productionService from "services/production/production-service";
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

const getRegisteredQty = (item) =>
  Number(item?.packed_quantity || 0) + Number(item?.damaged_quantity || 0) + Number(item?.missing_quantity || 0);

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
  const [employees, setEmployees] = useState([]);
  const [pendingBatches, setPendingBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingPacking, setSavingPacking] = useState(false);
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
        const [employeesResponse, pendingResponse] = await Promise.all([
          employeesService.getEmployees({ status: "active", page: 1, pageSize: 200 }),
          productionService.getPendingPackaging(),
        ]);

        if (employeesResponse?.code !== 1) {
          setError(employeesResponse?.message || "No se pudieron cargar empleados");
          return;
        }
        if (pendingResponse?.code !== 1) {
          setError(pendingResponse?.message || "No se pudieron cargar pendientes de conteo");
          return;
        }

        const employeeRows = normalizeRows(employeesResponse.data);
        const pendingRows = normalizeRows(pendingResponse.data);

        setEmployees(employeeRows);
        setPendingBatches(pendingRows);
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
  const selectedItems = useMemo(() => normalizeRows(selectedBatch?.items), [selectedBatch]);
  const selectedOutput = selectedItems.find((item) => String(item.production_batch_output_id) === String(selectedOutputId)) || selectedItems[0] || null;
  const packers = employees.filter((employee) => employee.job_type === "packer");
  const totalCounted = selectedItems.reduce((acc, item) => acc + Number(packingRows[item.production_batch_output_id]?.counted_quantity || 0), 0);
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
          counted_quantity: "",
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

  const createPackingReport = async () => {
    if (savingPacking || !selectedBatch) {
      return;
    }

    if (!packingForm.packerId) {
      setError("Selecciona el contador/empaquetador");
      return;
    }

    const items = selectedItems
      .map((item) => {
        const row = packingRows[item.production_batch_output_id] || {};
        return {
          production_batch_output_id: Number(item.production_batch_output_id),
          counted_quantity: Number(row.counted_quantity || 0),
          packed_quantity: Number(row.packed_quantity || 0),
          damaged_quantity: Number(row.damaged_quantity || 0),
          missing_quantity: Number(row.missing_quantity || 0),
          damage_reason: row.damage_reason || "packaging",
          missing_reason: row.missing_reason || "count_difference",
          notes: row.notes || null,
        };
      })
      .filter(
        (item) =>
          item.counted_quantity > 0 || item.packed_quantity > 0 || item.damaged_quantity > 0 || item.missing_quantity > 0
      );

    if (items.length === 0) {
      setError("Registra al menos un conteo real");
      return;
    }

    const invalidCount = items.some((item) => {
      const values = [item.counted_quantity, item.packed_quantity, item.damaged_quantity, item.missing_quantity];
      return values.some((value) => !Number.isFinite(value) || value < 0) || item.counted_quantity <= 0 || item.packed_quantity + item.damaged_quantity > item.counted_quantity;
    });

    if (invalidCount) {
      setError("Revisa las cantidades: el conteo debe ser mayor a cero y empacados/danados no pueden superar lo contado");
      return;
    }

    const unjustifiedMissing = items.some(
      (item) => item.missing_quantity > 0 && (!item.missing_reason || !String(item.notes || "").trim())
    );

    if (unjustifiedMissing) {
      setError("Todo faltante debe incluir un motivo y una explicacion");
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
        setError(result?.message || "No se pudo registrar conteo y empaque");
        return;
      }

      toast.success(result?.message || "Conteo y empaque registrados");
      setPackingRows({});
      setPackingForm((current) => ({ ...current, notes: "" }));
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al registrar conteo y empaque"));
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
    const countedQty = Number(packingRows[key]?.counted_quantity || 0);

    if (countedQty <= 0) {
      setError("Primero registra el conteo real del producto");
      return;
    }

    setError(null);
    updatePackingRow(key, {
      packed_quantity: String(countedQty),
      damaged_quantity: "",
      missing_quantity: "",
      damage_reason: "packaging",
      missing_reason: "count_difference",
    });
  };

  const clearPackingRow = (item) => {
    const key = item.production_batch_output_id;
    updatePackingRow(key, {
      counted_quantity: "",
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
      title="Produccion - Conteo y empaque"
      subtitle="Cuenta lotes finalizados por panaderia sin ver cantidades reportadas por el panadero. Solo lo empacado entra a inventario."
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <PendingPackagingBatches
            batchStatusLabels={batchStatusLabels}
            formatShortDate={formatShortDate}
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
            getRegisteredQty={getRegisteredQty}
            selectedBatch={selectedBatch}
            selectedItems={selectedItems}
            selectedOutput={selectedOutput}
            setSelectedOutputId={setSelectedOutputId}
            totalCounted={totalCounted}
            totalDamaged={totalDamaged}
            totalMissing={totalMissing}
            totalPacked={totalPacked}
          />

          <PackingReadyPanel
            clearPackingRow={clearPackingRow}
            createPackingReport={createPackingReport}
            formatUnits={formatUnits}
            markOutputReady={markOutputReady}
            packers={packers}
            packingForm={packingForm}
            packingRows={packingRows}
            savingPacking={savingPacking}
            selectedBatch={selectedBatch}
            selectedItems={selectedItems}
            setPackingForm={setPackingForm}
            totalCounted={totalCounted}
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
