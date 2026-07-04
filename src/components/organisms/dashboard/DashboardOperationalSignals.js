import { Box, Chip, Stack } from "@mui/material";
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
      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
        {signals.map((signal) => (
          <DashboardSignalCard {...signal} key={signal.title} />
        ))}
      </Stack>
    </Box>
  );
};

export default DashboardOperationalSignals;
