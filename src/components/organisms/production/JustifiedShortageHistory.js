import { Alert, Box, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import SectionHeader from "components/atoms/SectionHeader";
import ShortageReasonChip from "components/atoms/ShortageReasonChip";
import PaginationControls from "components/molecules/PaginationControls";

const JustifiedShortageHistory = ({
  items,
  loading,
  total,
  pageSize,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  formatNumber,
  formatDate,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
    <Stack spacing={2}>
      <SectionHeader
        title="Historial de faltantes"
        subtitle="Cada registro conserva el lote, la persona que reportó y la explicación."
        action={<Chip label={`${total} casos`} variant="outlined" />}
      />

      {loading ? <Alert severity="info">Cargando faltantes justificados...</Alert> : null}
      {!loading && items.length === 0 ? (
        <Alert severity="info">No hay faltantes para los filtros seleccionados.</Alert>
      ) : null}

      {items.length > 0 ? (
        <Stack spacing={1}>
          {items.map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
              <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
                <Grid item xs={12} md={3}>
                  <Typography sx={{ fontWeight: 900 }}>{item.product_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lote #{item.production_batch_id} · {item.branch_name}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3} md={1.5}>
                  <Typography variant="caption" color="text.secondary">
                    Cantidad
                  </Typography>
                  <Typography sx={{ fontWeight: 900 }}>{formatNumber(item.missing_quantity)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <ShortageReasonChip reason={item.missing_reason} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Explicación
                  </Typography>
                  <Typography variant="body2">{item.notes || "Sin explicación"}</Typography>
                </Grid>
                <Grid item xs={6} md={1.5}>
                  <Typography variant="caption" color="text.secondary">
                    Reportó
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {item.reported_by_name || "Sistema"}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={1}>
                  <Typography variant="caption" color="text.secondary">
                    Fecha
                  </Typography>
                  <Typography variant="body2">{formatDate(item.packed_date)}</Typography>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Stack>
      ) : null}

      {total > pageSize ? (
        <Box>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={onPreviousPage}
            onNext={onNextPage}
          />
        </Box>
      ) : null}
    </Stack>
  </Paper>
);

export default JustifiedShortageHistory;
