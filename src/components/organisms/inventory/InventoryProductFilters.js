import { Grid, MenuItem, Paper, TextField, Typography } from "@mui/material";
import SearchableSelect from "@core/components/ui/SearchableSelect";

const InventoryProductFilters = ({ branches, selectedBranch, onBranchChange, search, onSearchChange, getDisplayName }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
    <Grid container spacing={2} sx={{ alignItems: "center" }}>
      <Grid item xs={12} md={4}>
        <SearchableSelect select fullWidth label="Sucursal" value={selectedBranch} onChange={(event) => onBranchChange(event.target.value)}>
          {branches.map((branch) => (
            <MenuItem key={branch.id} value={String(branch.id)}>
              {getDisplayName(branch)}
            </MenuItem>
          ))}
        </SearchableSelect>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Buscar producto" placeholder="Nombre o codigo" value={search} onChange={(event) => onSearchChange(event.target.value)} />
      </Grid>
      <Grid item xs={12} md={4}>
        <Typography variant="body2" color="text.secondary">Revisa existencias de producto terminado por sucursal.</Typography>
      </Grid>
    </Grid>
  </Paper>
);

export default InventoryProductFilters;
