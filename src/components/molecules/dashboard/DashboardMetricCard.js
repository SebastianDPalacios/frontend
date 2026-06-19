import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";

const DashboardMetricCard = ({ title, value, helper, icon, color = "primary" }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, height: "100%" }}>
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Avatar sx={{ bgcolor: `${color}.main`, width: 40, height: 40 }}>{icon}</Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
          {value ?? "-"}
        </Typography>
        {helper ? (
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  </Paper>
);

export default DashboardMetricCard;
