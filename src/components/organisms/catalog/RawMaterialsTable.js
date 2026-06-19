import Link from "next/link";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import PaginationControls from "components/molecules/PaginationControls";

const RawMaterialsTable = ({
  loading,
  error,
  items,
  filteredItems,
  visibleItems,
  categories,
  suppliers,
  search,
  pendingStatusId,
  unitOptions,
  moneyFormatter,
  onSearchChange,
  onEdit,
  onToggleStatus,
  getOptionName,
  formatPackageSummary,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      sx={{
        alignItems: { xs: "stretch", md: "center" },
        justifyContent: "space-between",
        px: { xs: 2, md: 3 },
        py: 2,
        bgcolor: "background.default",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Listado de materias primas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {loading ? "Cargando insumos..." : `${filteredItems.length} de ${items.length} materia(s) prima(s)`}
        </Typography>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
        <TextField
          size="small"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre, SKU, categoria o proveedor"
          sx={{ minWidth: { xs: "100%", sm: 320 } }}
        />
        <AppButton component={Link} href="/catalogo/nueva-materia-prima" color="secondary">
          Nueva materia prima
        </AppButton>
      </Stack>
    </Stack>

    {loading ? (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: { xs: 2, md: 3 }, py: 3 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Cargando materias primas...
        </Typography>
      </Stack>
    ) : null}

    {error ? (
      <Alert severity="error" sx={{ m: { xs: 2, md: 3 } }}>
        {error}
      </Alert>
    ) : null}

    {!loading ? (
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  bgcolor: "background.paper",
                  color: "text.secondary",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0,
                  textTransform: "uppercase",
                },
              }}
            >
              <TableCell>Materia prima</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell>Presentacion</TableCell>
              <TableCell align="right">Costo</TableCell>
              <TableCell align="right">Minimo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleItems.map((item) => {
              const isActive = Number(item.is_active) === 1;
              const isPending = pendingStatusId === item.id;

              return (
                <TableRow key={item.id} sx={{ "&:last-child td": { borderBottom: 0 }, "&:hover": { bgcolor: "action.hover" } }}>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Typography sx={{ fontWeight: 900 }}>{item.name || "Sin nombre"}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.sku || "Sin SKU"}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{getOptionName(categories, item.category_id)}</TableCell>
                  <TableCell>{getOptionName(suppliers, item.supplier_id)}</TableCell>
                  <TableCell>{unitOptions.find((unit) => unit.value === item.unit)?.label || item.unit || "Sin unidad"}</TableCell>
                  <TableCell>{formatPackageSummary(item)}</TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 800 }}>{moneyFormatter.format(Number(item.unit_cost || 0))}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      por {item.unit === "ml" ? "ml" : "g"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{Number(item.min_stock || 0).toLocaleString("es-CO")}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Chip
                        label={isActive ? "Activa" : "Inactiva"}
                        color={isActive ? "success" : "default"}
                        size="small"
                        variant={isActive ? "outlined" : "filled"}
                        sx={{ minWidth: 82, fontWeight: 800 }}
                      />
                      <Switch checked={isActive} disabled={isPending} onChange={() => onToggleStatus(item)} size="small" />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                      <AppButton variant="outlined" color="secondary" onClick={() => onEdit(item)}>
                        Editar
                      </AppButton>
                      <AppButton variant="outlined" color={isActive ? "error" : "secondary"} onClick={() => onToggleStatus(item)} disabled={isPending}>
                        {isActive ? "Eliminar" : "Activar"}
                      </AppButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography color="text.secondary">No hay materias primas con esos filtros.</Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    ) : null}

    {!loading && filteredItems.length > 0 ? (
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevious={onPreviousPage}
        onNext={onNextPage}
        label={`Página ${currentPage} de ${totalPages} · ${filteredItems.length} registro${filteredItems.length === 1 ? "" : "s"}`}
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      />
    ) : null}
  </Paper>
);

export default RawMaterialsTable;
