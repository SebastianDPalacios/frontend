import {
  Autocomplete, Box, Button, Collapse, Grid, IconButton, Paper, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

const getProducts = (recipes) => recipes.flatMap((recipe) => recipe.outputs.map((output) => ({
  ...output,
  recipeId: String(recipe.id),
  recipeName: recipe.displayName,
  recipeVersion: recipe.version_no,
})));

const ProductionPlanRecipeTable = ({ rows, recipes, onChange, onRemove, formatNumber, formatArrobas }) => {
  const products = getProducts(recipes);

  return (
    <Stack spacing={2}>
      {rows.map((row, index) => {
        const selected = products.find((product) => String(product.product_id) === String(row.productId)
          && String(product.recipeId) === String(row.recipeId));
        const requested = Number(row.requestedQuantity || 0);
        const yieldPerArroba = Number(selected?.expected_quantity || 0);
        const estimated = row.requestMode === "units" ? requested / yieldPerArroba : requested * yieldPerArroba;
        const hasEstimate = row.requestMode !== "bags" && selected && requested > 0 && Number.isFinite(estimated);

        return (
          <Paper
            key={row.rowKey}
            variant="outlined"
            sx={{ borderRadius: 3, overflow: "hidden", borderColor: selected ? "secondary.main" : "divider" }}
          >
            <Stack
              direction="row"
              sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, alignItems: "center", justifyContent: "space-between", bgcolor: "background.default" }}
            >
              <Typography sx={{ fontSize: { xs: 18, sm: 20 }, fontWeight: 900 }}>
                Producto {index + 1}
              </Typography>
              {rows.length > 1 ? (
                <Tooltip title="Quitar producto"><IconButton aria-label="Quitar producto" color="error" onClick={() => onRemove(index)}><DeleteOutlineRoundedIcon /></IconButton></Tooltip>
              ) : null}
            </Stack>

            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Autocomplete
                    fullWidth
                    options={products}
                    value={selected || null}
                    onChange={(_event, product) => onChange(index, {
                      recipeId: product ? String(product.recipeId) : "",
                      productId: product ? String(product.product_id) : "",
                    })}
                    getOptionLabel={(product) => product.product_name || "Producto"}
                    isOptionEqualToValue={(option, value) => String(option.recipeId) === String(value.recipeId)
                      && String(option.product_id) === String(value.product_id)}
                    getOptionDisabled={(product) => rows.some((otherRow, otherIndex) => otherIndex !== index
                      && String(otherRow.productId) === String(product.product_id))}
                    noOptionsText="No encontramos productos"
                    renderInput={(params) => <TextField {...params} label="¿Qué producto van a preparar?" placeholder="Escribe el nombre" />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography sx={{ mb: 1, fontWeight: 800 }}>¿Cómo quieres indicar la cantidad?</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button fullWidth size="large" color="secondary" variant={row.requestMode === "units" ? "contained" : "outlined"}
                      onClick={() => onChange(index, { requestMode: "units", requestedQuantity: "" })}>Unidades</Button>
                    <Button fullWidth size="large" color="secondary" variant={row.requestMode === "arrobas" ? "contained" : "outlined"}
                      onClick={() => onChange(index, { requestMode: "arrobas", requestedQuantity: "" })}>Arrobas</Button>
                    <Button fullWidth size="large" color="secondary" variant={row.requestMode === "bags" ? "contained" : "outlined"}
                      onClick={() => onChange(index, { requestMode: "bags", requestedQuantity: "" })}>Bultos</Button>
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth type="number"
                    label={row.requestMode === "units" ? "¿Cuántas unidades?" : row.requestMode === "bags" ? "¿Cuántos bultos?" : "¿Cuántas arrobas?"}
                    value={row.requestedQuantity}
                    onChange={(event) => onChange(index, { requestedQuantity: event.target.value })}
                    inputProps={{ min: row.requestMode === "arrobas" ? 0.1 : 1, step: row.requestMode === "arrobas" ? "0.1" : 1 }} />
                </Grid>
              </Grid>

              <Button color="secondary"
                endIcon={<ExpandMoreRoundedIcon sx={{ transform: row.detailsOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />}
                onClick={() => onChange(index, { detailsOpen: !row.detailsOpen })}
                sx={{ mt: 1.25, px: 0, minHeight: 44, fontWeight: 800 }}>
                {row.detailsOpen ? "Ocultar información adicional" : "Ver información adicional (opcional)"}
              </Button>

              <Collapse in={row.detailsOpen} timeout="auto" unmountOnExit>
                <Paper variant="outlined" sx={{ mt: 1, p: 2, borderRadius: 2, bgcolor: "background.default" }}>
                  {selected ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontWeight: 800 }}>Receta: {selected.recipeName}</Typography>
                      {row.requestMode !== "bags" ? <Typography color="text.secondary">Rendimiento: {formatNumber(yieldPerArroba)} unidades por arroba</Typography> : null}
                      {hasEstimate ? (
                        <Typography sx={{ mt: 0.5, fontWeight: 900 }}>
                          Equivalencia: {row.requestMode === "units" ? formatArrobas(estimated) : formatNumber(estimated)} {row.requestMode === "units" ? "arrobas" : "unidades"}
                        </Typography>
                      ) : null}
                    </Box>
                  ) : null}
                  <Typography sx={{ mb: 1.5, fontWeight: 800 }}>Detalle de latas</Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Unidades por lata" value={row.unitsPerTray} onChange={(event) => onChange(index, { unitsPerTray: event.target.value })} inputProps={{ min: 1, step: 1 }} /></Grid>
                    <Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Número de latas" value={row.trayCount} onChange={(event) => onChange(index, { trayCount: event.target.value })} inputProps={{ min: 0, step: 1 }} /></Grid>
                    <Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Unidades sueltas" value={row.looseUnits} onChange={(event) => onChange(index, { looseUnits: event.target.value })} inputProps={{ min: 0, step: 1 }} /></Grid>
                  </Grid>
                  <Button color="secondary" onClick={() => onChange(index, { unitsPerTray: "", trayCount: "", looseUnits: "" })} sx={{ mt: 1 }}>
                    Limpiar estos datos
                  </Button>
                </Paper>
              </Collapse>
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default ProductionPlanRecipeTable;
