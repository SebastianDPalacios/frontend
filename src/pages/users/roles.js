import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import rbacService from "services/users/rbac-service";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const normalizePermissions = (permissions) => {
  if (Array.isArray(permissions)) {
    return permissions.filter(Boolean);
  }

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

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const friendlyPermissionNames = {
  "users.manage": "Usuarios",
  "roles.manage": "Roles y permisos",
  "products.manage": "Productos",
  "materials.manage": "Materias primas",
  "customers.manage": "Clientes",
  "routes.manage": "Rutas",
  "recipes.manage": "Recetas",
  "orders.manage": "Pedidos",
  "production.manage": "Produccion",
  "inventory.manage": "Inventario",
  "reports.view": "Reportes",
};

const formatPermissionName = (permissionCode, permissionMap = {}) => {
  const permission = permissionMap[permissionCode];
  const name = friendlyPermissionNames[permissionCode] || permission?.name;

  if (name) {
    return name;
  }

  if (/^perm\.(read|write)\./i.test(permissionCode)) {
    return permissionCode.includes(".read.") ? "Lectura interna" : "Escritura interna";
  }

  return String(permissionCode || "")
    .replace(/\./g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const emptyRole = {
  p_code: "",
  p_name: "",
  p_description: "",
  p_is_system_role: 0,
};

const emptyPermission = {
  p_code: "",
  p_name: "",
  p_description: "",
};

const UsersRolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [permissionForm, setPermissionForm] = useState(emptyPermission);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [dialog, setDialog] = useState(null);
  const permissionMap = useMemo(
    () =>
      permissions.reduce((acc, permission) => {
        acc[permission.code] = permission;
        return acc;
      }, {}),
    [permissions]
  );

  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/users/list" },
      { label: "Nuevo", href: "/users/new" },
      { label: "Roles", href: "/users/roles", active: true },
    ],
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        rbacService.getRoles(),
        rbacService.getPermissions(),
      ]);

      if (rolesResponse?.code !== 1) {
        setError(rolesResponse?.message || "No se pudieron cargar los roles");
        return;
      }

      if (permissionsResponse?.code !== 1) {
        setError(permissionsResponse?.message || "No se pudieron cargar los permisos");
        return;
      }

      setRoles(
        normalizeList(rolesResponse.data).map((role) => ({
          ...role,
          permissions: normalizePermissions(role.permissions),
        }))
      );
      setPermissions(normalizeList(permissionsResponse.data));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar roles y permisos"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openRoleDialog = (role = null) => {
    setSelectedRole(role);
    setRoleForm(
      role
        ? {
            p_code: role.code || "",
            p_name: role.name || "",
            p_description: role.description || "",
            p_is_system_role: Number(role.is_system_role || 0),
          }
        : emptyRole
    );
    setDialog("role");
  };

  const openPermissionsDialog = (role) => {
    setSelectedRole(role);
    setSelectedPermissions(normalizePermissions(role.permissions));
    setDialog("permissions");
  };

  const openPermissionDialog = () => {
    setPermissionForm(emptyPermission);
    setDialog("permission");
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(null);
    setSelectedRole(null);
    setSelectedPermissions([]);
  };

  const saveRole = async () => {
    setSaving(true);

    try {
      const payload = {
        p_code: roleForm.p_code.trim().toUpperCase(),
        p_name: roleForm.p_name.trim(),
        p_description: roleForm.p_description.trim() || null,
        p_is_system_role: roleForm.p_is_system_role,
      };

      const response = selectedRole
        ? await rbacService.updateRole(selectedRole.id, payload)
        : await rbacService.createRole(payload);

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo guardar el rol");
        return;
      }

      toast.success(response?.message || "Rol guardado");
      closeDialog();
      loadData();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudo guardar el rol"));
    } finally {
      setSaving(false);
    }
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);

    try {
      const response = await rbacService.setRolePermissions(selectedRole.id, selectedPermissions);
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudieron actualizar los permisos");
        return;
      }

      toast.success(response?.message || "Permisos actualizados");
      closeDialog();
      loadData();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudieron actualizar los permisos"));
    } finally {
      setSaving(false);
    }
  };

  const savePermission = async () => {
    setSaving(true);

    try {
      const response = await rbacService.createPermission({
        p_code: permissionForm.p_code.trim(),
        p_name: permissionForm.p_name.trim(),
        p_description: permissionForm.p_description.trim() || null,
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo crear el permiso");
        return;
      }

      toast.success(response?.message || "Permiso creado");
      closeDialog();
      loadData();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudo crear el permiso"));
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permissionCode) => {
    setSelectedPermissions((current) =>
      current.includes(permissionCode)
        ? current.filter((code) => code !== permissionCode)
        : [...current, permissionCode]
    );
  };

  return (
    <FlowPageLayout title="Roles y permisos" subtitle="Administracion IAM" links={flowLinks}>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" color="secondary" onClick={() => openRoleDialog()}>
          Crear rol
        </Button>
        <Button variant="outlined" color="secondary" onClick={openPermissionDialog}>
          Crear permiso
        </Button>
        <Button variant="text" onClick={loadData} disabled={loading}>
          Actualizar
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {roles.map((role) => (
          <Grid item xs={12} md={6} xl={4} key={role.id}>
            <AppCard>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {role.name || role.code}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {role.code}
                    </Typography>
                  </Box>
                  {Number(role.is_system_role) === 1 ? <Chip label="Sistema" size="small" color="info" /> : null}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {role.description || "Sin descripcion"}
                </Typography>

                <Divider />

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {role.permissions.length > 0 ? (
                    role.permissions.map((permission) => (
                      <Chip key={permission} label={formatPermissionName(permission, permissionMap)} size="small" />
                    ))
                  ) : (
                    <Chip label="Sin permisos" size="small" color="warning" />
                  )}
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => openRoleDialog(role)}>
                    Editar
                  </Button>
                  <Button size="small" variant="contained" color="secondary" onClick={() => openPermissionsDialog(role)}>
                    Permisos
                  </Button>
                </Stack>
              </Stack>
            </AppCard>
          </Grid>
        ))}
      </Grid>

      {!loading && roles.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No hay roles para mostrar.
        </Alert>
      ) : null}

      <Dialog open={dialog === "role"} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{selectedRole ? "Editar rol" : "Crear rol"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Codigo"
              value={roleForm.p_code}
              onChange={(event) => setRoleForm((current) => ({ ...current, p_code: event.target.value }))}
              disabled={Boolean(selectedRole)}
              fullWidth
            />
            <TextField
              label="Nombre"
              value={roleForm.p_name}
              onChange={(event) => setRoleForm((current) => ({ ...current, p_name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Descripcion"
              value={roleForm.p_description}
              onChange={(event) => setRoleForm((current) => ({ ...current, p_description: event.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SaveRoundedIcon />}
            onClick={saveRole}
            disabled={saving || !roleForm.p_name.trim() || (!selectedRole && !roleForm.p_code.trim())}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === "permissions"} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>Permisos de {selectedRole?.name || selectedRole?.code}</DialogTitle>
        <DialogContent>
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {permissions.map((permission) => (
              <Grid item xs={12} sm={6} key={permission.code}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedPermissions.includes(permission.code)}
                      onChange={() => togglePermission(permission.code)}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{formatPermissionName(permission.code, permissionMap)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {permission.description || permission.code}
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" color="secondary" onClick={saveRolePermissions} disabled={saving}>
            Guardar permisos
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === "permission"} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Crear permiso</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Codigo"
              value={permissionForm.p_code}
              onChange={(event) => setPermissionForm((current) => ({ ...current, p_code: event.target.value }))}
              placeholder="modulo.accion"
              fullWidth
            />
            <TextField
              label="Nombre"
              value={permissionForm.p_name}
              onChange={(event) => setPermissionForm((current) => ({ ...current, p_name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Descripcion"
              value={permissionForm.p_description}
              onChange={(event) => setPermissionForm((current) => ({ ...current, p_description: event.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={savePermission}
            disabled={saving || !permissionForm.p_code.trim() || !permissionForm.p_name.trim()}
          >
            Crear permiso
          </Button>
        </DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default UsersRolesPage;
