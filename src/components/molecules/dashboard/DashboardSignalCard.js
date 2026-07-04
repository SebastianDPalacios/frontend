import Link from "next/link";
import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const DashboardSignalCard = ({ title, value, helper, href, label, color = "info", icon }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 3,
      p: 1.75,
      height: "100%",
      borderLeft: "4px solid",
      borderLeftColor: `${color}.main`,
      bgcolor: "background.paper",
    }}
  >
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ height: "100%", alignItems: { sm: "center" } }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", flex: 1, minWidth: 0 }}>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 36, height: 36 }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "baseline" }}>
            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {helper}
            </Typography>
          </Stack>
        </Box>
      </Stack>
      <AppButton component={Link} href={href} color="secondary" variant="outlined" sx={{ alignSelf: { xs: "stretch", sm: "center" }, flexShrink: 0 }}>
        {label}
      </AppButton>
    </Stack>
  </Paper>
);

export default DashboardSignalCard;
