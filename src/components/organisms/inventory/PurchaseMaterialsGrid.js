import { Alert, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import SectionHeader from "components/atoms/SectionHeader";
import PaginationControls from "components/molecules/PaginationControls";

const PurchaseMaterialsGrid = ({
  loading,
  materials,
  visibleMaterials,
  currentPage,
  totalPages,
  pageSize,
  onPreviousPage,
  onNextPage,
  formatNumber,
  getDisplayName,
}) => {
  const totalMaterials = materials.length;
  const rangeStart = totalMaterials === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalMaterials);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
      <SectionHeader
        title="Materias para compra"
        subtitle="Stock actual de insumos para la sucursal seleccionada."
        action={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
            <Chip label={`${totalMaterials} materias`} variant="outlined" />
            <Chip label={`Pagina ${currentPage} de ${totalPages}`} variant="outlined" />
          </Stack>
        }
      />

      <Stack spacing={2} sx={{ mt: 2 }}>
        {loading ? <Alert severity="info">Cargando materias primas...</Alert> : null}
        {!loading && totalMaterials === 0 ? <Alert severity="info">No hay materias primas para mostrar.</Alert> : null}

        <Grid container spacing={2}>
          {visibleMaterials.map((material) => {
            const unit = material.unit || "unit";
            const isLow = Number(material.quantity_on_hand || 0) < Number(material.min_stock || 0);

            return (
              <Grid item xs={12} md={6} xl={4} key={material.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    p: 2,
                    height: "100%",
                    borderColor: isLow ? "warning.main" : "divider",
                  }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800 }} noWrap>
                          {getDisplayName(material)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Unidad base: {unit}
                        </Typography>
                      </Stack>
                      <Chip
                        size="small"
                        label={isLow ? "Comprar" : "Stock ok"}
                        color={isLow ? "warning" : "success"}
                        variant={isLow ? "filled" : "outlined"}
                      />
                    </Stack>

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Disponible
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>
                          {formatNumber(material.quantity_on_hand, unit)} {unit}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Minimo
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {formatNumber(material.min_stock, unit)} {unit}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {totalMaterials > pageSize ? (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={onPreviousPage}
            onNext={onNextPage}
            label={`Mostrando ${rangeStart}-${rangeEnd} de ${totalMaterials}`}
          />
        ) : null}
      </Stack>
    </Paper>
  );
};

export default PurchaseMaterialsGrid;
