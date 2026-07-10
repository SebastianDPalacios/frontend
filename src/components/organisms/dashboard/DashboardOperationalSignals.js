import { Box, Chip, Grid } from "@mui/material";
import SectionHeader from "components/atoms/SectionHeader";
import DashboardSignalCard from "components/molecules/dashboard/DashboardSignalCard";

const DashboardOperationalSignals = ({ signals }) => {
  if (signals.length === 0) {
    return null;
  }

  return (
    <Box component="section">
      <SectionHeader
        title="Pendientes importantes"
        subtitle="Revisa primero lo que puede detener ventas, producción o inventario."
        action={<Chip label={`${signals.length} por revisar`} color="warning" variant="outlined" />}
      />
      <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
        {signals.map((signal) => (
          <Grid item xs={12} sm={6} lg={signals.length > 3 ? 4 : 12 / signals.length} key={signal.title}>
            <DashboardSignalCard {...signal} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardOperationalSignals;
