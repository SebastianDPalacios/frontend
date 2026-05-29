import Link from "next/link";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

const FlowPageLayout = ({ title, subtitle, links = [], children }) => {
  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "flex-end" }, mb: links.length > 0 ? 2 : 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: 24, sm: 30 } }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      {links.length > 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            p: 1,
            mb: 3,
            display: "inline-flex",
            maxWidth: "100%",
            bgcolor: "background.paper",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75} sx={{ flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
            {links.map((link) => (
              <Button
                key={link.href}
                component={Link}
                href={link.href}
                variant={link.active ? "contained" : "text"}
                size="small"
                color="secondary"
                fullWidth={false}
                sx={{
                  borderRadius: 2,
                  minHeight: 40,
                  px: 2.5,
                  justifyContent: { xs: "flex-start", sm: "center" },
                  width: { xs: "100%", sm: "auto" },
                  color: link.active ? "secondary.contrastText" : "text.secondary",
                  fontWeight: link.active ? 800 : 700,
                  "&:hover": {
                    bgcolor: link.active ? "secondary.dark" : "action.hover",
                  },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
        </Paper>
      ) : null}
      {children}
    </Box>
  );
};

export default FlowPageLayout;
