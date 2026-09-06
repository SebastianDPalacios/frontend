import {
  Autocomplete, Box, IconButton, MenuItem, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

const getProducts = (recipes) => recipes.flatMap((recipe) => recipe.outputs.map((output) => ({
  ...output,
  recipeId: String(recipe.id),
  recipeName: recipe.displayName,
  recipeVersion: recipe.version_no,
})));

const ProductionPlanDesktopTable = ({ rows, recipes, onChange, onMove, onRemove }) => {
  const products = getProducts(recipes);
  return (
    <Stack spacing={1.5}>
      <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Table sx={{ minWidth: 940 }}>
          <TableHead>
            <TableRow sx={{ "& th": { bgcolor: "background.default", fontWeight: 900 } }}>
              <TableCell width={65}>Orden</TableCell>
              <TableCell width={250}>Producto</TableCell>
              <TableCell width={170}>Tipo</TableCell>
              <TableCell width={175}>Cantidad solicitada</TableCell>
              <TableCell>Receta vigente</TableCell>
              <TableCell width={210} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              const selected = products.find((product) => String(product.product_id) === String(row.productId)
                && String(product.recipeId) === String(row.recipeId));
              return (
                <TableRow key={row.rowKey}>
                  <TableCell><Typography sx={{ fontWeight: 900 }}>{index + 1}</Typography></TableCell>
                  <TableCell>
                    <Autocomplete
                      fullWidth
                      size="small"
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
                      renderInput={(params) => <TextField {...params} label="Buscar producto" placeholder="Escribe el nombre" />}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField select fullWidth size="small" label="Tipo" value={row.requestMode}
                      onChange={(event) => onChange(index, { requestMode: event.target.value, requestedQuantity: "" })}>
                      <MenuItem value="units">Por unidades</MenuItem>
                      <MenuItem value="arrobas">Por arrobas</MenuItem>
                      <MenuItem value="bags">Por bultos</MenuItem>
                      <MenuItem value="trays">Por latas</MenuItem>
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField fullWidth size="small" type="number"
                      label={row.requestMode === "units" ? "Unidades" : row.requestMode === "bags" ? "Bultos" : row.requestMode === "trays" ? "Latas" : "Arrobas"}
                      value={row.requestedQuantity}
                      onChange={(event) => onChange(index, { requestedQuantity: event.target.value })}
                      inputProps={{ min: row.requestMode === "arrobas" ? 0.001 : 1, step: row.requestMode === "arrobas" ? "0.001" : 1 }} />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{selected?.recipeName || "Selecciona un producto"}</Typography>
                    {selected ? <Typography variant="caption" color="text.secondary">Version {selected.recipeVersion}</Typography> : null}
                  </TableCell>
                  <TableCell align="center">
                    <Stack spacing={0.75} sx={{ alignItems: "stretch", maxWidth: 170, mx: "auto" }}>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ justifyContent: "center", p: 0.35, borderRadius: 2, bgcolor: "background.default" }}
                      >
                        <Tooltip title="Mover arriba"><span><IconButton size="small" onClick={() => onMove(index, -1)} disabled={index === 0}><ArrowUpwardRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
                        <Tooltip title="Mover abajo"><span><IconButton size="small" onClick={() => onMove(index, 1)} disabled={index === rows.length - 1}><ArrowDownwardRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
                        <Box sx={{ width: "1px", bgcolor: "divider", mx: 0.25 }} />
                        <Tooltip title={rows.length === 1 ? "Debe permanecer al menos un producto" : "Eliminar producto"}><span><IconButton size="small" color="error" onClick={() => onRemove(index)} disabled={rows.length === 1}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
                      </Stack>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default ProductionPlanDesktopTable;
