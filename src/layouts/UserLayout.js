import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Collapse,
  Container,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemIcon,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
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
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import { useRouter } from "next/router";
import authService from "services/auth/auth-service";
import productionService from "services/production/production-service";
import systemAnnouncementsService from "services/system/system-announcements-service";
import navigationItems from "configs/navigation";
import {
  bakerOnlyPaths,
  canAccessPath,
  hasPermission,
  isBakerOnlyUser,
  isPackagingOnlyUser,
  isSalesOnlyUser,
  packagingOnlyPaths,
  salesOnlyPaths,
} from "configs/access";

const drawerWidth = 280;
const mobileDrawerWidth = "84vw";

const getUserDisplayName = (user) => {
  return user?.full_name || user?.fullName || user?.name || user?.username || "Usuario";
};

const getUserInitials = (user) => {
  const displayName = getUserDisplayName(user);
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return displayName.slice(0, 2).toUpperCase();
};

const filterNavigationByUser = (items, user) => {
  const salesOnly = isSalesOnlyUser(user);
  const bakerOnly = isBakerOnlyUser(user);
  const packagingOnly = isPackagingOnlyUser(user);
  const focusedPaths = salesOnly
    ? salesOnlyPaths
    : packagingOnly
      ? packagingOnlyPaths
      : bakerOnly
        ? bakerOnlyPaths
        : null;

  return items
    .map((section) => {
      const filteredItems = section.items
        .map((item) => {
          if (item.salesOnly && !salesOnly) {
            return null;
          }

          if (item.children?.length) {
            const children = item.children.filter((child) => {
              if (child.salesOnly && !salesOnly) {
                return false;
              }

              if (focusedPaths && !focusedPaths.includes(child.path)) {
                return false;
              }

              return hasPermission(user, child.permission);
            });
            return children.length ? { ...item, children } : null;
          }

          if (focusedPaths && !focusedPaths.includes(item.path)) {
            return null;
          }

          return hasPermission(user, item.permission) ? item : null;
        })
        .filter(Boolean);

      return filteredItems.length ? { ...section, items: filteredItems } : null;
    })
    .filter(Boolean);
};


const flattenNavigationPaths = (items) => {
  const paths = [];

  items.forEach((section) => {
    section.items.forEach((item) => {
      if (item.children?.length) {
        item.children.forEach((child) => {
          if (child.path) {
            paths.push(child);
          }
        });
        return;
      }

      if (item.path) {
        paths.push(item);
      }
    });
  });

  return paths;
};

const protectedNavigationPaths = flattenNavigationPaths(navigationItems);

const iconMap = {
  dashboard: DashboardRoundedIcon,
  catalog: CategoryRoundedIcon,
  products: Inventory2RoundedIcon,
  materials: ScienceRoundedIcon,
  customers: GroupRoundedIcon,
  orders: ReceiptLongRoundedIcon,
  production: PrecisionManufacturingRoundedIcon,
  inventory: WarehouseRoundedIcon,
  users: PeopleRoundedIcon,
  tax: CategoryRoundedIcon,
  category: CategoryRoundedIcon,
  suppliers: GroupRoundedIcon,
  recipes: ScienceRoundedIcon,
};

const UserLayout = ({ children }) => {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [accountAnchor, setAccountAnchor] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [systemAnnouncement, setSystemAnnouncement] = useState(null);
  const [announcementOpen, setAnnouncementOpen] = useState(false);

  const loadSystemAnnouncement = useCallback(async () => {
    try {
      const response = await systemAnnouncementsService.getCurrent();
      const announcement = response?.data || null;
      setSystemAnnouncement(announcement);
      if (!announcement) {
        setAnnouncementOpen(false);
        return;
      }

      const dismissedId = window.sessionStorage.getItem("dismissedSystemAnnouncementId");
      setAnnouncementOpen(String(announcement.id) !== dismissedId);
    } catch (error) {
      // El interceptor global gestiona el bloqueo y redirige al inicio de sesion.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (isSalesOnlyUser(currentUser)) {
      setNotifications([]);
      return;
    }

    try {
      const response = await productionService.getNotifications();
      if (response?.code === 1) {
        setNotifications(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      setNotifications([]);
    }
  }, [currentUser]);

  const isPathSelected = (path) => router.pathname === path || router.pathname.startsWith(`${path}/`);
  const visibleNavigationItems = useMemo(
    () => filterNavigationByUser(navigationItems, currentUser),
    [currentUser]
  );

  const activeRoute = useMemo(
    () => protectedNavigationPaths.find((item) => router.pathname === item.path || router.pathname.startsWith(item.path + "/")),
    [router.pathname]
  );
  const routeAllowed = canAccessPath(currentUser, router.pathname)
    && (!activeRoute || hasPermission(currentUser, activeRoute.permission));

  const activeGroups = useMemo(() => {
    const groups = {};
    visibleNavigationItems.forEach((section) => {
      section.items.forEach((item) => {
        if (!item.children?.length) {
          return;
        }

        const key = `${section.section}-${item.title}`;
        groups[key] = item.children.some((child) => router.pathname === child.path || router.pathname.startsWith(`${child.path}/`));
      });
    });
    return groups;
  }, [router.pathname, visibleNavigationItems]);

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
    setCurrentUser(authService.getCurrentUser());
  }, []);

  useEffect(() => {
    loadNotifications();

    const refreshOnFocus = () => loadNotifications();
    const refreshInterval = window.setInterval(loadNotifications, 30000);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [currentUser?.id, currentUser?.user_id, loadNotifications]);

  useEffect(() => {
    loadSystemAnnouncement();
    const refreshOnFocus = () => loadSystemAnnouncement();
    const refreshInterval = window.setInterval(loadSystemAnnouncement, 30000);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadSystemAnnouncement]);

  useEffect(() => {
    if (!systemAnnouncement?.force_logout_at) return undefined;
    const delay = new Date(systemAnnouncement.force_logout_at).getTime() - Date.now() + 250;
    if (delay <= 0) return undefined;
    const timer = window.setTimeout(loadSystemAnnouncement, delay);
    return () => window.clearTimeout(timer);
  }, [systemAnnouncement?.force_logout_at, loadSystemAnnouncement]);

  const dismissSystemAnnouncement = () => {
    if (systemAnnouncement?.id) {
      window.sessionStorage.setItem("dismissedSystemAnnouncementId", String(systemAnnouncement.id));
    }
    setAnnouncementOpen(false);
  };

  const onLogout = async () => {
    setAccountAnchor(null);
    await authService.logout();
    router.replace("/login");
  };

  const accountOpen = Boolean(accountAnchor);
  const notificationOpen = Boolean(notificationAnchor);
  const unreadCount = notifications.filter((notification) => !notification.viewed_at).length;
  const salesOnly = isSalesOnlyUser(currentUser);

  const openNotification = async (notification) => {
    try {
      if (!notification.viewed_at) {
        await productionService.markNotificationViewed(notification.id);
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, viewed_at: new Date().toISOString() } : item
        )));
      }
    } finally {
      setNotificationAnchor(null);
      if (notification.reference_type === "order" && notification.reference_id) {
        router.push(`/orders/history?search=${encodeURIComponent(notification.reference_id)}`);
      } else {
        router.push(isBakerOnlyUser(currentUser) ? "/production/my-plan" : "/production/planning");
      }
    }
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


  const guardedChildren = routeAllowed ? children : (
    <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 4,
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>
          Acceso no permitido
        </Typography>
        <Typography color="text.secondary">
          Tu usuario no tiene permiso para abrir esta vista. Si necesitas entrar, solicita el permiso al administrador.
        </Typography>
      </Box>
    </Container>
  );

  const drawer = (
    <Box
      sx={{
        height: "100%",
        bgcolor: "#fbfafc",
        px: { xs: 1.5, sm: 2 },
        py: 2,
        overflowY: "auto",
        "&::-webkit-scrollbar": { width: 8 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: "rgba(17, 24, 39, 0.22)",
          borderRadius: 99,
        },
      }}
    >
      <Box sx={{ px: 1, mb: 2.25 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0, fontWeight: 800 }}>
          Navegacion
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
          Panaderia
        </Typography>
      </Box>
      {visibleNavigationItems.map((section) => (
        <Box key={section.section} sx={{ mb: 2.25 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", px: 1.25, mb: 0.75, textTransform: "uppercase", fontWeight: 800 }}
          >
            {section.section}
          </Typography>
          <List sx={{ py: 0 }}>
            {section.items.map((item) => {
              if (item.children?.length) {
                const groupKey = `${section.section}-${item.title}`;
                const groupOpen = Boolean(openGroups[groupKey]);
                const groupSelected = item.children.some((child) => isPathSelected(child.path));

                return (
                  <Box key={groupKey}>
                    <ListItemButton
                      selected={groupSelected}
                      onClick={onToggleGroup(groupKey)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        minHeight: 46,
                        px: 1.5,
                        color: groupSelected ? "primary.main" : "text.primary",
                        "&.Mui-selected": {
                          bgcolor: "rgba(219, 91, 39, 0.12)",
                        },
                        "&.Mui-selected:hover": {
                          bgcolor: "rgba(219, 91, 39, 0.16)",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{renderIcon(item.icon)}</ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{ fontSize: 14, lineHeight: 1.2, fontWeight: 800 }}
                      />
                      {groupOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </ListItemButton>
                    <Collapse in={groupOpen} timeout="auto" unmountOnExit>
                      <List disablePadding sx={{ pl: 1.25, mb: 0.75 }}>
                        {item.children.map((child) => {
                          const childSelected = isPathSelected(child.path);
                          const childTitle = salesOnly && child.path === "/orders/count" ? "Ventas" : child.title;

                          return (
                            <ListItemButton
                              key={child.path}
                              selected={childSelected}
                              onClick={onNavigate(child.path)}
                              sx={{
                                borderRadius: 2,
                                minHeight: 38,
                                pl: 1.5,
                                mb: 0.25,
                                borderLeft: "2px solid",
                                borderLeftColor: childSelected ? "primary.main" : "rgba(17, 24, 39, 0.12)",
                                color: childSelected ? "primary.main" : "text.secondary",
                                "&.Mui-selected": {
                                  bgcolor: "transparent",
                                },
                                "&.Mui-selected:hover": {
                                  bgcolor: "rgba(219, 91, 39, 0.08)",
                                },
                              }}
                            >
                              <ListItemText
                                primary={childTitle}
                                primaryTypographyProps={{ fontSize: 13, lineHeight: 1.2, fontWeight: childSelected ? 800 : 600 }}
                              />
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
                <ListItemButton
                  key={item.path}
                  selected={selected}
                  onClick={onNavigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    minHeight: 46,
                    px: 1.5,
                    color: selected ? "primary.main" : "text.primary",
                    "&.Mui-selected": {
                      bgcolor: "rgba(219, 91, 39, 0.12)",
                    },
                    "&.Mui-selected:hover": {
                      bgcolor: "rgba(219, 91, 39, 0.16)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{renderIcon(item.icon)}</ListItemIcon>
                  <ListItemText primary={item.title} primaryTypographyProps={{ fontSize: 14, lineHeight: 1.2, fontWeight: 800 }} />
                </ListItemButton>
              );
            })}
          </List>
          <Divider sx={{ mt: 1.5 }} />
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Dialog open={announcementOpen} onClose={dismissSystemAnnouncement} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Aviso importante del sistema</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: "pre-wrap", fontSize: 17, lineHeight: 1.65 }}>
            {systemAnnouncement?.message}
          </Typography>
          {systemAnnouncement?.force_logout_at && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "warning.light" }}>
              <Typography sx={{ fontWeight: 800 }}>
                El sistema se bloqueara y cerrara las sesiones el {new Date(systemAnnouncement.force_logout_at).toLocaleString("es-CO")}.
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Guarda el trabajo pendiente antes de esa hora.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {hasPermission(currentUser, "roles.manage") && (
            <Button onClick={() => router.push("/settings/system-announcements")}>Administrar aviso</Button>
          )}
          <Button variant="contained" color="secondary" onClick={dismissSystemAnnouncement}>Entendido</Button>
        </DialogActions>
      </Dialog>
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
          <Tooltip title="Notificaciones">
            <IconButton
              color="inherit"
              onClick={(event) => {
                setNotificationAnchor(event.currentTarget);
                loadNotifications();
              }}
              sx={{ mr: 0.5 }}
            >
              <Badge badgeContent={unreadCount} color="secondary">
                <NotificationsRoundedIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notificationAnchor}
            open={notificationOpen}
            onClose={() => setNotificationAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{ sx: { mt: 1, width: 360, maxWidth: "92vw", borderRadius: 2 } }}
          >
            <Box sx={{ px: 2, py: 1.25 }}>
              <Typography sx={{ fontWeight: 900 }}>Notificaciones</Typography>
              <Typography variant="caption" color="text.secondary">{unreadCount} sin ver</Typography>
            </Box>
            <Divider />
            {notifications.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography variant="body2" color="text.secondary">No tienes notificaciones nuevas.</Typography>
              </Box>
            ) : notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => openNotification(notification)}
                sx={{ alignItems: "flex-start", whiteSpace: "normal", py: 1.25, bgcolor: notification.viewed_at ? "transparent" : "action.hover" }}
              >
                <ListItemText
                  primary={notification.title}
                  secondary={notification.message}
                  primaryTypographyProps={{ fontWeight: notification.viewed_at ? 700 : 900 }}
                  secondaryTypographyProps={{ sx: { mt: 0.25 } }}
                />
              </MenuItem>
            ))}
          </Menu>
          <Tooltip title="Cuenta">
            <IconButton
              color="inherit"
              onClick={(event) => setAccountAnchor(event.currentTarget)}
              sx={{
                borderRadius: 2,
                p: 0.75,
                gap: 1,
                color: "inherit",
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {getUserInitials(currentUser)}
              </Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left", maxWidth: 220 }}>
                <Typography variant="body2" sx={{ color: "inherit", fontWeight: 800, lineHeight: 1.1 }} noWrap>
                  {getUserDisplayName(currentUser)}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.1 }} noWrap>
                  {currentUser?.email || currentUser?.username || "Sesion activa"}
                </Typography>
              </Box>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={accountAnchor}
            open={accountOpen}
            onClose={() => setAccountAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 300,
                borderRadius: 2,
                overflow: "hidden",
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 46,
                    height: 46,
                    bgcolor: "secondary.main",
                    color: "secondary.contrastText",
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  {getUserInitials(currentUser)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }} noWrap>
                    {getUserDisplayName(currentUser)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {currentUser?.email || currentUser?.username || "Sesion activa"}
                  </Typography>
                </Box>
              </Stack>
            </Box>
            <Divider />
            <MenuItem onClick={onLogout}>
              <ListItemIcon>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Cerrar sesion" />
            </MenuItem>
          </Menu>
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
          variant="temporary"
          open={desktopOpen}
          onClose={() => setDesktopOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "1px solid rgba(17, 24, 39, 0.08)",
              boxShadow: "12px 0 34px rgba(17, 24, 39, 0.16)",
            },
            "& .MuiBackdrop-root": {
              bgcolor: "rgba(17, 24, 39, 0.24)",
            },
          }}
        >
          <Toolbar />
          {drawer}
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, width: "100%", minWidth: 0 }}>
          <Toolbar />
          <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
            {guardedChildren}
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default UserLayout;
