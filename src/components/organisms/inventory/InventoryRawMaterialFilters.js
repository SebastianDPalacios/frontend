import { Grid, MenuItem, Paper, TextField, Typography } from "@mui/material";

const InventoryRawMaterialFilters = ({ branches, selectedBranch, onBranchChange, search, onSearchChange, getDisplayName }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
    <Grid container spacing={2} sx={{ alignItems: "center" }}>
      <Grid item xs={12} md={4}>
        <TextField select fullWidth label="Sucursal" value={selectedBranch} onChange={(event) => onBranchChange(event.target.value)}>
          {branches.map((branch) => (
            <MenuItem key={branch.id} value={String(branch.id)}>
              {getDisplayName(branch)}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Buscar materia prima"
          placeholder="Nombre o SKU"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <Typography variant="body2" color="text.secondary">
          Revisa existencias por sucursal. Cada materia prima usa su presentacion de compra configurada.
        </Typography>
      </Grid>
    </Grid>
  </Paper>
);

export default InventoryRawMaterialFilters;
