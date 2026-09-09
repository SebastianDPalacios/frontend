import { useEffect, useMemo, useState } from "react";
import { Alert, Dialog, DialogContent, DialogTitle, Grid, IconButton, Paper, Stack, Tab, Tabs, Typography, useMediaQuery } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTheme } from "@mui/material/styles";
import toast from "react-hot-toast";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import PackingReadyPanel from "components/organisms/production/PackingReadyPanel";
import PackagingHistoryPanel from "components/organisms/production/PackagingHistoryPanel";
import PendingPackagingBatches from "components/organisms/production/PendingPackagingBatches";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

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
  const status = Number(error?.response?.status || 0);
  const message = error?.response?.data?.message || error?.message || "";

  if (status === 403 || /permiso requerido|required permission/i.test(message)) {
    return "No tienes permiso para registrar empaques. Solicita al administrador asignarte el rol Empaquetador o el permiso de Conteo y empaque.";
  }

  return message || fallback;
};

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
  const theme = useTheme();
  const mobileView = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const [activeView, setActiveView] = useState("pending");
  const [mobilePackingOpen, setMobilePackingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [pendingBatches, setPendingBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingPacking, setSavingPacking] = useState(false);
  const [lastPackingResult, setLastPackingResult] = useState(null);
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
          productionService.getPackagingPackers(),
          productionService.getPendingPackaging(),
        ]);

        if (employeesResponse?.code !== 1) {
          setError(employeesResponse?.message || "No se pudieron cargar empleados");
          return;
        }
        if (pendingResponse?.code !== 1) {
          setError(pendingResponse?.message || "No se pudieron cargar los lotes pendientes de empaque");
          return;
        }

        const employeeRows = normalizeRows(employeesResponse.data);
        const pendingRows = normalizeRows(pendingResponse.data);

        if (!employeeRows.length) {
          setError(
            "No hay empleados empaquetadores activos configurados. Solicita al administrador vincular el usuario a un empleado con cargo Empaquetador."
          );
          setEmployees([]);
          setPendingBatches(pendingRows);
          return;
        }

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
        setError(getErrorMessage(requestError, "Error de red al cargar los empaques"));
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
  const packers = employees.filter((employee) => employee.job_type === "packer");
  const totalPacked = selectedItems.reduce((acc, item) => acc + Number(packingRows[item.production_batch_output_id]?.packed_quantity || 0), 0);
  const totalDamaged = selectedItems.reduce((acc, item) => acc + (packingRows[item.production_batch_output_id]?.damages || []).reduce((total, damage) => total + Number(damage.quantity || 0), 0), 0);

  useEffect(() => {
    setPackingRows((current) => {
      const next = {};
      selectedItems.forEach((item) => {
        const key = item.production_batch_output_id;
        next[key] = current[key] || {
          packed_quantity: "",
          damages: [],
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
          packed_quantity: Number(row.packed_quantity || 0),
          damages: row.damages || [],
          notes: row.notes || null,
        };
      })
      .filter((item) => item.packed_quantity > 0 || item.damages.length > 0);

    if (items.length === 0) {
      setError("Registra al menos una cantidad empacada o dañada");
      return;
    }

    const invalidCount = items.some((item) => !Number.isFinite(item.packed_quantity) || item.packed_quantity < 0
      || item.damages.some((damage) => !Number.isFinite(Number(damage.quantity)) || Number(damage.quantity) <= 0 || !damage.reason));

    if (invalidCount) {
      setError("Revisa empacados y daños. Cada daño debe tener una cantidad mayor a cero y un motivo.");
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
        setError(result?.message || "No se pudo registrar el empaque");
        return;
      }

      toast.success(result?.message || "Empaque registrado");
      setLastPackingResult({
        batchId: selectedBatch.production_batch_id,
        missingQuantity: Number(result.data?.missing_quantity || 0),
      });
      setPackingRows({});
      setPackingForm((current) => ({ ...current, notes: "" }));
      setMobilePackingOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al registrar el empaque"));
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

  const clearPackingRow = (item) => {
    const key = item.production_batch_output_id;
    updatePackingRow(key, {
      packed_quantity: "",
      damages: [],
      notes: "",
    });
  };

  const selectPendingBatch = (batch) => {
    setError(null);
    setLastPackingResult(null);
    setSelectedBatchId(String(batch.production_batch_id));
    if (mobileView) {
      setMobilePackingOpen(true);
    }
  };

  const packingPanel = (
    <PackingReadyPanel
      clearPackingRow={clearPackingRow}
      createPackingReport={createPackingReport}
      formatUnits={formatUnits}
      packers={packers}
      packingForm={packingForm}
      packingRows={packingRows}
      savingPacking={savingPacking}
      selectedBatch={selectedBatch}
      selectedItems={selectedItems}
      setPackingForm={setPackingForm}
      totalDamaged={totalDamaged}
      totalPacked={totalPacked}
      updatePackingRow={updatePackingRow}
    />
  );

  return (
    <FlowPageLayout
      title="Producción - Empaque"
      subtitle="Registra lo empacado y los daños sin ver la cantidad reportada por el panadero. Solo lo empacado entra a inventario."
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {lastPackingResult ? (
        <Alert severity={lastPackingResult.missingQuantity > 0 ? "warning" : "success"} sx={{ mb: 2 }}>
          Lote #{lastPackingResult.batchId} registrado. Faltantes detectados: {formatUnits(lastPackingResult.missingQuantity)}.
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 2, overflow: "hidden" }}>
        <Tabs
          value={activeView}
          onChange={(_event, value) => setActiveView(value)}
          variant="fullWidth"
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ "& .MuiTab-root": { minHeight: 58, fontWeight: 900, fontSize: { xs: 14, sm: 16 } } }}
        >
          <Tab value="pending" label={`Pendientes (${pendingBatches.length})`} />
          <Tab value="history" label="Historial de empaques" />
        </Tabs>
      </Paper>

      {activeView === "pending" ? <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <PendingPackagingBatches
            batchStatusLabels={batchStatusLabels}
            formatShortDate={formatShortDate}
            loading={loading}
            pendingBatches={pendingBatches}
            selectedBatchId={selectedBatchId}
            onSelectBatch={selectPendingBatch}
          />
        </Grid>

        <Grid item xs={12} lg={8} sx={{ display: { xs: "none", md: "block" } }}>
          {packingPanel}
        </Grid>
      </Grid> : <PackagingHistoryPanel />}

      <Dialog
        open={mobileView && mobilePackingOpen}
        onClose={() => !savingPacking && setMobilePackingOpen(false)}
        fullScreen
        PaperProps={{ sx: { bgcolor: "background.default" } }}
      >
        <DialogTitle sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography sx={{ fontWeight: 900 }}>Empacar lote #{selectedBatch?.production_batch_id}</Typography>
            <IconButton aria-label="Cerrar formulario de empaque" onClick={() => setMobilePackingOpen(false)} disabled={savingPacking}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: "12px !important" }}>
          {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
          {packingPanel}
        </DialogContent>
      </Dialog>
    </FlowPageLayout>
  );
};

export default ProductionPackagingPage;
