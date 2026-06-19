import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import ProductionTrace from "components/molecules/ProductionTrace";
import ProductionOutputChip from "components/molecules/ProductionOutputChip";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => numberFormatter.format(Number(value || 0));

const getPhase = (plan, item) => {
  if (!item) return 0;
  if (item.production_batch_status === "packed") return 5;
  if (item.production_batch_id || item.finished_at) return 4;
  if (item.started_at) return 3;
  if (plan?.viewed_at || plan?.status === "viewed") return 2;
  return 1;
};

const ProductionWorkDialog = ({ open, plan, item, finishing, onClose, onFinish }) => {
  const phase = getPhase(plan, item);
  const steps = [
    { label: "Asignada", description: "La producción fue enviada al panadero." },
    { label: "Vista", description: "El panadero revisó la asignación." },
    { label: "En producción", description: "La receta se está preparando." },
    { label: "Producción finalizada", description: "Quedó lista para conteo y empaque." },
    { label: "Empacada", description: "El proceso de producción quedó terminado." },
  ].map((step, index) => ({
    ...step,
    complete: phase > index + 1,
    active: phase === index + 1,
  }));

  return (
    <Dialog
      open={open}
      onClose={finishing ? undefined : onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      <DialogTitle sx={{ pr: 7 }}>
        <Typography variant="h5" component="span" sx={{ fontWeight: 900 }}>
          Detalle de producción
        </Typography>
        <IconButton
          aria-label="Cerrar"
          onClick={onClose}
          disabled={finishing}
          sx={{ position: "absolute", top: 12, right: 12 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
        {item ? (
          <Stack spacing={3}>
            <Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {item.recipe_name} · Versión {item.recipe_version}
                  </Typography>
                  <Typography color="text.secondary">
                    {formatNumber(item.arrobas)} arroba(s) · {plan?.branch_name}
                  </Typography>
                </Box>
                <Chip
                  label={phase >= 5 ? "Empacada" : phase >= 4 ? "Producción finalizada" : "En producción"}
                  color={phase >= 4 ? "success" : "secondary"}
                  sx={{ fontWeight: 800 }}
                />
              </Stack>

              {plan?.notes ? (
                <Typography sx={{ mt: 1.5 }}>
                  <strong>Nota:</strong> {plan.notes}
                </Typography>
              ) : null}
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Productos esperados</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {(Array.isArray(item.outputs) ? item.outputs : []).map((output) => (
                  <ProductionOutputChip
                    key={`${item.id}-${output.product_id}`}
                    itemId={item.id}
                    output={output}
                    formatNumber={formatNumber}
                  />
                ))}
              </Stack>
            </Box>

            <ProductionTrace steps={steps} />
          </Stack>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, md: 3 }, pb: 2.5 }}>
        <AppButton variant="outlined" color="secondary" onClick={onClose} disabled={finishing}>
          Cerrar
        </AppButton>
        {item && phase < 4 ? (
          <AppButton
            color="secondary"
            loading={finishing}
            loadingLabel="Finalizando..."
            onClick={() => onFinish(item.id)}
          >
            Producción lista
          </AppButton>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

export default ProductionWorkDialog;
