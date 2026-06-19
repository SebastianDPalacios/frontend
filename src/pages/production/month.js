import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Grid, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import Link from "next/link";
import AppButton from "@core/components/ui/AppButton";
import { BalanceMonthPicker } from "@core/components/ui/BalancePeriodPickers";
import { getMonthRange, toMonthInputValue } from "@core/components/ui/balance-date-utils";
import catalogService from "services/catalog/catalog-service";
import productionService from "services/production/production-service";
import recipesService from "services/recipes/recipes-service";
import exportProductionMonthExcel from "components/organisms/production/exportProductionMonthExcel";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "COP",
});

const formatUnits = (value) => numberFormatter.format(Number(value || 0));
const formatMoney = (value) => moneyFormatter.format(Number(value || 0));
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const pluralize = (value, singular, plural) => `${formatUnits(value)} ${Number(value) === 1 ? singular : plural}`;

const formatMaterialQty = (value, unit) => {
  const baseUnit = unit === "ml" ? "ml" : "g";
  return `${formatUnits(value)} ${baseUnit}`;
};

const formatMaterialEquivalent = (material) => {
  const value = material?.total_quantity;
  const unit = material?.raw_material_unit;
  const numberValue = Number(value || 0);
  const packageQuantity = Number(material?.purchase_package_quantity || 0);
  const packageName = String(material?.purchase_package_name || "").trim();

  if (packageQuantity > 0 && packageName) {
    const fullPackages = Math.floor(numberValue / packageQuantity);
    const remaining = numberValue - fullPackages * packageQuantity;
    const packageLabel = fullPackages === 1 ? packageName : `${packageName}s`;
    const remainingLabel = unit === "ml"
      ? (remaining >= 1000 ? `${formatUnits(remaining / 1000)} litros` : `${formatUnits(remaining)} ml`)
      : (remaining >= 1000 ? `${formatUnits(remaining / 1000)} kg` : `${formatUnits(remaining)} g`);
    return `${formatUnits(fullPackages)} ${packageLabel} + ${remainingLabel}`;
  }

  if (unit === "ml") {
    const fullLiters = Math.floor(numberValue / 1000);
    const remainingMl = numberValue - fullLiters * 1000;
    return `${pluralize(fullLiters, "litro", "litros")} + ${formatUnits(remainingMl)} ml`;
  }

  return numberValue >= 1000 ? `${formatUnits(numberValue / 1000)} kg` : `${formatUnits(numberValue)} g`;
};

const getRecipeName = (recipe) => {
  const notes = String(recipe?.notes || "").trim();
  return notes.split(/\s+-\s+/)[0] || recipe?.product_name || `Receta #${recipe?.id || ""}`;
};

const MetricCard = ({ label, value, helper, color = "primary" }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, height: "100%" }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, color: `${color}.main` }}>
      {value}
    </Typography>
    {helper ? (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        {helper}
      </Typography>
    ) : null}
  </Paper>
);

const SmallStat = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography sx={{ fontWeight: 900 }}>{value}</Typography>
  </Box>
);

const ProductionMonthPage = () => {
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [filters, setFilters] = useState({
    month: toMonthInputValue(),
    branchId: "",
    recipeId: "",
  });
  const [report, setReport] = useState({
    summary: {},
    products: [],
    batches: [],
    packers: [],
    recipe_materials_usage: [],
    estimated_cost: 0,
  });

  const reportRange = useMemo(() => getMonthRange(filters.month), [filters.month]);
  const selectedBranchName = useMemo(
    () => branches.find((branch) => String(branch.id) === String(filters.branchId))?.name || "Todas las sucursales",
    [branches, filters.branchId]
  );
  const selectedRecipeName = useMemo(
    () => recipes.find((recipe) => String(recipe.id) === String(filters.recipeId))?.display_name || "Todas las recetas",
    [recipes, filters.recipeId]
  );

  const bakerSummary = useMemo(() => {
    const grouped = new Map();
    report.batches.forEach((batch) => {
      const key = String(batch.baker_employee_id || "none");
      const current = grouped.get(key) || {
        baker_employee_id: batch.baker_employee_id,
        baker_name: batch.baker_name || "Panadero",
        batches_count: 0,
        batch_quantity: 0,
        produced_quantity: 0,
        packed_quantity: 0,
        damaged_quantity: 0,
        missing_quantity: 0,
      };

      current.batches_count += 1;
      current.batch_quantity += Number(batch.batch_quantity || 0);
      current.produced_quantity += Number(batch.produced_quantity || 0);
      current.packed_quantity += Number(batch.packed_quantity || 0);
      current.damaged_quantity += Number(batch.damaged_quantity || 0);
      current.missing_quantity += Number(batch.missing_quantity || 0);
      grouped.set(key, current);
    });

    return Array.from(grouped.values()).sort((a, b) => a.baker_name.localeCompare(b.baker_name));
  }, [report.batches]);

  useEffect(() => {
    const run = async () => {
      setCatalogLoading(true);
      try {
        const [branchesResponse, recipesResponse] = await Promise.all([
          catalogService.getBranches({ onlyActive: 1 }),
          recipesService.getList({}),
        ]);

        if (branchesResponse?.code !== 1) {
          setError(branchesResponse?.message || "No se pudieron cargar sucursales");
          return;
        }

        if (recipesResponse?.code !== 1) {
          setError(recipesResponse?.message || "No se pudieron cargar recetas");
          return;
        }

        const uniqueRecipes = new Map();
        normalizeRows(recipesResponse.data).forEach((recipe) => {
          if (!uniqueRecipes.has(String(recipe.id))) {
            uniqueRecipes.set(String(recipe.id), {
              ...recipe,
              display_name: getRecipeName(recipe),
            });
          }
        });

        setBranches(normalizeRows(branchesResponse.data));
        setRecipes(Array.from(uniqueRecipes.values()));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar filtros"));
      } finally {
        setCatalogLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await productionService.getMonthReport({
          month: filters.month,
          dateFrom: reportRange.from,
          dateTo: reportRange.to,
          branchId: filters.branchId || undefined,
          recipeId: filters.recipeId || undefined,
        });

        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el reporte mensual");
          return;
        }

        setReport({
          summary: response.data?.summary || {},
          products: normalizeRows(response.data?.products),
          batches: normalizeRows(response.data?.batches),
          packers: normalizeRows(response.data?.packers),
          recipe_materials_usage: normalizeRows(response.data?.recipe_materials_usage),
          estimated_cost: Number(response.data?.estimated_cost || 0),
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar el reporte mensual"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [filters.branchId, filters.month, filters.recipeId, reportRange.from, reportRange.to]);

  const summary = report.summary || {};
  const produced = Number(summary.produced_quantity || 0);
  const packed = Number(summary.packed_quantity || 0);
  const damaged = Number(summary.damaged_quantity || 0);
  const missing = Number(summary.missing_quantity || 0);
  const pending = Number(summary.pending_quantity || 0);
  const progress = produced > 0 ? Math.min(Math.round(((packed + damaged + missing) / produced) * 100), 100) : 0;

  const handleExport = async () => {
    try {
      await exportProductionMonthExcel({
        filters,
        reportRange,
        selectedBranchName,
        selectedRecipeName,
        summary,
        produced,
        packed,
        damaged,
        missing,
        pending,
        progress,
        report,
        bakerSummary,
        formatMaterialEquivalent,
      });
    } catch (exportError) {
      setError(getErrorMessage(exportError, "No se pudo generar el archivo Excel."));
    }
  };

  return (
    <FlowPageLayout
      title="Produccion - Mes"
      subtitle="Resumen mensual de productos, costos, panaderos y empacadores."
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Reporte mensual
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reportRange.from} a {reportRange.to} - {selectedBranchName} - {selectedRecipeName}
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <AppButton variant="outlined" color="secondary" onClick={handleExport} disabled={loading}>
              Exportar Excel
            </AppButton>
            <AppButton variant="outlined" color="secondary" component={Link} href="/production/day">
              Ver diario
            </AppButton>
            <AppButton color="secondary" component={Link} href="/production/packaging">
              Crear o contar lote
            </AppButton>
          </Stack>
        </Stack>

        <Grid container spacing={2} sx={{ alignItems: "flex-start", mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <BalanceMonthPicker
              label="Mes"
              value={filters.month}
              onChange={(value) => setFilters((current) => ({ ...current, month: value || toMonthInputValue() }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Sucursal"
              value={filters.branchId}
              onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}
              disabled={catalogLoading}
            >
              <MenuItem value="">Todas las sucursales</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={String(branch.id)}>
                  {getDisplayName(branch)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Receta"
              value={filters.recipeId}
              onChange={(event) => setFilters((current) => ({ ...current, recipeId: event.target.value }))}
              disabled={catalogLoading}
            >
              <MenuItem value="">Todas las recetas</MenuItem>
              {recipes.map((recipe) => (
                <MenuItem key={recipe.id} value={String(recipe.id)}>
                  {recipe.display_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <AppButton
              color="inherit"
              onClick={() => setFilters({ month: toMonthInputValue(), branchId: "", recipeId: "" })}
              sx={{ width: "100%", minHeight: 54 }}
            >
              Mes actual
            </AppButton>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <MetricCard label="Lotes" value={formatUnits(summary.batches_count)} helper={`${formatUnits(summary.batch_quantity)} mojes`} color="info" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Fabricados" value={formatUnits(produced)} helper="Unidades producidas" color="secondary" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Empacados" value={formatUnits(packed)} helper={`${formatUnits(progress)}% contado`} color="success" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            label="Costo estimado"
            value={formatMoney(report.estimated_cost)}
            helper={`${formatUnits(damaged)} dañados · ${formatUnits(missing)} faltantes`}
            color="warning"
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Avance mensual
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Empacados, dañados y faltantes sobre lo fabricado. Pendientes: {formatUnits(pending)}.
            </Typography>
          </Box>
          <Chip label={`${formatUnits(progress)}%`} color={progress >= 100 ? "success" : "info"} />
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 10, borderRadius: 999, "& .MuiLinearProgress-bar": { borderRadius: 999 } }}
        />
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Productos del mes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fabricados, listos, dañados y pendientes por producto.
                </Typography>
              </Box>
              <Chip label={`${report.products.length} productos`} variant="outlined" />
            </Stack>

            {loading ? <Alert severity="info">Cargando reporte mensual...</Alert> : null}
            {!loading && report.products.length === 0 ? <Alert severity="info">No hay productos producidos para estos filtros.</Alert> : null}

            <Stack spacing={1}>
              {report.products.map((product) => (
                <Paper key={product.product_id} variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
                  <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
                    <Grid item xs={12} md={4}>
                      <Typography sx={{ fontWeight: 900 }}>{product.product_name}</Typography>
                      <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
                        <Chip size="small" label={`Lotes: ${formatUnits(product.batches_count)}`} color="secondary" variant="outlined" />
                      </Stack>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                      <SmallStat label="Fabricados" value={formatUnits(product.produced_quantity)} />
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                      <SmallStat label="Empacados" value={formatUnits(product.packed_quantity)} />
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                      <SmallStat
                        label="Dañados / faltantes"
                        value={`${formatUnits(product.damaged_quantity)} / ${formatUnits(product.missing_quantity)}`}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                      <SmallStat label="Pendientes" value={formatUnits(product.pending_quantity)} />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Panaderos
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Produccion acumulada por panadero.
                  </Typography>
                </Box>
                <Chip label={`${bakerSummary.length} panaderos`} variant="outlined" />
              </Stack>

              {!loading && bakerSummary.length === 0 ? <Alert severity="info">No hay panaderos en estos filtros.</Alert> : null}
              <Stack spacing={1}>
                {bakerSummary.map((baker) => (
                  <Paper key={baker.baker_employee_id || baker.baker_name} variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
                    <Grid container spacing={1} sx={{ alignItems: "center" }}>
                      <Grid item xs={12} sm={5}>
                        <Typography sx={{ fontWeight: 900 }}>{baker.baker_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatUnits(baker.batches_count)} {Number(baker.batches_count || 0) === 1 ? "lote" : "lotes"} - {formatUnits(baker.batch_quantity)} mojes
                        </Typography>
                      </Grid>
                      <Grid item xs={4} sm={2}>
                        <SmallStat label="Fabricados" value={formatUnits(baker.produced_quantity)} />
                      </Grid>
                      <Grid item xs={4} sm={2}>
                        <SmallStat label="Empacados" value={formatUnits(baker.packed_quantity)} />
                      </Grid>
                      <Grid item xs={4} sm={3}>
                        <SmallStat
                          label="Dañados / faltantes"
                          value={`${formatUnits(baker.damaged_quantity)} / ${formatUnits(baker.missing_quantity)}`}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Empacadores
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cantidades reportadas por empacador.
                  </Typography>
                </Box>
                <Chip label={`${report.packers.length} empacadores`} variant="outlined" />
              </Stack>

              {!loading && report.packers.length === 0 ? <Alert severity="info">No hay empaque registrado para estos filtros.</Alert> : null}
              <Stack spacing={1}>
                {report.packers.map((packer) => (
                  <Paper key={packer.packer_employee_id} variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
                    <Grid container spacing={1} sx={{ alignItems: "center" }}>
                      <Grid item xs={12} sm={5}>
                        <Typography sx={{ fontWeight: 900 }}>{packer.packer_name || "Empacador"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatUnits(packer.reports_count)} {Number(packer.reports_count || 0) === 1 ? "reporte" : "reportes"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <SmallStat label="Empacados" value={formatUnits(packer.packed_quantity)} />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <SmallStat
                          label="Dañados / faltantes"
                          value={`${formatUnits(packer.damaged_quantity)} / ${formatUnits(packer.missing_quantity)}`}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default ProductionMonthPage;
