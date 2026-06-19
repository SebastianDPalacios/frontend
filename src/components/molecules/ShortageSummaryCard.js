import { Paper, Stack, Typography } from "@mui/material";

const ShortageSummaryCard = ({ label, value, helper, color = "text.primary" }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, height: "100%" }}>
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 900, color }}>
        {value}
      </Typography>
      {helper ? (
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
      ) : null}
    </Stack>
  </Paper>
);

export default ShortageSummaryCard;
