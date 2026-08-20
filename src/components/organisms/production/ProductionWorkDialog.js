import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
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

const getOutputValue = (output, item, productionQuantities) => {
  const key = String(output.product_id);
  if (productionQuantities && productionQuantities[key] !== undefined) {
    return productionQuantities[key];
  }
  if (output.produced_quantity !== undefined && output.produced_quantity !== null) {
    return String(output.produced_quantity);
  }
  return String(Math.round(Number(output.expected_quantity || 0) * Number(item?.arrobas || 1) * 1000) / 1000);
};

const ProductionWorkDialog = ({
  open,
  plan,
  item,
  finishing,
  canFinish = true,
  productionQuantities = {},
  onQuantityChange,
  onClose,
  onFinish,
}) => {
  const phase = getPhase(plan, item);
  const canEditQuantities = Boolean(canFinish && item && phase >= 3 && phase < 4);
  const steps = [
    { label: "Asignada", description: "La produccion fue enviada al panadero." },
    { label: "Vista", description: "El panadero reviso la asignacion." },
    { label: "En produccion", description: "La receta se esta preparando." },
    { label: "Produccion finalizada", description: "Quedo lista para conteo y empaque." },
    { label: "Empacada", description: "El proceso de produccion quedo terminado." },
  ].map((step, index) => ({
    ...step,
    complete: phase >= index + 1 && (phase >= 4 || index < 4),
    active: phase === index + 1 && phase < 4,
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
          Produccion realizada
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
                    {item.recipe_name} - Version {item.recipe_version}
                  </Typography>
                  <Typography color="text.secondary">
                    {formatNumber(item.arrobas)} bulto(s) estimado(s) - {plan?.branch_name}
                  </Typography>
                </Box>
                <Chip
                  label={phase >= 5 ? "Empacada" : phase >= 4 ? "Produccion finalizada" : "En produccion"}
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
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Productos de la asignacion</Typography>
              {canEditQuantities ? (
                <Grid container spacing={1.5}>
                  {(Array.isArray(item.outputs) ? item.outputs : []).map((output) => {
                    const value = getOutputValue(output, item, productionQuantities);
                    const expectedTotal = Math.round(Number(output.expected_quantity || 0) * Number(item.arrobas || 1) * 1000) / 1000;

                    return (
                      <Grid item xs={12} md={6} key={`${item.id}-${output.product_id}`}>
                        <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                          <Typography sx={{ fontWeight: 900 }}>{output.product_name}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Esperado: {formatNumber(expectedTotal)} unidades
                          </Typography>
                          <TextField
                            fullWidth
                            type="number"
                            label="Cantidad realizada"
                            value={value}
                            onChange={(event) => onQuantityChange?.(output.product_id, event.target.value)}
                            inputProps={{ min: 0.001, step: 0.001 }}
                          />
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                  {(Array.isArray(item.outputs) ? item.outputs : []).map((output) => (
                    <Stack key={`${item.id}-${output.product_id}`} spacing={0.5}>
                      <ProductionOutputChip itemId={item.id} output={output} formatNumber={formatNumber} />
                      {output.produced_quantity !== undefined && output.produced_quantity !== null ? (
                        <Chip size="small" color="success" variant="outlined" label={`${formatNumber(output.produced_quantity)} realizadas`} />
                      ) : null}
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <ProductionTrace steps={steps} />
          </Stack>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, md: 3 }, pb: 2.5 }}>
        <AppButton variant="outlined" color="secondary" onClick={onClose} disabled={finishing}>
          Cerrar
        </AppButton>
        {canEditQuantities ? (
          <AppButton color="secondary" loading={finishing} loadingLabel="Finalizando..." onClick={() => onFinish(item.id)}>
            Finalizar produccion
          </AppButton>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

export default ProductionWorkDialog;
