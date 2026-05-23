import { Alert, CircularProgress, Grid, Typography } from "@mui/material";
import AppCard from "@core/components/ui/AppCard";

const CatalogListView = ({ title, subtitle, loading, error, items = [], itemKey = "id", nameField = "name" }) => {
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
        {items.map((item, index) => (
          <Grid item xs={12} sm={6} lg={4} key={item[itemKey] ?? `${nameField}-${index}`}>
            <AppCard>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, wordBreak: "break-word" }}>
                {item[nameField] || item.description || "Sin nombre"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Codigo: {item.id || item[itemKey] || "N/A"}
              </Typography>
            </AppCard>
          </Grid>
        ))}
      </Grid>
      {!loading && items.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No hay registros para mostrar.
        </Alert>
      ) : null}
    </>
  );
};

export default CatalogListView;
