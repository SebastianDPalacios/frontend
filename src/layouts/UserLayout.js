import { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Chip,
  Box,
  Collapse,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemIcon,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import { useRouter } from "next/router";
import authService from "services/auth/auth-service";
import ordersService from "services/orders/orders-service";
import productionService from "services/production/production-service";
import inventoryService from "services/inventory/inventory-service";
import usersService from "services/users/users-service";
import AppButton from "@core/components/ui/AppButton";
import navigationItems from "configs/navigation";
import { getTotal } from "views/modules/flow-utils";

const drawerWidth = 280;
const mobileDrawerWidth = "84vw";

const iconMap = {
  dashboard: DashboardRoundedIcon,
  catalog: CategoryRoundedIcon,
  products: Inventory2RoundedIcon,
  materials: ScienceRoundedIcon,
  customers: GroupRoundedIcon,
  routes: LocalShippingRoundedIcon,
  orders: ReceiptLongRoundedIcon,
  production: PrecisionManufacturingRoundedIcon,
  inventory: WarehouseRoundedIcon,
  users: PeopleRoundedIcon,
};

const UserLayout = ({ children }) => {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState({});
  const [menuBadges, setMenuBadges] = useState({ groups: {}, paths: {} });

  const isPathSelected = (path) => router.pathname === path || router.pathname.startsWith(`${path}/`);

  const activeGroups = useMemo(() => {
    const groups = {};
    navigationItems.forEach((section) => {
      section.items.forEach((item) => {
        if (!item.children?.length) {
          return;
        }

        const key = `${section.section}-${item.title}`;
        groups[key] = item.children.some((child) => router.pathname === child.path || router.pathname.startsWith(`${child.path}/`));
      });
    });
    return groups;
  }, [router.pathname]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      Object.entries(activeGroups).forEach(([key, value]) => {
        if (value) {
          next[key] = true;
        }
      });
      return next;
    });
  }, [activeGroups]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const [ordersResult, productionResult, inventoryResult, usersResult] = await Promise.allSettled([
        ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 1 }),
        productionService.getBaseData({ onlyActive: 1, page: 1, pageSize: 1 }),
        inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 1 }),
        usersService.getUsers({ page: 1, pageSize: 1 }),
      ]);

      if (!mounted) {
        return;
      }

      const ordersData = ordersResult.status === "fulfilled" && ordersResult.value?.code === 1 ? ordersResult.value.data : null;
      const productionData = productionResult.status === "fulfilled" && productionResult.value?.code === 1 ? productionResult.value.data : null;
      const inventoryData = inventoryResult.status === "fulfilled" && inventoryResult.value?.code === 1 ? inventoryResult.value.data : null;
      const usersData = usersResult.status === "fulfilled" && usersResult.value?.code === 1 ? usersResult.value.data : null;

      const ordersPending = getTotal(ordersData?.customers);
      const productionCount = getTotal(productionData?.products);
      const inventoryCount = getTotal(inventoryData?.products) + getTotal(inventoryData?.raw_materials);
      const usersCount = Number(usersData?.total || 0);

      setMenuBadges({
        groups: {
          "Operacion-Pedidos": ordersPending,
          "Operacion-Produccion": productionCount,
          "Operacion-Inventario": inventoryCount,
          "Operacion-Usuarios": usersCount,
        },
        paths: {
          "/orders/day": ordersPending,
        },
      });
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  const onLogout = async () => {
    await authService.logout();
    router.replace("/login");
  };

  const onNavigate = (path) => () => {
    setMobileOpen(false);
    router.push(path);
  };

  const onToggleDesktopMenu = () => {
    setDesktopOpen((prev) => !prev);
  };

  const onToggleGroup = (key) => () => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderIcon = (iconKey, size = "small") => {
    const IconComponent = iconMap[iconKey];
    if (!IconComponent) {
      return <CircleRoundedIcon fontSize={size} sx={{ fontSize: 10 }} />;
    }

    return <IconComponent fontSize={size} />;
  };

  const formatBadgeValue = (value) => {
    if (!value || value < 1) {
      return null;
    }

    return value > 99 ? "99+" : String(value);
  };

  const drawer = (
    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Panaderia
      </Typography>
      {navigationItems.map((section) => (
        <Box key={section.section} sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, textTransform: "uppercase" }}>
            {section.section}
          </Typography>
          <List sx={{ py: 0.5 }}>
            {section.items.map((item) => {
              if (item.children?.length) {
                const groupKey = `${section.section}-${item.title}`;
                const groupOpen = Boolean(openGroups[groupKey]);
                const groupSelected = item.children.some((child) => isPathSelected(child.path));
                const groupBadge = formatBadgeValue(menuBadges.groups[groupKey]);

                return (
                  <Box key={groupKey}>
                    <ListItemButton
                      selected={groupSelected}
                      onClick={onToggleGroup(groupKey)}
                      sx={{ borderRadius: 1, mb: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>{renderIcon(item.icon)}</ListItemIcon>
                      <ListItemText primary={item.title} primaryTypographyProps={{ fontSize: 14, lineHeight: 1.2, fontWeight: 600 }} />
                      {groupBadge ? <Chip size="small" color="secondary" label={groupBadge} sx={{ mr: 0.75, height: 20 }} /> : null}
                      {groupOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </ListItemButton>
                    <Collapse in={groupOpen} timeout="auto" unmountOnExit>
                      <List disablePadding>
                        {item.children.map((child) => {
                          const childSelected = isPathSelected(child.path);
                          const childBadge = formatBadgeValue(menuBadges.paths[child.path]);

                          return (
                            <ListItemButton
                              key={child.path}
                              selected={childSelected}
                              onClick={onNavigate(child.path)}
                              sx={{ borderRadius: 1, ml: 1.5, pl: 1.5, mb: 0.25 }}
                            >
                              <ListItemIcon sx={{ minWidth: 24, color: "inherit" }}>{renderIcon(child.icon, "small")}</ListItemIcon>
                              <ListItemText primary={child.title} primaryTypographyProps={{ fontSize: 13, lineHeight: 1.2 }} />
                              {childBadge ? <Chip size="small" color="secondary" label={childBadge} sx={{ height: 18 }} /> : null}
                            </ListItemButton>
                          );
                        })}
                      </List>
                    </Collapse>
                  </Box>
                );
              }

              const selected = isPathSelected(item.path);

              return (
                <ListItemButton key={item.path} selected={selected} onClick={onNavigate(item.path)} sx={{ borderRadius: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>{renderIcon(item.icon)}</ListItemIcon>
                  <ListItemText primary={item.title} primaryTypographyProps={{ fontSize: 14, lineHeight: 1.2 }} />
                </ListItemButton>
              );
            })}
          </List>
          <Divider />
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="fixed" elevation={0} color="primary" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen((prev) => !prev)} sx={{ mr: 2, display: { md: "none" } }}>
            <MenuRoundedIcon />
          </IconButton>
          <IconButton color="inherit" edge="start" onClick={onToggleDesktopMenu} sx={{ mr: 2, display: { xs: "none", md: "inline-flex" } }}>
            {desktopOpen ? <MenuOpenRoundedIcon /> : <MenuRoundedIcon />}
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: { xs: 18, sm: 20 } }}>
            Panaderia
          </Typography>
          <AppButton color="secondary" onClick={onLogout} size="small" sx={{ px: { xs: 1.5, sm: 2.5 } }}>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              Cerrar sesion
            </Box>
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
              Salir
            </Box>
          </AppButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: "flex" }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: mobileDrawerWidth, maxWidth: drawerWidth },
          }}
        >
          <Toolbar />
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: desktopOpen ? "block" : "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          <Toolbar />
          {drawer}
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, width: { md: desktopOpen ? `calc(100% - ${drawerWidth}px)` : "100%" }, minWidth: 0 }}>
          <Toolbar />
          <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default UserLayout;
