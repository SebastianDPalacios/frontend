import { IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AppButton from "@core/components/ui/AppButton";
import { getDisplayName } from "views/modules/flow-utils";

const getUnitLabel = (material) => (material?.unit === "ml" ? "Mililitros" : "Gramos");

const RecipeIngredientsTable = ({
  rows,
  rawMaterials,
  onAdd,
  onChange,
  onMove,
  onRemove,
  addLabel = "Agregar ingrediente",
  allowEmpty = false,
}) => (
  <Stack spacing={1.5}>
    <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
      <Table size="small" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow sx={{ "& th": { bgcolor: "background.default", fontWeight: 900 } }}>
            <TableCell width={64}>Orden</TableCell>
            <TableCell width={180}>Concepto</TableCell>
            <TableCell>Materia prima</TableCell>
            <TableCell width={180}>Cantidad</TableCell>
            <TableCell width={150} align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const material = rawMaterials.find((item) => String(item.id) === String(row.rawMaterialId));

            return (
              <TableRow key={row.rowKey || `${row.rawMaterialId}-${index}`} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                <TableCell>
                  <Typography sx={{ fontWeight: 900 }}>{index + 1}</Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    value={row.concept}
                    onChange={(event) => onChange(index, "concept", event.target.value)}
                    inputProps={{ "aria-label": `Concepto del ingrediente ${index + 1}` }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={row.rawMaterialId}
                    onChange={(event) => onChange(index, "rawMaterialId", event.target.value)}
                    label="Materia prima"
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {rawMaterials.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {getDisplayName(item)}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label={getUnitLabel(material)}
                    value={row.quantity}
                    onChange={(event) => onChange(index, "quantity", event.target.value)}
                    inputProps={{ min: 0.001, step: "0.001" }}
                  />
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
                      <IconButton size="small" color="error" onClick={() => onRemove(index)} disabled={!allowEmpty && rows.length === 1}>
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

    <AppButton color="secondary" variant="outlined" onClick={onAdd} sx={{ alignSelf: "flex-start" }}>
      <AddCircleOutlineIcon sx={{ mr: 1 }} />
      {addLabel}
    </AppButton>
  </Stack>
);

export default RecipeIngredientsTable;
