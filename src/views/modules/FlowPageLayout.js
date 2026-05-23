import Link from "next/link";
import { Box, Button, Stack, Typography } from "@mui/material";

const FlowPageLayout = ({ title, subtitle, links = [], children }) => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: 24, sm: 30 } }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {subtitle}
      </Typography>
      {links.length > 0 ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 3, flexWrap: "wrap" }}>
          {links.map((link) => (
            <Button
              key={link.href}
              component={Link}
              href={link.href}
              variant={link.active ? "contained" : "outlined"}
              size="small"
              color="secondary"
              fullWidth={false}
              sx={{ justifyContent: { xs: "flex-start", sm: "center" }, width: { xs: "100%", sm: "auto" } }}
            >
              {link.label}
            </Button>
          ))}
        </Stack>
      ) : null}
      {children}
    </Box>
  );
};

export default FlowPageLayout;
