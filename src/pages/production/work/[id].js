import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import AppButton from "@core/components/ui/AppButton";
import ProductionTrace from "components/molecules/ProductionTrace";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const ProductionWorkPage = () => {
  const router = useRouter();
  const itemId = String(router.query.id || "");
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [item, setItem] = useState(null);

  const loadPlan = async () => {
    if (!itemId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await productionService.getMyPlans();
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar la producción.");
        return;
      }

      const plans = normalizeRows(response.data);
      const ownerPlan = plans.find((candidate) =>
        normalizeRows(candidate.items).some((candidateItem) => String(candidateItem.id) === itemId)
      );
      const ownerItem = normalizeRows(ownerPlan?.items).find((candidateItem) => String(candidateItem.id) === itemId);

      if (!ownerPlan || !ownerItem) {
        setError("Esta producción no está asignada a tu usuario.");
        return;
      }

      setPlan(ownerPlan);
      setItem(ownerItem);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar la producción."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const phase = useMemo(() => {
    if (!item) return 0;
    if (item.production_batch_status === "packed") return 5;
    if (item.production_batch_id || item.finished_at) return 4;
    if (item.started_at) return 3;
    if (plan?.viewed_at || plan?.status === "viewed") return 2;
    return 1;
  }, [item, plan]);

  const steps = [
    { label: "Asignada", description: "Plan recibido" },
    { label: "Vista", description: "Panadero informado" },
    { label: "En producción", description: "Preparación en curso" },
    { label: "Producción finalizada", description: "Lista para conteo" },
    { label: "Empacada", description: "Proceso terminado" },
  ].map((step, index) => ({
    ...step,
    complete: phase > index + 1,
    active: phase === index + 1,
  }));

  const finishProduction = async () => {
    if (!item || finishing) return;

    setFinishing(true);
    setError(null);
    try {
      const response = await productionService.finishPlanItem(item.id);
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo finalizar la producción.");
        return;
      }

      toast.success(response.message || "Producción finalizada");
      await loadPlan();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al finalizar la producción."));
    } finally {
      setFinishing(false);
    }
  };

  return (
    <FlowPageLayout
      title="Producción asignada"
      subtitle="Sigue los pasos y marca la producción cuando esté lista para conteo y empaque."
      links={[{ label: "Volver a mis asignaciones", href: "/production/planning" }]}
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando producción...</Alert> : null}

      {item ? (
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {item.recipe_name} · V{item.recipe_version}
                </Typography>
                <Typography color="text.secondary">
                  {formatNumber(item.arrobas)} arroba(s) · {plan.branch_name}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                  {normalizeRows(item.outputs).map((output) => (
                    <Chip
                      key={output.product_id}
                      label={`${output.product_name}: ${formatNumber(output.expected_quantity)} unidades`}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>

              {phase < 4 ? (
                <AppButton
                  color="secondary"
                  size="large"
                  loading={finishing}
                  onClick={finishProduction}
                  sx={{ minWidth: 220 }}
                >
                  Producción lista
                </AppButton>
              ) : (
                <Chip
                  label={phase === 5 ? "Producción empacada" : "Producción finalizada"}
                  color="success"
                  sx={{ fontWeight: 800 }}
                />
              )}
            </Stack>
          </Paper>

          <ProductionTrace steps={steps} />
        </Stack>
      ) : null}
    </FlowPageLayout>
  );
};

export default ProductionWorkPage;
