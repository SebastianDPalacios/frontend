import Link from "next/link";
import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const DashboardActionCard = ({ title, description, href, icon, label = "Abrir", primary = false }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 2,
      p: 2,
      height: "100%",
      transition: "border-color 160ms ease, box-shadow 160ms ease",
      "&:hover": {
        borderColor: "secondary.main",
        boxShadow: "0 8px 20px rgba(13, 21, 37, 0.06)",
      },
    }}
  >
    <Stack spacing={1.5} sx={{ height: "100%" }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
        <Avatar
          sx={{
            bgcolor: primary ? "secondary.main" : "action.hover",
            color: primary ? "common.white" : "text.primary",
            width: 38,
            height: 38,
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ flex: 1 }} />
      <AppButton
        component={Link}
        href={href}
        color="secondary"
        variant={primary ? "contained" : "outlined"}
        sx={{ alignSelf: "flex-start" }}
      >
        {label}
      </AppButton>
    </Stack>
  </Paper>
);

export default DashboardActionCard;
