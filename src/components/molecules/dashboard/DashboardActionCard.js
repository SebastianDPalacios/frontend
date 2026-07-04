import Link from "next/link";
import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const DashboardActionCard = ({ title, description, href, icon, label = "Abrir", primary = false, compact = false }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 3,
      p: compact ? 1.75 : 2,
      height: "100%",
      minHeight: compact ? 124 : "auto",
      bgcolor: "background.default",
      transition: "border-color 160ms ease, box-shadow 160ms ease",
      "&:hover": {
        borderColor: "secondary.main",
        boxShadow: "0 8px 20px rgba(13, 21, 37, 0.06)",
      },
    }}
  >
    <Stack
      direction={compact ? { xs: "column", sm: "row" } : "column"}
      spacing={compact ? 1.5 : 1.5}
      sx={{ height: "100%", alignItems: compact ? { sm: "center" } : "stretch" }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", flex: 1, minWidth: 0 }}>
        <Avatar
          sx={{
            bgcolor: primary ? "secondary.main" : "action.hover",
            color: primary ? "common.white" : "text.primary",
            width: compact ? 40 : 38,
            height: compact ? 40 : 38,
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, overflowWrap: "anywhere" }}>
            {description}
          </Typography>
        </Box>
      </Stack>
      {!compact ? <Box sx={{ flex: 1 }} /> : null}
      <AppButton
        component={Link}
        href={href}
        color="secondary"
        variant={primary ? "contained" : "outlined"}
        sx={{ alignSelf: compact ? { xs: "stretch", sm: "center" } : "flex-start", flexShrink: 0 }}
      >
        {label}
      </AppButton>
    </Stack>
  </Paper>
);

export default DashboardActionCard;
