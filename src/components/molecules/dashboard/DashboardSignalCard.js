import Link from "next/link";
import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const DashboardSignalCard = ({ title, value, helper, href, label, color = "info", icon }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 2,
      p: 2,
      height: "100%",
      borderLeft: "4px solid",
      borderLeftColor: `${color}.main`,
    }}
  >
    <Stack spacing={1.25} sx={{ height: "100%" }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 36, height: 36 }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {value}
          </Typography>
        </Box>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {helper}
      </Typography>
      <AppButton component={Link} href={href} color="secondary" variant="text" sx={{ alignSelf: "flex-start", px: 0 }}>
        {label}
      </AppButton>
    </Stack>
  </Paper>
);

export default DashboardSignalCard;
