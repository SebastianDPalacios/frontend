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
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import toast from "react-hot-toast";
import AppCard from "@core/components/ui/AppCard";
import usersService from "services/users/users-service";
import rbacService from "services/users/rbac-service";
import FlowPageLayout from "views/modules/FlowPageLayout";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
};

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const getStatusColor = (status) => {
  if (status === "active") return "success";
  if (status === "inactive") return "default";
  return "warning";
};

const normalizeRoleCodes = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : item?.code || item?.role_code))
      .filter(Boolean)
      .map(String);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      return normalizeRoleCodes(JSON.parse(trimmed));
    } catch (error) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (typeof value === "object") {
    return normalizeRoleCodes(value.roles || value.items || value.data);
  }

  return [];
};

const UsersListPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "", phone: "" });
  const [rolesForm, setRolesForm] = useState([]);
  const [resetPassword, setResetPassword] = useState("");
  const [dialog, setDialog] = useState(null);

  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/users/list", active: true },
      { label: "Nuevo", href: "/users/new" },
    ],
    []
  );

  const roleOptions = useMemo(() => roles.map((role) => role.code).filter(Boolean), [roles]);
  const roleLabelMap = useMemo(
    () =>
      roles.reduce((acc, role) => {
        acc[role.code] = role.name || role.code;
        return acc;
      }, {}),
    [roles]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await usersService.getUsers({ page: 1, pageSize: 50, search: search.trim() || undefined });
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar el listado de usuarios");
        return;
      }

      setItems(normalizeList(response.data));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar usuarios"));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await rbacService.getRoles();
        if (response?.code === 1) {
          setRoles(normalizeList(response.data));
        }
      } catch (requestError) {
        toast.error(getErrorMessage(requestError, "No se pudieron cargar los roles"));
      }
    };

    loadRoles();
  }, []);

  const openProfile = (user) => {
    setSelectedUser(user);
    setProfileForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
    });
    setDialog("profile");
  };

  const openRoles = async (user) => {
    setSaving(true);
    try {
      const response = await usersService.getUserById(user.id);
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo cargar el detalle del usuario");
        return;
      }

      setSelectedUser({ ...user, ...response.data });
      setRolesForm(normalizeRoleCodes(response.data?.roles));
      setDialog("roles");
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudo cargar el detalle del usuario"));
    } finally {
      setSaving(false);
    }
  };

  const openReset = (user) => {
    setSelectedUser(user);
    setResetPassword("");
    setDialog("reset");
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(null);
    setSelectedUser(null);
    setResetPassword("");
  };

  const updateRow = (id, values) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...values } : item)));
  };

  const handleStatusChange = async (user, checked) => {
    const nextStatus = checked ? "active" : "inactive";
    const previousStatus = user.status;
    updateRow(user.id, { status: nextStatus });

    try {
      const response = await usersService.setUserStatus(user.id, nextStatus);
      if (response?.code !== 1) {
        updateRow(user.id, { status: previousStatus });
        toast.error(response?.message || "No se pudo cambiar el estado");
        return;
      }

      toast.success(response?.message || "Estado actualizado");
    } catch (requestError) {
      updateRow(user.id, { status: previousStatus });
      toast.error(getErrorMessage(requestError, "No se pudo cambiar el estado"));
    }
  };

  const saveProfile = async () => {
    if (!selectedUser) return;
    setSaving(true);

    try {
      const response = await usersService.updateUserProfile(selectedUser.id, {
        p_full_name: profileForm.full_name.trim(),
        p_email: profileForm.email.trim(),
        p_phone: profileForm.phone.trim() || null,
        p_status: selectedUser.status || "active",
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo actualizar el usuario");
        return;
      }

      updateRow(selectedUser.id, {
        full_name: profileForm.full_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim() || null,
      });
      toast.success(response?.message || "Usuario actualizado");
      closeDialog();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudo actualizar el usuario"));
    } finally {
      setSaving(false);
    }
  };

  const saveRoles = async () => {
    if (!selectedUser) return;
    setSaving(true);

    try {
      const response = await usersService.assignUserRoles(selectedUser.id, rolesForm);
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudieron actualizar los roles");
        return;
      }

      toast.success(response?.message || "Roles actualizados");
      closeDialog();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudieron actualizar los roles"));
    } finally {
      setSaving(false);
    }
  };

  const runSimpleAction = async (user, action, successMessage, errorMessage) => {
    setSaving(true);
    try {
      const response = await action(user.id);
      if (response?.code !== 1) {
        toast.error(response?.message || errorMessage);
        return;
      }

      toast.success(response?.message || successMessage);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, errorMessage));
    } finally {
      setSaving(false);
    }
  };

  const saveResetPassword = async () => {
    if (!selectedUser || !resetPassword) return;
    setSaving(true);

    try {
      const response = await usersService.resetPassword(selectedUser.id, {
        p_target_username: selectedUser.username,
        p_target_email: selectedUser.email,
        p_new_password_hash: resetPassword,
        p_new_password_algo: "bcrypt",
        p_force_change_next_login: 1,
        p_revoke_all_sessions: 1,
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo resetear la contrasena");
        return;
      }

      toast.success(response?.message || "Contrasena reseteada");
      closeDialog();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudo resetear la contrasena"));
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (roleCode) => {
    setRolesForm((current) =>
      current.includes(roleCode) ? current.filter((item) => item !== roleCode) : [...current, roleCode]
    );
  };

  return (
    <FlowPageLayout title="Usuarios - Listado" subtitle="Gestion de usuarios" links={flowLinks}>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Buscar usuario"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nombre, usuario o correo"
          fullWidth
        />
        <Button variant="contained" color="secondary" onClick={loadUsers} disabled={loading}>
          Buscar
        </Button>
      </Stack>

      <AppCard>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Usuarios
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estado, perfil y acciones de seguridad
            </Typography>
          </Box>
          <Chip label={`${items.length} registros`} />
        </Stack>

        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Correo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Cambio clave</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{user.full_name || user.username || "Usuario"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.username}
                    </Typography>
                  </TableCell>
                  <TableCell>{user.email || "N/A"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Switch
                        checked={user.status === "active"}
                        onChange={(event) => handleStatusChange(user, event.target.checked)}
                        disabled={saving}
                      />
                      <Chip label={user.status || "N/A"} color={getStatusColor(user.status)} size="small" />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={Number(user.must_change_password) === 1 ? "Pendiente" : "Normal"}
                      color={Number(user.must_change_password) === 1 ? "warning" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                      <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => openProfile(user)}>
                        Perfil
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ManageAccountsRoundedIcon />}
                        onClick={() => openRoles(user)}
                        disabled={saving}
                      >
                        Roles
                      </Button>
                      <Tooltip title="Marcar cambio obligatorio de contrasena">
                        <IconButton
                          onClick={() =>
                            runSimpleAction(
                              user,
                              usersService.forcePasswordReset.bind(usersService),
                              "Cambio de contrasena marcado",
                              "No se pudo forzar el cambio"
                            )
                          }
                          disabled={saving}
                        >
                          <LockResetRoundedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Resetear contrasena">
                        <IconButton onClick={() => openReset(user)}>
                          <KeyRoundedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cerrar sesiones">
                        <IconButton
                          onClick={() =>
                            runSimpleAction(
                              user,
                              usersService.logoutAllSessions.bind(usersService),
                              "Sesiones cerradas",
                              "No se pudieron cerrar las sesiones"
                            )
                          }
                          disabled={saving}
                        >
                          <LogoutRoundedIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {!loading && items.length === 0 ? (
          <Alert severity="info" sx={{ mt: 3 }}>
            No hay usuarios para mostrar.
          </Alert>
        ) : null}
      </AppCard>

      <Dialog open={dialog === "profile"} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre completo"
              value={profileForm.full_name}
              onChange={(event) => setProfileForm((current) => ({ ...current, full_name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Correo"
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Telefono"
              value={profileForm.phone}
              onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" color="secondary" startIcon={<SaveRoundedIcon />} onClick={saveProfile} disabled={saving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === "roles"} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Asignar roles</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedUser?.full_name || selectedUser?.username || "Usuario"}
          </Typography>
          <Stack spacing={1}>
            {roleOptions.map((roleCode) => (
              <FormControlLabel
                key={roleCode}
                control={<Checkbox checked={rolesForm.includes(roleCode)} onChange={() => toggleRole(roleCode)} />}
                label={roleLabelMap[roleCode] || roleCode}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" color="secondary" onClick={saveRoles} disabled={saving}>
            Guardar roles
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === "reset"} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Resetear contrasena</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              Se revocaran las sesiones y el usuario debera cambiar la contrasena al iniciar.
            </Alert>
            <TextField
              label="Nueva contrasena"
              type="password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              fullWidth
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
            onClick={saveResetPassword}
            disabled={saving || resetPassword.length < 10}
          >
            Resetear
          </Button>
        </DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default UsersListPage;
