import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Box, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker, BalanceMonthPicker } from "@core/components/ui/BalancePeriodPickers";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const formatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => formatter.format(Number(value || 0));
const getLocalDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const getMonthRange = (date) => {
  const [year, month] = String(date).slice(0, 7).split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { date_from: `${year}-${String(month).padStart(2, "0")}-01`, date_to: `${year}-${String(month).padStart(2, "0")}-${lastDay}` };
};
const requestLabels = { units: "Por unidades", arrobas: "Por arrobas", bags: "Por bultos" };
const requestUnits = { units: "unidades", arrobas: "arrobas", bags: "bultos" };

export const ProductionMyPlanPage = ({ mode = "today" }) => {
  const isHistory = mode === "history";
  const [selectedDate, setSelectedDate] = useState(getLocalDate);
  const [periodType, setPeriodType] = useState("day");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = isHistory && periodType === "month" ? getMonthRange(selectedDate) : { planned_date: selectedDate };
      const response = await productionService.getMyPlans(params);
      if (response?.code !== 1) throw new Error(response?.message || "No se pudieron cargar los planes.");
      setPlans(normalizeRows(response.data));
      setError(null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "No se pudieron cargar los planes.");
    } finally {
      setLoading(false);
    }
  }, [isHistory, periodType, selectedDate]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const rows = useMemo(() => plans.flatMap((plan) => normalizeRows(plan.product_assignments).map((product) => ({
    ...product,
    planId: plan.id,
    plannedDate: String(plan.planned_date || "").split("T")[0],
    branchName: plan.branch_name,
  }))), [plans]);

  return (
    <FlowPageLayout
      title={isHistory ? "Historial de planes" : "Mi plan de produccion"}
      subtitle={isHistory ? "Consulta las asignaciones de dias anteriores." : "Lista informativa de los productos asignados para hoy."}
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
          {isHistory ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField select label="Consultar por" value={periodType} onChange={(event) => setPeriodType(event.target.value)} sx={{ minWidth: 170 }}>
                <MenuItem value="day">Dia</MenuItem>
                <MenuItem value="month">Mes</MenuItem>
              </TextField>
              <Box sx={{ width: { xs: "100%", sm: 260 } }}>
                {periodType === "month" ? (
                  <BalanceMonthPicker label="Mes" value={selectedDate.slice(0, 7)} onChange={(value) => setSelectedDate(`${value}-01`)} />
                ) : (
                  <BalanceDatePicker fullWidth label="Fecha" value={selectedDate} onChange={setSelectedDate} />
                )}
              </Box>
            </Stack>
          ) : (
            <Box><Typography variant="caption" color="text.secondary">Fecha de trabajo</Typography><Typography variant="h6" sx={{ fontWeight: 900 }}>{selectedDate}</Typography></Box>
          )}
          <AppButton component={Link} href={isHistory ? "/production/my-plan" : "/production/history"} variant="outlined" color="secondary">
            {isHistory ? "Volver al plan de hoy" : "Ver historial"}
          </AppButton>
        </Stack>
      </Paper>

      {loading ? <Alert severity="info">Cargando productos asignados...</Alert> : null}
      {!loading && rows.length === 0 ? <Alert severity="info">{isHistory ? "No hay planes en el periodo seleccionado." : "No tienes productos asignados para hoy."}</Alert> : null}
      {!loading && rows.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 850 }}>
            <TableHead><TableRow sx={{ "& th": { fontWeight: 900, bgcolor: "background.default" } }}>
              {isHistory ? <TableCell>Fecha</TableCell> : null}
              <TableCell>Producto</TableCell><TableCell>Tipo</TableCell><TableCell>Cantidad solicitada</TableCell><TableCell>Equivalencia</TableCell><TableCell>Receta vigente</TableCell><TableCell>Sucursal</TableCell>
            </TableRow></TableHead>
            <TableBody>{rows.map((row) => (
              <TableRow key={`${row.planId}-${row.production_plan_output_id}`}>
                {isHistory ? <TableCell>{row.plannedDate}</TableCell> : null}
                <TableCell><Typography sx={{ fontWeight: 900 }}>{row.product_name}</Typography></TableCell>
                <TableCell>{requestLabels[row.request_mode] || row.request_mode}</TableCell>
                <TableCell>{formatNumber(row.requested_quantity)} {requestUnits[row.request_mode] || ""}</TableCell>
                <TableCell>{row.request_mode === "bags" ? "Sin equivalencia" : `${formatNumber(row.planned_arrobas)} arrobas / ${formatNumber(row.estimated_units)} unidades`}</TableCell>
                <TableCell>{row.recipe_name} · V{row.recipe_version}</TableCell>
                <TableCell>{row.branchName}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </FlowPageLayout>
  );
};

export default ProductionMyPlanPage;
