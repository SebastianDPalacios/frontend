import { Box, Checkbox, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import { getDisplayName } from "views/modules/flow-utils";

const ProductionBatchCreatePanel = ({
  batchForm,
  branches,
  bakers,
  createBatch,
  formatNumber,
  getRecipeName,
  loading,
  recipes,
  savingBatch,
  selectedRecipe,
  selectedRecipeOutputIds,
  setBatchForm,
  setSelectedRecipeOutputIds,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
    <Stack spacing={0.5} sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        1. Crear lote de producción
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Elige la receta, el panadero y cuantos bultos se hicieron. Un bulto estimado equivale a un moje.
      </Typography>
    </Stack>

    <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
      <Grid item xs={12} md={3}>
        <TextField
          select
          fullWidth
          label="Sucursal"
          value={batchForm.branchId}
          onChange={(event) => setBatchForm((current) => ({ ...current, branchId: event.target.value }))}
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
          label="Receta"
          value={batchForm.recipeId}
          onChange={(event) => setBatchForm((current) => ({ ...current, recipeId: event.target.value }))}
        >
          {recipes.map((recipe) => (
            <MenuItem key={recipe.id} value={String(recipe.id)}>
              {getRecipeName(recipe)} · V{recipe.version_no || 1} vigente {recipe.outputs?.length ? `(${recipe.outputs.length} productos)` : ""}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} md={2}>
        <TextField
          select
          fullWidth
          label="Panadero"
          value={batchForm.bakerId}
          onChange={(event) => setBatchForm((current) => ({ ...current, bakerId: event.target.value }))}
        >
          {bakers.map((employee) => (
            <MenuItem key={employee.id} value={String(employee.id)}>
              {employee.full_name || employee.username || `Empleado ${employee.id}`}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={6} md={2}>
        <TextField
          fullWidth
          type="number"
          label="Bultos realizados"
          value={batchForm.batchQuantity}
          onChange={(event) => setBatchForm((current) => ({ ...current, batchQuantity: event.target.value }))}
          inputProps={{ min: 0.001, step: 0.001 }}
        />
      </Grid>
      <Grid item xs={6} md={2}>
        <BalanceDatePicker
          label="Fecha"
          value={batchForm.producedDate}
          onChange={(value) => setBatchForm((current) => ({ ...current, producedDate: value }))}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={9}>
        <TextField
          fullWidth
          label="Notas del lote"
          value={batchForm.notes}
          onChange={(event) => setBatchForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <AppButton color="secondary" onClick={createBatch} disabled={savingBatch || loading} sx={{ width: "100%", minHeight: 54 }}>
          {savingBatch ? "Creando..." : "Crear lote"}
        </AppButton>
      </Grid>

      {selectedRecipe?.outputs?.length ? (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, bgcolor: "background.default" }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                  Productos que saldran de {getRecipeName(selectedRecipe)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Marca solo los productos que se hicieron en este lote.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {selectedRecipe.outputs.map((output) => {
                  const outputId = String(output.product_id);
                  const checked = selectedRecipeOutputIds.includes(outputId);

                  return (
                    <Chip
                      key={`${selectedRecipe.id}-${output.product_id}`}
                      clickable
                      onClick={() => {
                        setSelectedRecipeOutputIds((current) => {
                          if (current.includes(outputId)) {
                            return current.filter((id) => id !== outputId);
                          }
                          return [...current, outputId];
                        });
                      }}
                      icon={<Checkbox checked={checked} size="small" sx={{ p: 0, ml: 0.5 }} />}
                      label={`${output.product_name || `Producto ${output.product_id}`}: ${formatNumber(output.expected_quantity)} por moje`}
                      color={checked ? "primary" : "default"}
                      variant={checked ? "filled" : "outlined"}
                    />
                  );
                })}
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      ) : null}
    </Grid>
  </Paper>
);

export default ProductionBatchCreatePanel;
