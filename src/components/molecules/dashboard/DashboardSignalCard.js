import Link from "next/link";
import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const DashboardSignalCard = ({ title, value, helper, href, label, color = "info", icon }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 3,
      p: 1.5,
      height: "100%",
      borderTop: "4px solid",
      borderTopColor: `${color}.main`,
      bgcolor: "background.paper",
      transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
      "&:hover": {
        boxShadow: "0 10px 24px rgba(13, 21, 37, 0.06)",
        transform: "translateY(-1px)",
      },
    }}
  >
    <Stack spacing={1.35} sx={{ height: "100%", minWidth: 0 }}>
      <Stack direction="row" spacing={1.15} sx={{ alignItems: "center", minWidth: 0 }}>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 42, height: 42, flexShrink: 0 }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Pendiente operativo
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1, mb: 0.75 }}>
          {value}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            lineHeight: 1.35,
            overflow: "hidden",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
          }}
        >
          {helper}
        </Typography>
      </Box>

      <AppButton component={Link} href={href} color="secondary" variant="outlined" sx={{ alignSelf: "stretch", flexShrink: 0 }}>
        {label}
      </AppButton>
    </Stack>
  </Paper>
);

export default DashboardSignalCard;
