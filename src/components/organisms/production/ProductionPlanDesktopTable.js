import {
  Box, Button, Collapse, IconButton, MenuItem, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

const getProducts = (recipes) => recipes.flatMap((recipe) => recipe.outputs.map((output) => ({
  ...output,
  recipeId: String(recipe.id),
  recipeName: recipe.displayName,
  recipeVersion: recipe.version_no,
})));

const ProductionPlanDesktopTable = ({ rows, recipes, onChange, onMove, onRemove, formatNumber, formatArrobas }) => {
  const products = getProducts(recipes);
  return (
    <Stack spacing={1.5}>
      <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Table sx={{ minWidth: 1120 }}>
          <TableHead>
            <TableRow sx={{ "& th": { bgcolor: "background.default", fontWeight: 900 } }}>
              <TableCell width={65}>Orden</TableCell>
              <TableCell width={250}>Producto</TableCell>
              <TableCell width={170}>Tipo</TableCell>
              <TableCell width={175}>Cantidad solicitada</TableCell>
              <TableCell width={185}>Equivalencia estimada</TableCell>
              <TableCell>Receta vigente</TableCell>
              <TableCell width={210} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              const selected = products.find((product) => String(product.product_id) === String(row.productId)
                && String(product.recipeId) === String(row.recipeId));
              const requested = Number(row.requestedQuantity || 0);
              const yieldPerArroba = Number(selected?.expected_quantity || 0);
              const estimated = row.requestMode === "units" ? requested / yieldPerArroba : requested * yieldPerArroba;
              return [
                <TableRow key={row.rowKey}>
                  <TableCell><Typography sx={{ fontWeight: 900 }}>{index + 1}</Typography></TableCell>
                  <TableCell>
                    <TextField id={`planned-product-${row.rowKey}`} select fullWidth size="small" label="Producto"
                      value={row.productId && row.recipeId ? `${row.recipeId}:${row.productId}` : ""}
                      onChange={(event) => {
                        const [recipeId, productId] = event.target.value.split(":");
                        onChange(index, { recipeId, productId });
                      }}>
                      <MenuItem value="">Seleccionar</MenuItem>
                      {products.map((product) => (
                        <MenuItem
                          key={`${product.recipeId}:${product.product_id}`}
                          value={`${product.recipeId}:${product.product_id}`}
                          disabled={rows.some((otherRow, otherIndex) => otherIndex !== index
                            && String(otherRow.productId) === String(product.product_id))}
                        >
                          {product.product_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField select fullWidth size="small" label="Tipo" value={row.requestMode}
                      onChange={(event) => onChange(index, { requestMode: event.target.value, requestedQuantity: "" })}>
                      <MenuItem value="units">Por unidades</MenuItem>
                      <MenuItem value="arrobas">Por arrobas</MenuItem>
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField fullWidth size="small" type="number"
                      label={row.requestMode === "units" ? "Unidades" : "Arrobas"}
                      value={row.requestedQuantity}
                      onChange={(event) => onChange(index, { requestedQuantity: event.target.value })}
                      inputProps={{ min: row.requestMode === "units" ? 1 : 0.001, step: row.requestMode === "units" ? 1 : "0.001" }} />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 800 }}>
                      {selected && requested > 0 && Number.isFinite(estimated)
                        ? `${row.requestMode === "units" ? formatArrobas(estimated) : formatNumber(estimated)} ${row.requestMode === "units" ? "arrobas" : "unidades"}` : "—"}
                    </Typography>
                    {selected ? <Typography variant="caption" color="text.secondary">Rendimiento: {formatNumber(yieldPerArroba)} unidades/arroba</Typography> : null}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{selected?.recipeName || "Selecciona un producto"}</Typography>
                    {selected ? <Typography variant="caption" color="text.secondary">Version {selected.recipeVersion}</Typography> : null}
                  </TableCell>
                  <TableCell align="center">
                    <Stack spacing={0.75} sx={{ alignItems: "stretch", maxWidth: 170, mx: "auto" }}>
                      <Button
                        size="small"
                        variant={row.detailsOpen ? "contained" : "outlined"}
                        color="secondary"
                        startIcon={<Inventory2OutlinedIcon />}
                        onClick={() => onChange(index, { detailsOpen: !row.detailsOpen })}
                        sx={{ borderRadius: 2, fontWeight: 800, whiteSpace: "nowrap" }}
                      >
                        {row.detailsOpen ? "Ocultar latas" : "Detalle de latas"}
                      </Button>
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
                </TableRow>,
                <TableRow key={`${row.rowKey}-details`}>
                  <TableCell colSpan={7} sx={{ py: 0, borderBottom: row.detailsOpen ? undefined : 0 }}>
                    <Collapse in={row.detailsOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ py: 2 }}>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: { md: "center" } }}>
                          <Box sx={{ minWidth: 180 }}><Typography sx={{ fontWeight: 800 }}>Detalle opcional de latas</Typography><Typography variant="caption" color="text.secondary">Completa solo los datos que utilicen.</Typography></Box>
                          <TextField size="small" type="number" label="Unidades por lata" value={row.unitsPerTray} onChange={(event) => onChange(index, { unitsPerTray: event.target.value })} inputProps={{ min: 0.001, step: "0.001" }} />
                          <TextField size="small" type="number" label="Numero de latas" value={row.trayCount} onChange={(event) => onChange(index, { trayCount: event.target.value })} inputProps={{ min: 0, step: "0.001" }} />
                          <TextField size="small" type="number" label="Unidades sueltas" value={row.looseUnits} onChange={(event) => onChange(index, { looseUnits: event.target.value })} inputProps={{ min: 0, step: "0.001" }} />
                          <Button size="small" onClick={() => onChange(index, { unitsPerTray: "", trayCount: "", looseUnits: "" })}>Limpiar detalle</Button>
                        </Stack>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>,
              ];
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default ProductionPlanDesktopTable;

