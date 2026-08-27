import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import systemAnnouncementsService from "services/system/system-announcements-service";

const toLocalInput = (date) => {
  const value = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return value.toISOString().slice(0, 16);
};

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
    setLoading(true);
    try {
      await systemAnnouncementsService.create({
        message: message.trim(),
        display_from: new Date(displayFrom).toISOString(),
        force_logout_at: new Date(forceLogoutAt).toISOString(),
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
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>Avisos del sistema</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Informa una novedad y programa la hora en que se bloqueara el sistema para los usuarios operativos.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
        <Stack spacing={2}>
          <TextField label="Mensaje para los usuarios" multiline minRows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField fullWidth label="Mostrar desde" type="datetime-local" value={displayFrom} onChange={(event) => setDisplayFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField fullWidth label="Bloquear y cerrar sesiones" type="datetime-local" value={forceLogoutAt} onChange={(event) => setForceLogoutAt(event.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
          <Alert severity="info">Antes de la hora programada el aviso se puede cerrar. Al llegar la hora, los usuarios operativos saldran del sistema y no podran volver a entrar hasta finalizar el aviso.</Alert>
          <Button variant="contained" color="secondary" disabled={loading || !message.trim()} onClick={createAnnouncement} sx={{ alignSelf: "flex-end" }}>
            Publicar y programar bloqueo
          </Button>
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
                <Button color="error" variant="outlined" disabled={loading} onClick={() => endAnnouncement(announcement.id)}>
                  Finalizar y habilitar acceso
                </Button>
              )}
            </Stack>
          </Paper>
        ))}
        {!announcements.length && <Alert severity="info">Aun no hay avisos registrados.</Alert>}
      </Stack>
    </Box>
  );
};

export default SystemAnnouncementsPage;
