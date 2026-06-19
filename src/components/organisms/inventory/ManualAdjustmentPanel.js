import { Alert, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import ColombianCurrencyField from "components/atoms/ColombianCurrencyField";
import SectionHeader from "components/atoms/SectionHeader";
import PaginationControls from "components/molecules/PaginationControls";

const ManualAdjustmentPanel = ({
  show,
  onToggle,
  movementTypeOptions,
  movementType,
  onMovementTypeChange,
  branches,
  selectedBranch,
  onBranchChange,
  fieldErrors,
  onClearFieldError,
  itemTypeFilter,
  onItemTypeFilterChange,
  search,
  onSearchChange,
  notes,
  onNotesChange,
  selectedMovement,
  selectedCount,
  onSubmitMovements,
  saving,
  loading,
  filteredItems,
  visibleItems,
  itemsPageSize,
  currentItemsPage,
  totalItemsPages,
  onPreviousItemsPage,
  onNextItemsPage,
  getDisplayName,
  formatNumber,
  formatUnits,
  formatMoney,
  isIntegerUnit,
  movementTypeLabel,
  quantities,
  onQuantityChange,
  getPurchaseRow,
  getPurchaseUnitOptions,
  updatePurchaseRow,
  isPurchaseInput,
  maxInventoryQuantity,
}) => (
  <>
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: show ? 2 : 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
      >
        <Stack spacing={0.25}>
          <Typography sx={{ fontWeight: 900 }}>Ajuste manual</Typography>
          <Typography variant="body2" color="text.secondary">
            Úsalo solo para corregir inventario físico, mermas o entradas sin factura.
          </Typography>
        </Stack>
        <AppButton variant={show ? "outlined" : "contained"} color="secondary" onClick={onToggle}>
          {show ? "Ocultar ajuste" : "Registrar ajuste manual"}
        </AppButton>
      </Stack>
    </Paper>

    {show ? (
      <>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 2 }}>
          <Stack spacing={2}>
            <SectionHeader
              title="Tipo de movimiento"
              subtitle="Elige si vas a sumar o restar inventario antes de capturar cantidades."
            />
            <Grid container spacing={2}>
              {movementTypeOptions.map((option) => {
                const isSelected = movementType === option.value;

                return (
                  <Grid item xs={12} md={6} key={option.value}>
                    <Paper
                      variant="outlined"
                      onClick={() => onMovementTypeChange(option.value)}
                      sx={{
                        borderRadius: 2,
                        p: 2,
                        cursor: "pointer",
                        height: "100%",
                        borderColor: isSelected ? `${option.color}.main` : "divider",
                        bgcolor: isSelected ? "action.selected" : "background.paper",
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Stack spacing={0.5}>
                          <Typography sx={{ fontWeight: 900 }}>{option.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.helper}
                          </Typography>
                        </Stack>
                        <Chip size="small" color={option.color} label={isSelected ? "Activo" : "Elegir"} variant={isSelected ? "filled" : "outlined"} />
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
          <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Sucursal"
                value={selectedBranch}
                onChange={(event) => onBranchChange(event.target.value)}
                error={Boolean(fieldErrors.selectedBranch)}
                helperText={fieldErrors.selectedBranch || " "}
              >
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={String(branch.id)}>
                    {getDisplayName(branch)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Ver" value={itemTypeFilter} onChange={(event) => onItemTypeFilterChange(event.target.value)}>
                <MenuItem value="raw_material">Materia prima</MenuItem>
                <MenuItem value="product">Productos</MenuItem>
                <MenuItem value="all">Todos</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Buscar item" value={search} onChange={(event) => onSearchChange(event.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas"
                value={notes}
                onChange={(event) => {
                  onClearFieldError("notes");
                  onNotesChange(event.target.value);
                }}
                error={Boolean(fieldErrors.notes)}
                helperText={fieldErrors.notes || " "}
              />
            </Grid>
          </Grid>
        </Paper>

        {fieldErrors.quantities ? <Alert severity="warning" sx={{ mb: 2 }}>{fieldErrors.quantities}</Alert> : null}
        <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", mb: 2 }}
          >
            <SectionHeader
              title="Items de inventario"
              subtitle={`${selectedMovement.title}: captura cantidades en la unidad base de cada item.`}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
              <Chip size="small" variant="outlined" label={`${selectedCount} con cantidad`} />
              <Chip size="small" color={selectedMovement.color} label={selectedMovement.title} />
              <AppButton color="secondary" onClick={onSubmitMovements} disabled={saving || loading}>
                {saving ? "Aplicando..." : "Aplicar movimientos"}
              </AppButton>
            </Stack>
          </Stack>

          {loading ? <Alert severity="info">Cargando items de inventario...</Alert> : null}
          {!loading && filteredItems.length === 0 ? (
            <Alert severity="info">No hay items para los filtros seleccionados.</Alert>
          ) : null}

          <Grid container spacing={2}>
            {visibleItems.map((item) => {
              const purchaseRow = getPurchaseRow(item);
              const showPurchaseFields = isPurchaseInput && item.item_type === "raw_material";

              return (
                <Grid item xs={12} md={6} xl={4} key={item.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      p: 2,
                      height: "100%",
                      borderColor: (showPurchaseFields ? purchaseRow.baseQuantity : Number(quantities[item.id] || 0)) > 0 ? "primary.main" : "divider",
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }} noWrap>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Stock actual: {formatNumber(item.quantity_on_hand, item.unit)} {item.unit}
                          </Typography>
                        </Stack>
                        <Chip
                          size="small"
                          label={item.item_type === "product" ? "Producto" : "Materia prima"}
                          color={item.item_type === "product" ? "info" : "warning"}
                          variant="outlined"
                        />
                      </Stack>

                      <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, bgcolor: "action.hover" }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Disponible
                            </Typography>
                            <Typography sx={{ fontWeight: 800 }}>
                              {formatNumber(item.quantity_on_hand, item.unit)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Unidad
                            </Typography>
                            <Typography sx={{ fontWeight: 800 }}>
                              {item.unit}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>

                      {showPurchaseFields ? (
                        <Stack spacing={1.25}>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <TextField
                                type="number"
                                label="Cantidad comprada"
                                value={purchaseRow.packageQty || ""}
                                onChange={(event) => updatePurchaseRow(item.id, { packageQty: event.target.value })}
                                inputProps={{ min: 0, step: 0.001 }}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                select
                                label="Unidad"
                                value={purchaseRow.unit}
                                onChange={(event) => updatePurchaseRow(item.id, { unit: event.target.value })}
                                fullWidth
                              >
                                {getPurchaseUnitOptions(item).map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12}>
                              <ColombianCurrencyField
                                label="Costo total de la compra"
                                value={purchaseRow.totalCost}
                                onChange={(event) => updatePurchaseRow(item.id, { totalCost: event.target.value })}
                                helperText="Solo pesos colombianos, sin centavos"
                              />
                            </Grid>
                          </Grid>
                          <Alert severity="info">
                            Suma {formatUnits(purchaseRow.baseQuantity)} {item.unit}
                            {purchaseRow.unitCost ? ` Costo: ${formatMoney(purchaseRow.unitCost)} por ${item.unit}` : ""}
                          </Alert>
                        </Stack>
                      ) : (
                        <TextField
                          type="number"
                          label={`Cantidad a ${movementTypeLabel} (${item.unit})`}
                          value={quantities[item.id] || ""}
                          onChange={(event) => {
                            onClearFieldError("quantities");
                            onQuantityChange(item.id, event.target.value);
                          }}
                          inputProps={{ min: 0, max: maxInventoryQuantity, step: isIntegerUnit(item.unit) ? 1 : 0.001 }}
                          error={Boolean(fieldErrors.quantities)}
                          fullWidth
                        />
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          {filteredItems.length > itemsPageSize ? (
            <PaginationControls
              currentPage={currentItemsPage}
              totalPages={totalItemsPages}
              onPrevious={onPreviousItemsPage}
              onNext={onNextItemsPage}
              label={`Mostrando ${(currentItemsPage - 1) * itemsPageSize + 1}-${Math.min(currentItemsPage * itemsPageSize, filteredItems.length)} de ${filteredItems.length}`}
              sx={{ mt: 2 }}
            />
          ) : null}
        </Paper>
      </>
    ) : null}
  </>
);

export default ManualAdjustmentPanel;
