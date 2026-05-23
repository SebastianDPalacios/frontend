import { Alert, CircularProgress, Grid, Typography } from "@mui/material";
import AppCard from "@core/components/ui/AppCard";

const BaseDataView = ({ title, subtitle, loading, error, sections = [] }) => {
  if (loading) {
    return <CircularProgress size={28} />;
  }

  return (
    <>
      <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: 24, sm: 30 } }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {subtitle}
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {sections.map((section) => (
          <Grid item xs={12} sm={6} lg={4} key={section.key}>
            <AppCard>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {section.label}
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontSize: { xs: 28, sm: 34 } }}>
                {section.total}
              </Typography>
            </AppCard>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default BaseDataView;
