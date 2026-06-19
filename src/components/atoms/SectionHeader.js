import { Stack, Typography } from "@mui/material";

const SectionHeader = ({ title, subtitle, action }) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={1.5}
    sx={{ alignItems: { xs: "stretch", sm: "flex-start" }, justifyContent: "space-between" }}
  >
    <Stack spacing={0.5}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
    {action || null}
  </Stack>
);

export default SectionHeader;
