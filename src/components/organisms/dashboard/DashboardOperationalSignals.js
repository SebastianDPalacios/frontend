import { Box, Chip, Grid } from "@mui/material";
import SectionHeader from "components/atoms/SectionHeader";
import DashboardSignalCard from "components/molecules/dashboard/DashboardSignalCard";

const DashboardOperationalSignals = ({ signals }) => {
  if (signals.length === 0) {
    return null;
  }

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <SectionHeader
        title="Pendientes importantes"
        subtitle="Revisa primero lo que puede detener ventas, producción o inventario."
        action={<Chip label={`${signals.length} por revisar`} color="warning" variant="outlined" />}
      />
      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        {signals.map((signal) => (
          <Grid item xs={12} sm={6} lg={4} key={signal.title}>
            <DashboardSignalCard {...signal} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardOperationalSignals;
