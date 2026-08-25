import { Box, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import AppButton from "@core/components/ui/AppButton";
import ProductionPlanDesktopTable from "components/organisms/production/ProductionPlanDesktopTable";
import { getDisplayName } from "views/modules/flow-utils";

const getBakerLabel = (baker) => {
  const name = baker.full_name || baker.username || `Empleado #${baker.id}`;
  const account = baker.username && baker.username !== name ? `@${baker.username}` : "";
  return [name, account, baker.email].filter(Boolean).join(" · ");
};

const ProductionPlanDesktopForm = ({
  branches,
  bakers,
  recipes,
  form,
  rows,
  totalArrobas,
  summary,
  selectedBaker,
  saving,
  loading,
  formatNumber,
  formatArrobas,
  onFormChange,
  onDateChange,
  onRowChange,
  onMoveRow,
  onRemoveRow,
  onAddRow,
  onSubmit,
  editing = false,
  onCancelEdit,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1}
      sx={{ justifyContent: "space-between", mb: 2 }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{editing ? "Editar asignación" : "Nueva asignación"}</Typography>
        <Typography variant="body2" color="text.secondary">
          Agrega cada producto por separado. La receta vigente y sus equivalencias se calculan automaticamente.
        </Typography>
      </Box>
      <Chip label={`${formatArrobas(totalArrobas)} arroba(s) estimada(s)`} color="secondary" variant="outlined" />
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

    <ProductionPlanDesktopTable
      rows={rows}
      recipes={recipes}
      onChange={onRowChange}
      onMove={onMoveRow}
      onRemove={onRemoveRow}
      formatNumber={formatNumber}
      formatArrobas={formatArrobas}
    />

    <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "background.default" }}>
      <Typography sx={{ fontWeight: 900, mb: 1 }}>Resumen antes de enviar</Typography>
      <Stack spacing={0.75}>
        {summary.products.filter((row) => row.output).map((row) => (
          <Stack key={row.rowKey} direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 0.5 }}>
            <Typography sx={{ fontWeight: 700 }}>{row.output.product_name}</Typography>
            <Typography variant="body2">
              {row.requestMode === "units"
                ? `${formatNumber(row.requestedQuantity)} unidades · ${formatArrobas(row.plannedArrobas)} arrobas`
                : `${formatArrobas(row.requestedQuantity)} arrobas · ${formatNumber(row.estimatedUnits)} unidades`}
            </Typography>
          </Stack>
        ))}
        {!summary.products.some((row) => row.output) ? (
          <Typography variant="body2" color="text.secondary">Agrega productos para consultar el resumen.</Typography>
        ) : null}
        {summary.recipeGroups.map((group) => (
          <Stack key={group.recipeId} direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", pt: 0.75, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>Total receta {group.recipeName}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatArrobas(group.plannedArrobas)} arrobas</Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>

    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      sx={{ mt: 2, alignItems: { xs: "stretch", sm: "center" } }}
    >
      <AppButton variant="outlined" color="secondary" onClick={onAddRow}>
        Agregar otro producto
      </AppButton>
      <AppButton color="secondary" onClick={onSubmit} loading={saving} disabled={saving || loading}>
        {editing ? "Guardar cambios" : "Enviar plan al panadero"}
      </AppButton>
      {editing ? (
        <AppButton variant="text" color="secondary" onClick={onCancelEdit} disabled={saving}>
          Cancelar edición
        </AppButton>
      ) : null}
    </Stack>
  </Paper>
);

export default ProductionPlanDesktopForm;

