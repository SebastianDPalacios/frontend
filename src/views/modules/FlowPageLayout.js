import NextLink from "next/link";
import { useRouter } from "next/router";
import { Box, Breadcrumbs, Button, Link as MuiLink, Stack, Typography } from "@mui/material";
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
  const isOrdersPage = router.pathname.startsWith("/orders/");

  return (
    <Box
      sx={isOrdersPage ? {
        "@media (max-width: 1024px)": {
          "& .MuiTypography-body1, & .MuiTypography-body2": {
            fontSize: "18px",
            lineHeight: 1.4,
          },
          "& .MuiInputBase-input, & .MuiSelect-select": {
            fontSize: "18px",
          },
          "& .MuiInputLabel-root, & .MuiFormHelperText-root": {
            fontSize: "16px",
          },
          "& .MuiButton-root": {
            fontSize: "17px",
            minHeight: 48,
          },
          "& .MuiChip-label": {
            fontSize: "16px",
          },
          "& .MuiTableCell-root": {
            fontSize: "16px",
          },
        },
      } : undefined}
    >
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
        <Box
          sx={{
            mb: 3,
            maxWidth: "100%",
            overflowX: "auto",
            pb: 0.5,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              width: "max-content",
              minWidth: { xs: "100%", sm: 0 },
              alignItems: "center",
            }}
          >
            {links.map((link) => (
              <Button
                key={link.href}
                component={NextLink}
                href={link.href}
                variant={link.active ? "contained" : "outlined"}
                size="small"
                color="secondary"
                fullWidth={false}
                sx={{
                  borderRadius: 999,
                  minHeight: { xs: 36, sm: 40 },
                  px: { xs: 1.75, sm: 2.5 },
                  whiteSpace: "nowrap",
                  bgcolor: link.active ? "secondary.main" : "background.paper",
                  color: link.active ? "secondary.contrastText" : "secondary.main",
                  borderColor: link.active ? "secondary.main" : "divider",
                  boxShadow: "none",
                  fontWeight: 800,
                  "&:hover": {
                    bgcolor: link.active ? "secondary.dark" : "action.hover",
                    borderColor: link.active ? "secondary.dark" : "secondary.main",
                    boxShadow: "none",
                  },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
        </Box>
      ) : null}
      {children}
    </Box>
  );
};

export default FlowPageLayout;
