import { Autocomplete, Box, Button, Grid, IconButton, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

const getProducts = (recipes) => recipes.flatMap((recipe) => recipe.outputs.map((output) => ({
  ...output,
  recipeId: String(recipe.id),
  recipeName: recipe.displayName,
  recipeVersion: recipe.version_no,
})));

const ProductionPlanRecipeTable = ({ rows, recipes, onChange, onRemove }) => {
  const products = getProducts(recipes);

  return (
    <Stack spacing={2}>
      {rows.map((row, index) => {
        const selected = products.find((product) => String(product.product_id) === String(row.productId)
          && String(product.recipeId) === String(row.recipeId));
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
                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={3}>
                    <Button fullWidth size="large" color="secondary" variant={row.requestMode === "units" ? "contained" : "outlined"}
                      onClick={() => onChange(index, { requestMode: "units", requestedQuantity: "" })}>Unidades</Button>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                    <Button fullWidth size="large" color="secondary" variant={row.requestMode === "arrobas" ? "contained" : "outlined"}
                      onClick={() => onChange(index, { requestMode: "arrobas", requestedQuantity: "" })}>Arrobas</Button>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                    <Button fullWidth size="large" color="secondary" variant={row.requestMode === "bags" ? "contained" : "outlined"}
                      onClick={() => onChange(index, { requestMode: "bags", requestedQuantity: "" })}>Bultos</Button>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                    <Button fullWidth size="large" color="secondary" variant={row.requestMode === "trays" ? "contained" : "outlined"}
                      onClick={() => onChange(index, { requestMode: "trays", requestedQuantity: "" })}>Latas</Button>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth type="number"
                    label={row.requestMode === "units" ? "¿Cuántas unidades?" : row.requestMode === "bags" ? "¿Cuántos bultos?" : row.requestMode === "trays" ? "¿Cuántas latas?" : "¿Cuántas arrobas?"}
                    value={row.requestedQuantity}
                    onChange={(event) => onChange(index, { requestedQuantity: event.target.value })}
                    inputProps={{ min: row.requestMode === "arrobas" ? 0.1 : 1, step: row.requestMode === "arrobas" ? "0.1" : 1 }} />
                </Grid>
              </Grid>

            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default ProductionPlanRecipeTable;
