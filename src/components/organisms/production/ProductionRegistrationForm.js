import { Alert, Autocomplete, Box, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import FactoryRoundedIcon from "@mui/icons-material/FactoryRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import SearchableSelect from "@core/components/ui/SearchableSelect";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    bgcolor: "background.default",
    minHeight: 56,
  },
  "& .MuiInputLabel-root": { fontWeight: 700 },
};

const normalizeWholeNumberInput = (value, update) => {
  if (value === "" || /^\d+$/.test(value)) update(value);
};

const ProductionRegistrationForm = ({
  isAdministrator,
  baker,
  bakers,
  branches,
  products,
  selectedProduct,
  form,
  saving,
  today,
  onBakerChange,
  onFormChange,
  onProductChange,
  onSubmit,
}) => {
  const isRetroactive = form.producedDate < today;
  const canSubmit = Boolean(
    baker
    && selectedProduct
    && Number.isInteger(Number(form.producedQuantity))
    && Number(form.producedQuantity) > 0
    && !saving
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: { xs: 4, md: 5 },
        borderColor: "rgba(221, 93, 38, 0.24)",
        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
        "&:before": { content: '""', position: "absolute", inset: "0 0 auto", height: 7, bgcolor: "secondary.main" },
      }}
    >
      <Box sx={{ p: { xs: 2.25, sm: 3 }, color: "common.white", background: "linear-gradient(135deg, #111827 0%, #1f2937 72%, #3b241c 100%)" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box sx={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 3, bgcolor: "secondary.main", flexShrink: 0 }}>
            <FactoryRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.1 }}>Registrar producto elaborado</Typography>
            <Typography sx={{ mt: 0.5, color: "rgba(255,255,255,.72)" }}>Carga rápida de la producción terminada.</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 0.75 }}>
          <Chip label="Registro libre" size="small" sx={{ bgcolor: "rgba(255,255,255,.12)", color: "common.white", fontWeight: 800 }} />
          <Chip label="Solo unidades completas" size="small" sx={{ bgcolor: "rgba(221,93,38,.28)", color: "#ffd7c4", fontWeight: 800 }} />
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2.25, sm: 3 }, bgcolor: "background.paper" }}>
        {!baker && !isAdministrator ? <Alert severity="warning" sx={{ mb: 2 }}>Tu usuario no tiene un empleado panadero activo asociado.</Alert> : null}
        {isAdministrator && !baker ? <Alert severity="info" sx={{ mb: 2 }}>Como administrador, selecciona el panadero por quien vas a registrar la producción.</Alert> : null}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(12, minmax(0, 1fr))" }, gap: 2 }}>
          {isAdministrator ? (
            <SearchableSelect select fullWidth label="Panadero responsable" value={form.bakerEmployeeId} onChange={(event) => onBakerChange(event.target.value)} sx={{ ...fieldSx, gridColumn: { lg: "span 4" } }}>
              <MenuItem value="">Seleccionar panadero</MenuItem>
              {bakers.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
            </SearchableSelect>
          ) : null}

          <SearchableSelect select fullWidth label="Sucursal" value={form.branchId} onChange={(event) => onFormChange("branchId", event.target.value)} sx={{ ...fieldSx, gridColumn: { lg: isAdministrator ? "span 4" : "span 6" } }}>
            {branches.map((branch) => <MenuItem key={branch.id} value={String(branch.id)}>{branch.name}</MenuItem>)}
          </SearchableSelect>

          <Autocomplete
            fullWidth
            options={products}
            value={selectedProduct}
            onChange={(_event, product) => onProductChange(product)}
            getOptionLabel={(product) => product.product_name || "Producto"}
            isOptionEqualToValue={(option, value) => String(option.product_id) === String(value.product_id)}
            noOptionsText="No encontramos productos"
            sx={{ ...fieldSx, gridColumn: { sm: "span 2", lg: isAdministrator ? "span 4" : "span 6" } }}
            renderInput={(params) => <TextField {...params} label="Producto" placeholder="Escribe para buscar" />}
          />

          <TextField
            fullWidth
            type="number"
            label="Unidades producidas"
            value={form.producedQuantity}
            inputProps={{ min: 1, step: 1, inputMode: "numeric" }}
            onChange={(event) => normalizeWholeNumberInput(event.target.value, (value) => onFormChange("producedQuantity", value))}
            sx={{ ...fieldSx, gridColumn: { lg: "span 6" } }}
          />

          <Box sx={{ gridColumn: { lg: "span 6" }, "& .MuiOutlinedInput-root": { minHeight: 56 } }}>
            <BalanceDatePicker
              fullWidth
              label="Fecha de producción"
              value={form.producedDate}
              maxDate={today}
              onChange={(value) => onFormChange("producedDate", value)}
            />
          </Box>

          {isAdministrator && isRetroactive ? (
            <TextField
              fullWidth
              label="Motivo del registro retroactivo"
              value={form.retroactiveReason}
              onChange={(event) => onFormChange("retroactiveReason", event.target.value)}
              helperText="Este motivo quedará registrado en la auditoría del lote."
              sx={{ ...fieldSx, gridColumn: "1 / -1" }}
            />
          ) : null}
        </Box>

        {selectedProduct ? (
          <Box sx={{ mt: 2, p: 1.75, borderRadius: 3, display: "flex", alignItems: "center", gap: 1.25, bgcolor: "rgba(221, 93, 38, 0.07)", border: "1px solid rgba(221, 93, 38, 0.2)" }}>
            <Inventory2OutlinedIcon color="secondary" />
            <Box>
              <Typography variant="caption" color="text.secondary">Producto y receta vigente</Typography>
              <Typography sx={{ fontWeight: 900 }}>{selectedProduct.product_name}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedProduct.recipe_name} · Versión {selectedProduct.recipe_version}</Typography>
            </Box>
          </Box>
        ) : null}

        <AppButton fullWidth color="secondary" disabled={!canSubmit} onClick={onSubmit} sx={{ mt: 2, minHeight: 58, borderRadius: 3, fontSize: 17, fontWeight: 900, boxShadow: selectedProduct ? "0 10px 24px rgba(221, 93, 38, 0.25)" : "none" }}>
          {saving ? "Guardando..." : "Guardar producción"}
        </AppButton>
      </Box>
    </Paper>
  );
};

export default ProductionRegistrationForm;
