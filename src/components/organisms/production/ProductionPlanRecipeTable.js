import { Checkbox, Chip, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

const ProductionPlanRecipeTable = ({
  rows,
  recipes,
  onChange,
  onMove,
  onRemove,
  formatNumber,
}) => (
  <Stack spacing={1.5}>
    <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
      <Table sx={{ minWidth: 920 }}>
        <TableHead>
          <TableRow sx={{ "& th": { bgcolor: "background.default", fontWeight: 900 } }}>
            <TableCell width={70}>Orden</TableCell>
            <TableCell width={300}>Receta vigente</TableCell>
            <TableCell width={150}>Arrobas</TableCell>
            <TableCell>Productos a fabricar</TableCell>
            <TableCell width={150} align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const recipe = recipes.find((item) => String(item.id) === String(row.recipeId));
            return (
              <TableRow key={row.rowKey}>
                <TableCell>
                  <Typography sx={{ fontWeight: 900 }}>{index + 1}</Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Receta"
                    value={row.recipeId}
                    onChange={(event) => onChange(index, {
                      recipeId: event.target.value,
                      productIds: recipes
                        .find((item) => String(item.id) === String(event.target.value))
                        ?.outputs.map((output) => String(output.product_id)) || [],
                    })}
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {recipes.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {item.displayName} - V{item.version_no}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Arrobas"
                    value={row.arrobas}
                    onChange={(event) => onChange(index, { arrobas: event.target.value })}
                    inputProps={{ min: 0.001, step: "0.001" }}
                  />
                </TableCell>
                <TableCell>
                  {recipe?.outputs?.length ? (
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
                      {recipe.outputs.map((output) => {
                        const productId = String(output.product_id);
                        const checked = row.productIds.includes(productId);
                        const expected = Number(output.expected_quantity || 0) * Number(row.arrobas || 0);
                        return (
                          <Chip
                            key={productId}
                            clickable
                            color={checked ? "primary" : "default"}
                            variant={checked ? "filled" : "outlined"}
                            icon={<Checkbox checked={checked} size="small" sx={{ p: 0, ml: 0.5 }} />}
                            label={`${output.product_name}: ${formatNumber(expected)}`}
                            onClick={() => onChange(index, {
                              productIds: checked
                                ? row.productIds.filter((id) => id !== productId)
                                : [...row.productIds, productId],
                            })}
                          />
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Selecciona una receta.</Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Subir">
                    <span>
                      <IconButton size="small" onClick={() => onMove(index, -1)} disabled={index === 0}>
                        <ArrowUpwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Bajar">
                    <span>
                      <IconButton size="small" onClick={() => onMove(index, 1)} disabled={index === rows.length - 1}>
                        <ArrowDownwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Quitar">
                    <span>
                      <IconButton size="small" color="error" onClick={() => onRemove(index)} disabled={rows.length === 1}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </Stack>
);

export default ProductionPlanRecipeTable;
