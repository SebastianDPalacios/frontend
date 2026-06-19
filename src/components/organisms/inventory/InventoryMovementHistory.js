import { Alert, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import SectionHeader from "components/atoms/SectionHeader";
import PaginationControls from "components/molecules/PaginationControls";

const InventoryMovementHistory = ({
  historyTotal,
  historySearch,
  onHistorySearchChange,
  historyItemType,
  onHistoryItemTypeChange,
  historyMovementType,
  onHistoryMovementTypeChange,
  historyDateFrom,
  onHistoryDateFromChange,
  historyDateTo,
  onHistoryDateToChange,
  itemTypeLabels,
  movementTypeLabels,
  movementTypeColors,
  historyLoading,
  movementHistory,
  formatNumber,
  formatDate,
  getMovementExplanation,
  pageSize,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 2 }}>
    <Stack spacing={2}>
      <SectionHeader
        title="Historial de inventario"
        subtitle="Mira qué entró, qué salió y cuál fue la razón."
        action={<Chip label={`${historyTotal} movimientos`} variant="outlined" />}
      />

      <Grid container spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Buscar"
            value={historySearch}
            onChange={(event) => onHistorySearchChange(event.target.value)}
            placeholder="Factura, proveedor o insumo"
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField select fullWidth label="Item" value={historyItemType} onChange={(event) => onHistoryItemTypeChange(event.target.value)}>
            {Object.entries(itemTypeLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            label="Movimiento"
            value={historyMovementType}
            onChange={(event) => onHistoryMovementTypeChange(event.target.value)}
          >
            {Object.entries(movementTypeLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={2}>
          <BalanceDatePicker
            fullWidth
            label="Desde"
            value={historyDateFrom}
            onChange={(nextDate) => onHistoryDateFromChange(nextDate || "")}
            helperText=" "
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <BalanceDatePicker
            fullWidth
            label="Hasta"
            value={historyDateTo}
            onChange={(nextDate) => onHistoryDateToChange(nextDate || "")}
            helperText=" "
          />
        </Grid>
      </Grid>

      {historyLoading ? <Alert severity="info">Cargando historial de inventario...</Alert> : null}
      {!historyLoading && movementHistory.length === 0 ? (
        <Alert severity="info">No hay movimientos para los filtros seleccionados.</Alert>
      ) : null}

      {movementHistory.length > 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          {movementHistory.map((movement, index) => {
            const unit = movement.item_unit || "unit";
            const color = movementTypeColors[movement.movement_type] || "default";

            return (
              <Grid
                container
                spacing={1.5}
                key={movement.id}
                sx={{
                  alignItems: "center",
                  px: 2,
                  py: 1.5,
                  borderBottom: index === movementHistory.length - 1 ? 0 : 1,
                  borderColor: "divider",
                }}
              >
                <Grid item xs={12} md={5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                    <Chip size="small" color={color} label={movementTypeLabels[movement.movement_type] || movement.movement_type} />
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900 }} noWrap>
                        {movement.item_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {getMovementExplanation(movement)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography sx={{ fontWeight: 900 }}>
                    {formatNumber(movement.quantity, unit)} {unit}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(movement.moved_at)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {movement.branch_name}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={1}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {movement.created_by_name || "Sistema"}
                  </Typography>
                </Grid>
              </Grid>
            );
          })}
        </Paper>
      ) : null}

      {historyTotal > pageSize ? (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={onPreviousPage}
          onNext={onNextPage}
        />
      ) : null}
    </Stack>
  </Paper>
);

export default InventoryMovementHistory;
