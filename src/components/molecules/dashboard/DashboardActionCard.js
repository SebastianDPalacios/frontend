import Link from "next/link";
import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const DashboardActionCard = ({ title, description, href, icon, label = "Abrir", primary = false, compact = false }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 3,
      p: compact ? 1.5 : 2,
      height: "100%",
      minHeight: compact ? 126 : "auto",
      bgcolor: "background.default",
      overflow: "hidden",
      transition: "border-color 160ms ease, box-shadow 160ms ease",
      "&:hover": {
        borderColor: "secondary.main",
        boxShadow: "0 8px 20px rgba(13, 21, 37, 0.06)",
      },
    }}
  >
    <Stack
      direction="column"
      spacing={compact ? 1.5 : 1.5}
      sx={{ height: "100%", alignItems: "stretch", minWidth: 0 }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", flex: 1, minWidth: 0 }}>
        <Avatar
          sx={{
            bgcolor: primary ? "secondary.main" : "action.hover",
            color: primary ? "common.white" : "text.primary",
            width: compact ? 40 : 38,
            height: compact ? 40 : 38,
            flexShrink: 0,
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 900, lineHeight: 1.2, overflowWrap: "normal" }}>{title}</Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.35,
              lineHeight: 1.25,
              display: "-webkit-box",
              WebkitLineClamp: compact ? 1 : "unset",
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
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
        sx={{ alignSelf: compact ? "stretch" : "flex-start", flexShrink: 0, minHeight: compact ? 42 : undefined }}
      >
        {label}
      </AppButton>
    </Stack>
  </Paper>
);

export default DashboardActionCard;
