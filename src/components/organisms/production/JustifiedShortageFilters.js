import { Grid, MenuItem, Paper, Stack, TextField } from "@mui/material";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import AppButton from "@core/components/ui/AppButton";
import SectionHeader from "components/atoms/SectionHeader";
import { shortageReasonLabels } from "components/atoms/ShortageReasonChip";

const JustifiedShortageFilters = ({
  branches,
  products,
  filters,
  onChange,
  onClear,
  loading,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 2 }}>
    <Stack spacing={2}>
      <SectionHeader
        title="Filtros"
        subtitle="Busca por lote, producto, responsable o explicación."
        action={
          <AppButton variant="outlined" color="secondary" onClick={onClear}>
            Limpiar
          </AppButton>
        }
      />

      <Grid container spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Buscar"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Lote, producto o responsable"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            select
            fullWidth
            label="Sucursal"
            value={filters.branchId}
            onChange={(event) => onChange("branchId", event.target.value)}
            disabled={loading}
          >
            <MenuItem value="">Todas</MenuItem>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={String(branch.id)}>
                {branch.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            select
            fullWidth
            label="Producto"
            value={filters.productId}
            onChange={(event) => onChange("productId", event.target.value)}
            disabled={loading}
          >
            <MenuItem value="">Todos</MenuItem>
            {products.map((product) => (
              <MenuItem key={product.id} value={String(product.id)}>
                {product.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            select
            fullWidth
            label="Motivo"
            value={filters.missingReason}
            onChange={(event) => onChange("missingReason", event.target.value)}
          >
            <MenuItem value="all">Todos</MenuItem>
            {Object.entries(shortageReasonLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={1.5}>
          <BalanceDatePicker
            fullWidth
            label="Desde"
            value={filters.dateFrom}
            onChange={(value) => onChange("dateFrom", value || "")}
            helperText=" "
          />
        </Grid>
        <Grid item xs={12} sm={6} md={1.5}>
          <BalanceDatePicker
            fullWidth
            label="Hasta"
            value={filters.dateTo}
            onChange={(value) => onChange("dateTo", value || "")}
            helperText=" "
          />
        </Grid>
      </Grid>
    </Stack>
  </Paper>
);

export default JustifiedShortageFilters;
