import { useEffect, useState } from "react";
import { Box, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import AppButton from "@core/components/ui/AppButton";
import ProductionPlanRecipeTable from "components/organisms/production/ProductionPlanRecipeTable";

const getBakerLabel = (baker) => baker.full_name || baker.username || `Empleado #${baker.id}`;

const steps = ["Datos", "Productos", "Confirmar"];

const ProductionPlanAssignmentForm = ({
  bakers,
  recipes,
  form,
  rows,
  summary,
  saving,
  loading,
  formatNumber,
  formatArrobas,
  onFormChange,
  onDateChange,
  onRowChange,
  onRemoveRow,
  onAddRow,
  onSubmit,
  editing = false,
  onCancelEdit,
}) => {
  const [step, setStep] = useState(0);
  const productsComplete = rows.every((row) => row.productId && row.recipeId && Number(row.requestedQuantity) > 0);

  useEffect(() => {
    setStep(0);
  }, [editing]);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {editing ? "Editar plan" : "Crear plan de producción"}
        </Typography>
        <Typography color="text.secondary">Completa tres pasos sencillos.</Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {steps.map((label, index) => (
          <Box
            key={label}
            sx={{
              flex: 1,
              py: 1.25,
              px: 0.5,
              textAlign: "center",
              borderRadius: 2,
              bgcolor: index === step ? "secondary.main" : index < step ? "success.light" : "background.default",
              color: index === step ? "secondary.contrastText" : "text.primary",
              border: "1px solid",
              borderColor: index === step ? "secondary.main" : "divider",
              fontWeight: 900,
              fontSize: { xs: 13, sm: 16 },
            }}
          >
            {index + 1}. {label}
          </Box>
        ))}
      </Stack>

      {step === 0 ? (
        <Stack spacing={2.5}>
          <Typography sx={{ fontSize: 20, fontWeight: 900 }}>¿Quién y para cuándo?</Typography>
          <TextField
            select
            fullWidth
            label="Panadero"
            value={form.bakerId}
            onChange={(event) => onFormChange("bakerId", event.target.value)}
          >
            {bakers.map((baker) => (
              <MenuItem key={baker.id} value={String(baker.id)}>{getBakerLabel(baker)}</MenuItem>
            ))}
          </TextField>
          <BalanceDatePicker label="Fecha de producción" value={form.plannedDate} onChange={onDateChange} fullWidth />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Nota para el panadero (opcional)"
            value={form.notes}
            onChange={(event) => onFormChange("notes", event.target.value)}
          />
          <AppButton
            color="secondary"
            disabled={!form.bakerId || !form.plannedDate}
            onClick={() => setStep(1)}
            sx={{ minHeight: 58, fontSize: 17 }}
          >
            Continuar
          </AppButton>
        </Stack>
      ) : null}

      {step === 1 ? (
        <Stack spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 900 }}>¿Qué debe preparar?</Typography>
            <Typography color="text.secondary">Agrega cada producto y su cantidad.</Typography>
          </Box>
          <ProductionPlanRecipeTable
            rows={rows}
            recipes={recipes}
            onChange={onRowChange}
            onRemove={onRemoveRow}
            formatNumber={formatNumber}
            formatArrobas={formatArrobas}
          />
          <AppButton variant="outlined" color="secondary" onClick={onAddRow} sx={{ minHeight: 54 }}>
            + Agregar otro producto
          </AppButton>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={5}>
              <AppButton fullWidth variant="outlined" color="secondary" onClick={() => setStep(0)} sx={{ minHeight: 54 }}>
                Volver
              </AppButton>
            </Grid>
            <Grid item xs={12} sm={7}>
              <AppButton fullWidth color="secondary" disabled={!productsComplete} onClick={() => setStep(2)} sx={{ minHeight: 54 }}>
                Revisar plan
              </AppButton>
            </Grid>
          </Grid>
        </Stack>
      ) : null}

      {step === 2 ? (
        <Stack spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 900 }}>Confirma el plan</Typography>
            <Typography color="text.secondary">Revisa los productos antes de enviarlos.</Typography>
          </Box>
          <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3, bgcolor: "background.default" }}>
            <Stack spacing={1}>
              {summary.products.filter((row) => row.output).map((row) => (
                <Stack
                  key={row.rowKey}
                  direction="row"
                  sx={{ justifyContent: "space-between", alignItems: "center", gap: 1, py: 1, borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 900 }}>{row.output.product_name}</Typography>
                  <Typography sx={{ textAlign: "right", fontWeight: 700 }}>
                    {row.requestMode === "units"
                      ? `${formatNumber(row.requestedQuantity)} unidades`
                      : `${formatArrobas(row.requestedQuantity)} arrobas`}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={5}>
              <AppButton fullWidth variant="outlined" color="secondary" onClick={() => setStep(1)} disabled={saving} sx={{ minHeight: 56 }}>
                Corregir productos
              </AppButton>
            </Grid>
            <Grid item xs={12} sm={7}>
              <AppButton fullWidth color="secondary" onClick={onSubmit} loading={saving} disabled={saving || loading} sx={{ minHeight: 56, fontSize: 17 }}>
                {editing ? "Guardar cambios" : "Enviar al panadero"}
              </AppButton>
            </Grid>
          </Grid>
        </Stack>
      ) : null}

      {editing ? (
        <AppButton variant="text" color="secondary" onClick={onCancelEdit} disabled={saving} sx={{ mt: 2 }}>
          Cancelar edición
        </AppButton>
      ) : null}
    </Paper>
  );
};

export default ProductionPlanAssignmentForm;
