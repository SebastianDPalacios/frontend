import { Box, Chip, Grid, Paper } from "@mui/material";
import SectionHeader from "components/atoms/SectionHeader";
import DashboardActionCard from "components/molecules/dashboard/DashboardActionCard";

const DashboardActionSection = ({ title, subtitle, actions }) => {
  if (actions.length === 0) {
    return null;
  }

  return (
    <Box component="section" sx={{ mb: 3 }}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={<Chip label={`${actions.length} acceso${actions.length === 1 ? "" : "s"}`} variant="outlined" />}
      />
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 1.5, md: 2 },
          mt: 1.5,
          bgcolor: "background.paper",
        }}
      >
        <Grid container spacing={1.5}>
          {actions.map((action) => (
            <Grid item xs={12} md={6} key={action.href}>
              <DashboardActionCard {...action} compact />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default DashboardActionSection;
