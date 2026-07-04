import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";

const DashboardMetricCard = ({ title, value, helper, icon, color = "primary" }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 3,
      p: 1.75,
      height: "100%",
      bgcolor: "background.paper",
      transition: "transform 160ms ease, border-color 160ms ease",
      "&:hover": {
        transform: "translateY(-1px)",
        borderColor: `${color}.light`,
      },
    }}
  >
    <Stack
      direction="row"
      spacing={{ xs: 1.1, sm: 1.5 }}
      sx={{ alignItems: "center", minWidth: 0 }}
    >
      <Avatar sx={{ bgcolor: `${color}.main`, width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 }, flexShrink: 0 }}>
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.15 }}>
          {title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.05, fontSize: { xs: 24, sm: 26 } }}>
          {value ?? "-"}
        </Typography>
        {helper ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              lineHeight: 1.2,
              overflowWrap: "anywhere",
            }}
          >
            {helper}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  </Paper>
);

export default DashboardMetricCard;
