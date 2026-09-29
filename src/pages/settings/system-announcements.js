import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Chip, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import LockClockRoundedIcon from "@mui/icons-material/LockClockRounded";
import toast from "react-hot-toast";
import systemAnnouncementsService from "services/system/system-announcements-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker, BalanceTimePicker } from "@core/components/ui/BalancePeriodPickers";

const toLocalInput = (date) => {
  const value = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return value.toISOString().slice(0, 16);
};

const datePart = (value) => String(value || "").slice(0, 10);
const timePart = (value) => String(value || "").slice(11, 16);
const replaceDatePart = (value, date) => `${date}T${timePart(value) || "00:00"}`;
const replaceTimePart = (value, time) => `${datePart(value)}T${time}`;

const SystemAnnouncementsPage = () => {
  const [message, setMessage] = useState("");
  const [displayFrom, setDisplayFrom] = useState(() => toLocalInput(new Date()));
  const [forceLogoutAt, setForceLogoutAt] = useState(() => toLocalInput(new Date(Date.now() + 30 * 60000)));
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await systemAnnouncementsService.list();
      setAnnouncements(Array.isArray(response?.data) ? response.data : []);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "No fue posible consultar los avisos.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createAnnouncement = async () => {
    const displayDate = new Date(displayFrom);
    const logoutDate = new Date(forceLogoutAt);
    if (!message.trim()) {
      toast.error("Escribe el mensaje que verán los usuarios");
      return;
    }
    if (Number.isNaN(displayDate.getTime()) || Number.isNaN(logoutDate.getTime())) {
      toast.error("Selecciona fechas y horas válidas");
      return;
    }
    if (logoutDate <= displayDate) {
      toast.error("El bloqueo debe programarse después de mostrar el aviso");
      return;
    }
    setLoading(true);
    try {
      await systemAnnouncementsService.create({
        message: message.trim(),
        display_from: displayDate.toISOString(),
        force_logout_at: logoutDate.toISOString(),
      });
      toast.success("Aviso programado");
      setMessage("");
      await load();
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "No fue posible programar el aviso");
    } finally {
      setLoading(false);
    }
  };

  const endAnnouncement = async (id) => {
    setLoading(true);
    try {
      await systemAnnouncementsService.end(id);
      toast.success("Aviso finalizado y acceso restablecido");
      await load();
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "No fue posible finalizar el aviso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlowPageLayout
      title="Avisos del sistema"
      subtitle="Informa una novedad y programa cuándo se bloqueará el acceso de los usuarios operativos."
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>Mensaje del aviso</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Este texto será visible para los usuarios antes del cierre de sesión.</Typography>
            <TextField fullWidth label="Mensaje para los usuarios" multiline minRows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} lg={6}>
              <Paper variant="outlined" sx={{ height: "100%", p: 2, borderRadius: 3, bgcolor: "background.default" }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "info.light", color: "info.dark" }}><CampaignRoundedIcon /></Box>
                  <Box><Typography sx={{ fontWeight: 900 }}>Mostrar aviso</Typography><Typography variant="body2" color="text.secondary">Desde cuándo se informa a los usuarios.</Typography></Box>
                </Stack>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={7}><BalanceDatePicker fullWidth label="Fecha de publicación" value={datePart(displayFrom)} onChange={(value) => setDisplayFrom((current) => replaceDatePart(current, value))} /></Grid>
                  <Grid item xs={12} sm={5}><BalanceTimePicker fullWidth label="Hora" value={timePart(displayFrom)} onChange={(value) => setDisplayFrom((current) => replaceTimePart(current, value))} /></Grid>
                </Grid>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={6}>
              <Paper variant="outlined" sx={{ height: "100%", p: 2, borderRadius: 3, bgcolor: "background.default" }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "warning.light", color: "warning.dark" }}><LockClockRoundedIcon /></Box>
                  <Box><Typography sx={{ fontWeight: 900 }}>Bloquear acceso</Typography><Typography variant="body2" color="text.secondary">Momento en que se cerrarán las sesiones operativas.</Typography></Box>
                </Stack>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={7}><BalanceDatePicker fullWidth label="Fecha del bloqueo" value={datePart(forceLogoutAt)} minDate={datePart(displayFrom)} onChange={(value) => setForceLogoutAt((current) => replaceDatePart(current, value))} /></Grid>
                  <Grid item xs={12} sm={5}><BalanceTimePicker fullWidth label="Hora" value={timePart(forceLogoutAt)} onChange={(value) => setForceLogoutAt((current) => replaceTimePart(current, value))} /></Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          <Alert severity="info">Al llegar la hora de bloqueo, los usuarios operativos saldrán del sistema y no podrán volver a ingresar hasta finalizar el aviso.</Alert>
          <AppButton color="secondary" loading={loading} loadingLabel="Publicando..." disabled={!message.trim()} onClick={createAnnouncement} sx={{ alignSelf: { xs: "stretch", sm: "flex-end" }, minWidth: { sm: 280 } }}>
            Publicar y programar bloqueo
          </AppButton>
        </Stack>
      </Paper>

      <Typography variant="h5" sx={{ fontWeight: 900, mt: 4, mb: 2 }}>Historial de avisos</Typography>
      <Stack spacing={1.5}>
        {announcements.map((announcement) => (
          <Paper key={announcement.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
              <Box>
                <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
                  <Chip size="small" color={announcement.is_active ? "warning" : "default"} label={announcement.is_active ? "Activo" : "Finalizado"} />
                  <Typography variant="caption">Bloqueo: {new Date(announcement.force_logout_at).toLocaleString("es-CO")}</Typography>
                </Stack>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>{announcement.message}</Typography>
              </Box>
              {announcement.is_active && (
                <AppButton color="error" variant="outlined" disabled={loading} onClick={() => endAnnouncement(announcement.id)}>
                  Finalizar y habilitar acceso
                </AppButton>
              )}
            </Stack>
          </Paper>
        ))}
        {!announcements.length && <Alert severity="info">Aun no hay avisos registrados.</Alert>}
      </Stack>
    </FlowPageLayout>
  );
};

export default SystemAnnouncementsPage;
