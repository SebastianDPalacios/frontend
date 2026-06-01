import NextLink from "next/link";
import { useRouter } from "next/router";
import { Box, Breadcrumbs, Button, Link as MuiLink, Paper, Stack, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import navigationItems from "configs/navigation";

const findBreadcrumbs = (pathname) => {
  for (const section of navigationItems) {
    for (const item of section.items || []) {
      if (item.path === pathname) {
        return [
          { label: section.section },
          { label: item.title, href: item.path },
        ];
      }

      for (const child of item.children || []) {
        if (child.path === pathname) {
          return [
            { label: section.section },
            { label: item.title },
            { label: child.title, href: child.path },
          ];
        }
      }
    }
  }

  return [];
};

const FlowPageLayout = ({ title, subtitle, links = [], breadcrumbs = null, children }) => {
  const router = useRouter();
  const breadcrumbItems = breadcrumbs || findBreadcrumbs(router.pathname);

  return (
    <Box>
      {breadcrumbItems.length > 0 ? (
        <Breadcrumbs
          separator={<ChevronRightRoundedIcon fontSize="small" />}
          sx={{
            mb: 1.25,
            color: "text.secondary",
            "& .MuiBreadcrumbs-separator": { mx: 0.75 },
          }}
        >
          <MuiLink
            component={NextLink}
            href="/dashboards/analytics"
            underline="hover"
            color="text.secondary"
            sx={{ fontSize: 13, fontWeight: 800 }}
          >
            Inicio
          </MuiLink>
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;

            if (!isLast && item.href) {
              return (
                <MuiLink
                  key={`${item.label}-${item.href}`}
                  component={NextLink}
                  href={item.href}
                  underline="hover"
                  color="text.secondary"
                  sx={{ fontSize: 13, fontWeight: 800 }}
                >
                  {item.label}
                </MuiLink>
              );
            }

            return (
              <Typography
                key={`${item.label}-${index}`}
                color={isLast ? "text.primary" : "text.secondary"}
                sx={{ fontSize: 13, fontWeight: isLast ? 900 : 800 }}
              >
                {item.label}
              </Typography>
            );
          })}
        </Breadcrumbs>
      ) : null}
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
                component={NextLink}
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
