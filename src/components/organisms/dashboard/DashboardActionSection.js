import { Box, Chip, Grid } from "@mui/material";
import SectionHeader from "components/atoms/SectionHeader";
import DashboardActionCard from "components/molecules/dashboard/DashboardActionCard";

const DashboardActionSection = ({ title, subtitle, actions }) => {
  if (actions.length === 0) {
    return null;
  }

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={<Chip label={`${actions.length} acceso${actions.length === 1 ? "" : "s"}`} variant="outlined" />}
      />
      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        {actions.map((action) => (
          <Grid item xs={12} sm={6} lg={3} key={action.href}>
            <DashboardActionCard {...action} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardActionSection;
