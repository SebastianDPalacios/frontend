import { Box, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import AppButton from "@core/components/ui/AppButton";
import ProductionPlanRecipeTable from "components/organisms/production/ProductionPlanRecipeTable";
import { getDisplayName } from "views/modules/flow-utils";

const getBakerLabel = (baker) => {
  const name = baker.full_name || baker.username || `Empleado #${baker.id}`;
  const account = baker.username && baker.username !== name ? `@${baker.username}` : "";
  return [name, account, baker.email].filter(Boolean).join(" · ");
};

const ProductionPlanAssignmentForm = ({
  branches,
  bakers,
  recipes,
  form,
  rows,
  totalArrobas,
  selectedBaker,
  saving,
  loading,
  formatNumber,
  onFormChange,
  onDateChange,
  onRowChange,
  onMoveRow,
  onRemoveRow,
  onAddRow,
  onSubmit,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1}
      sx={{ justifyContent: "space-between", mb: 2 }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Nueva asignación</Typography>
        <Typography variant="body2" color="text.secondary">
          Una arroba equivale a un moje. Puedes incluir varias recetas en el mismo plan.
        </Typography>
      </Box>
      <Chip label={`${formatNumber(totalArrobas)} arroba(s)`} color="secondary" variant="outlined" />
    </Stack>

    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} md={3}>
        <TextField
          select
          fullWidth
          label="Sucursal"
          value={form.branchId}
          onChange={(event) => onFormChange("branchId", event.target.value)}
        >
          {branches.map((branch) => (
            <MenuItem key={branch.id} value={String(branch.id)}>
              {getDisplayName(branch)}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={3}>
        <TextField
          select
          fullWidth
          label="Panadero"
          value={form.bakerId}
          helperText={selectedBaker
            ? `La notificación llegará a ${selectedBaker.email || `@${selectedBaker.username}`}.`
            : "Selecciona la cuenta que recibirá la notificación."}
          onChange={(event) => onFormChange("bakerId", event.target.value)}
        >
          {bakers.map((baker) => (
            <MenuItem key={baker.id} value={String(baker.id)}>
              {getBakerLabel(baker)}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={3}>
        <BalanceDatePicker
          label="Fecha de producción"
          value={form.plannedDate}
          onChange={onDateChange}
          fullWidth
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <TextField
          fullWidth
          label="Nota para el panadero"
          value={form.notes}
          onChange={(event) => onFormChange("notes", event.target.value)}
        />
      </Grid>
    </Grid>

    <ProductionPlanRecipeTable
      rows={rows}
      recipes={recipes}
      onChange={onRowChange}
      onMove={onMoveRow}
      onRemove={onRemoveRow}
      formatNumber={formatNumber}
    />

    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      sx={{ mt: 2, alignItems: { xs: "stretch", sm: "center" } }}
    >
      <AppButton variant="outlined" color="secondary" onClick={onAddRow}>
        Agregar otra receta
      </AppButton>
      <AppButton color="secondary" onClick={onSubmit} loading={saving} disabled={saving || loading}>
        Enviar plan al panadero
      </AppButton>
    </Stack>
  </Paper>
);

export default ProductionPlanAssignmentForm;
