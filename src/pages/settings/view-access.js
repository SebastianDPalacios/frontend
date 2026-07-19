import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import toast from "react-hot-toast";
import AppCard from "@core/components/ui/AppCard";
import FlowPageLayout from "views/modules/FlowPageLayout";
import navigationItems from "configs/navigation";
import rbacService from "services/users/rbac-service";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const normalizePermissions = (permissions) => {
  if (Array.isArray(permissions)) return permissions.filter(Boolean);

  if (typeof permissions === "string") {
    try {
      const parsed = JSON.parse(permissions);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }

  return [];
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const friendlyPermissionNames = {
  "users.manage": "Usuarios",
  "roles.manage": "Roles y permisos",
  "employees.manage": "Empleados",
  "products.manage": "Productos",
  "materials.manage": "Materias primas",
  "customers.manage": "Clientes",
  "recipes.manage": "Recetas",
  "orders.manage": "Pedidos y ventas",
  "production.manage": "Produccion general",
  "production.baker": "Produccion panadero",
  "production.packaging": "Conteo y empaque",
  "inventory.manage": "Inventario",
  "reports.view": "Reportes",
};

const formatPermissionName = (permissionCode, permissionMap = {}) => {
  const permission = permissionMap[permissionCode];
  const name = friendlyPermissionNames[permissionCode] || permission?.name;

  if (name) return name;

  return String(permissionCode || "")
    .replace(/\./g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const buildViewMap = () => {
  const viewMap = {};

  navigationItems.forEach((section) => {
    (section.items || []).forEach((item) => {
      const itemViews = item.children?.length ? item.children : [item];

      itemViews.forEach((view) => {
        if (!view.permission || !view.path) return;

        if (!viewMap[view.permission]) {
          viewMap[view.permission] = [];
        }

        viewMap[view.permission].push({
          label: `${section.section} / ${item.title}${item.children?.length ? ` / ${view.title}` : ""}`,
          path: view.path,
        });
      });
    });
  });

  return viewMap;
};

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const ViewAccessPage = () => {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [targetType, setTargetType] = useState("role");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userMode, setUserMode] = useState("inherit");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const permissionMap = useMemo(
    () =>
      permissions.reduce((acc, permission) => {
        acc[permission.code] = permission;
        return acc;
      }, {}),
    [permissions]
  );

  const viewMap = useMemo(() => buildViewMap(), []);

  const roleTarget = useMemo(
    () => roles.find((role) => String(role.id) === String(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );

  const userTarget = useMemo(
    () => users.find((user) => String(user.id) === String(selectedUserId)) || null,
    [users, selectedUserId]
  );

  const editable = targetType === "role" || userMode === "custom";

  const filteredPermissions = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return permissions.filter((permission) => {
      const views = viewMap[permission.code] || [];
      const haystack = [
        permission.code,
        formatPermissionName(permission.code, permissionMap),
        permission.description,
        ...views.map((view) => `${view.label} ${view.path}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !needle || haystack.includes(needle);
    });
  }, [permissions, permissionMap, search, viewMap]);

  const selectedCount = selectedPermissions.length;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [rolesResponse, permissionsResponse, usersResponse] = await Promise.all([
        rbacService.getRoles(),
        rbacService.getPermissions(),
        rbacService.getViewAccessUsers(),
      ]);

      if (rolesResponse?.code !== 1) {
        setError(rolesResponse?.message || "No se pudieron cargar los roles");
        return;
      }

      if (permissionsResponse?.code !== 1) {
        setError(permissionsResponse?.message || "No se pudieron cargar los permisos");
        return;
      }

      if (usersResponse?.code !== 1) {
        setError(usersResponse?.message || "No se pudieron cargar los usuarios");
        return;
      }

      const loadedRoles = normalizeList(rolesResponse.data).map((role) => ({
        ...role,
        permissions: normalizePermissions(role.permissions),
      }));
      const loadedUsers = normalizeList(usersResponse.data).map((user) => ({
        ...user,
        roles: normalizePermissions(user.roles),
        permissions: normalizePermissions(user.permissions),
        inherited_permissions: normalizePermissions(user.inherited_permissions),
        effective_permissions: normalizePermissions(user.effective_permissions),
      }));

      setRoles(loadedRoles);
      setUsers(loadedUsers);
      setPermissions(normalizeList(permissionsResponse.data));
      setSelectedRoleId((current) => current || String(loadedRoles[0]?.id || ""));
      setSelectedUserId((current) => current || String(loadedUsers[0]?.id || ""));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar la configuracion de accesos"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (targetType !== "role") return;
    setSelectedPermissions(normalizePermissions(roleTarget?.permissions));
  }, [roleTarget, targetType]);

  useEffect(() => {
    if (targetType !== "user") return;

    const mode = userTarget?.permission_mode === "custom" ? "custom" : "inherit";
    setUserMode(mode);
    setSelectedPermissions(
      mode === "custom"
        ? normalizePermissions(userTarget?.permissions)
        : normalizePermissions(userTarget?.inherited_permissions)
    );
  }, [targetType, userTarget]);

  const togglePermission = (permissionCode) => {
    if (!editable) return;

    setSelectedPermissions((current) =>
      current.includes(permissionCode)
        ? current.filter((permission) => permission !== permissionCode)
        : unique([...current, permissionCode])
    );
  };

  const handleUserModeChange = (checked) => {
    const nextMode = checked ? "custom" : "inherit";
    setUserMode(nextMode);
    setSelectedPermissions(
      nextMode === "custom"
        ? normalizePermissions(userTarget?.effective_permissions)
        : normalizePermissions(userTarget?.inherited_permissions)
    );
  };

  const saveAccess = async () => {
    setSaving(true);

    try {
      const response =
        targetType === "role"
          ? await rbacService.setRolePermissions(selectedRoleId, selectedPermissions)
          : await rbacService.setUserPermissions(selectedUserId, userMode, selectedPermissions);

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudieron guardar los accesos");
        return;
      }

      toast.success(response?.message || "Accesos guardados");
      await loadData();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Error al guardar los accesos"));
    } finally {
      setSaving(false);
    }
  };

  const targetLabel = targetType === "role"
    ? roleTarget?.name || roleTarget?.code || "Rol"
    : userTarget?.full_name || userTarget?.username || "Usuario";

  return (
    <FlowPageLayout
      title="Acceso a vistas"
      subtitle="Define que puede ver cada rol o configura excepciones por usuario."
      breadcrumbs={[
        { label: "Catalogos" },
        { label: "Configuracion" },
        { label: "Acceso a vistas", href: "/settings/view-access" },
      ]}
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <AppCard sx={{ mb: 3 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ xs: "stretch", lg: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>Selector de acceso</Typography>
            <Typography variant="body2" color="text.secondary">
              Usa rol para cambiar accesos generales o usuario para una excepcion puntual.
            </Typography>
          </Box>
          <TextField
            select
            SelectProps={{ native: true }}
            label="Asignar por"
            value={targetType}
            onChange={(event) => setTargetType(event.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 220 } }}
          >
            <option value="role">Rol</option>
            <option value="user">Usuario</option>
          </TextField>
          {targetType === "role" ? (
            <TextField
              select
              SelectProps={{ native: true }}
              label="Rol"
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 300 } }}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name || role.code}</option>
              ))}
            </TextField>
          ) : (
            <TextField
              select
              SelectProps={{ native: true }}
              label="Usuario"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 340 } }}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.username} - {user.email || "sin correo"}
                </option>
              ))}
            </TextField>
          )}
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SaveRoundedIcon />}
            disabled={loading || saving || !selectedPermissions || (targetType === "role" && !selectedRoleId) || (targetType === "user" && !selectedUserId)}
            onClick={saveAccess}
            sx={{ minHeight: 48, px: 3 }}
          >
            Guardar
          </Button>
        </Stack>
      </AppCard>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <AppCard sx={{ height: "100%" }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">Resumen</Typography>
                <Typography variant="body2" color="text.secondary">
                  Editando: {targetLabel}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${selectedCount} permiso(s)`} color="secondary" variant="outlined" />
                {targetType === "user" ? (
                  <Chip label={userMode === "custom" ? "Personalizado" : "Hereda del rol"} color={userMode === "custom" ? "warning" : "success"} variant="outlined" />
                ) : null}
              </Stack>
              {targetType === "user" ? (
                <Box sx={{ border: 1, borderColor: "divider", borderRadius: 3, p: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={userMode === "custom"}
                        onChange={(event) => handleUserModeChange(event.target.checked)}
                      />
                    }
                    label="Usar permisos personalizados para este usuario"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Si esta apagado, el usuario ve lo que indiquen sus roles. Al activarlo, esta lista reemplaza los permisos heredados.
                  </Typography>
                </Box>
              ) : null}
              <TextField
                label="Buscar vista o permiso"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                fullWidth
              />
              {targetType === "user" && userTarget?.roles?.length ? (
                <Box>
                  <Typography variant="caption" color="text.secondary">Roles actuales</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {userTarget.roles.map((role) => <Chip key={role} label={role} size="small" />)}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          </AppCard>
        </Grid>

        <Grid item xs={12} lg={8}>
          <AppCard>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6">Vistas disponibles</Typography>
                <Typography variant="body2" color="text.secondary">
                  Marca lo que debe aparecer en el menu y quedar permitido por URL directa.
                </Typography>
              </Box>
              {!editable ? <Chip label="Solo lectura por herencia" color="success" variant="outlined" /> : null}
            </Stack>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress color="secondary" />
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {filteredPermissions.map((permission) => {
                  const views = viewMap[permission.code] || [];
                  const checked = selectedPermissions.includes(permission.code);

                  return (
                    <Box
                      key={permission.code}
                      sx={{
                        border: 1,
                        borderColor: checked ? "secondary.main" : "divider",
                        bgcolor: checked ? "rgba(229, 94, 35, 0.06)" : "background.paper",
                        borderRadius: 3,
                        p: { xs: 1.5, sm: 2 },
                      }}
                    >
                      <FormControlLabel
                        sx={{ alignItems: "flex-start", m: 0, width: "100%" }}
                        control={
                          <Checkbox
                            checked={checked}
                            disabled={!editable}
                            onChange={() => togglePermission(permission.code)}
                            color="secondary"
                            sx={{ pt: 0.25 }}
                          />
                        }
                        label={
                          <Box>
                            <Typography sx={{ fontWeight: 900 }}>
                              {formatPermissionName(permission.code, permissionMap)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                              {permission.code}
                            </Typography>
                            {views.length > 0 ? (
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {views.map((view) => (
                                  <Chip key={`${permission.code}-${view.path}`} label={view.label} size="small" variant="outlined" />
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Permiso operativo sin vista directa en el menu.
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </Box>
                  );
                })}

                {filteredPermissions.length === 0 ? (
                  <Alert severity="info">No hay vistas o permisos que coincidan con la busqueda.</Alert>
                ) : null}
              </Stack>
            )}
          </AppCard>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default ViewAccessPage;

