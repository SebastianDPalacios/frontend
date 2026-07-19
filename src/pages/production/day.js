import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Grid, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import Link from "next/link";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import catalogService from "services/catalog/catalog-service";
import productionService from "services/production/production-service";
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

const formatNumber = (value) => numberFormatter.format(Number(value || 0));

const formatUnits = (value) => {
  const numberValue = Number(value || 0);
  const rounded = Math.round(numberValue);

  if (Math.abs(numberValue - rounded) < 0.01) {
    return numberFormatter.format(rounded);
  }

  return numberFormatter.format(numberValue);
};

const getMaterialUnit = (unit) => (unit === "ml" ? "ml" : "g");

const formatMaterialQty = (value, unit) => {
  const baseUnit = getMaterialUnit(unit);
  return `${formatUnits(value)} ${baseUnit}`;
};

const pluralize = (value, singular, plural) => {
  return `${formatUnits(value)} ${Number(value) === 1 ? singular : plural}`;
};

const formatMaterialEquivalent = (value, unit) => {
  const numberValue = Number(value || 0);

  if (numberValue <= 0) {
    return unit === "ml" ? "0 litros + 0 ml" : "0 bultos de 50 kg + 0 g";
  }

  if (unit === "ml") {
    const fullLiters = Math.floor(numberValue / 1000);
    const remainingMl = numberValue - fullLiters * 1000;

    return `${pluralize(fullLiters, "litro", "litros")} + ${formatUnits(remainingMl)} ml`;
  }

  const bagSizeGrams = 50000;
  const fullBags = Math.floor(numberValue / bagSizeGrams);
  const remainingGrams = numberValue - fullBags * bagSizeGrams;
  const formatWeightRemainder = (grams) => {
    if (grams >= 1000) {
      return `${formatUnits(grams / 1000)} kg`;
    }

    return `${formatUnits(grams)} g`;
  };

  return `${pluralize(fullBags, "bulto de 50 kg", "bultos de 50 kg")} + ${formatWeightRemainder(remainingGrams)}`;
};

const formatMoney = (value) => moneyFormatter.format(Number(value || 0));

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const statusLabels = {
  pending_packaging: "Pendiente",
  partially_packed: "Parcial",
  packed: "Empacado",
  cancelled: "Cancelado",
};

const statusColors = {
  pending_packaging: "warning",
  partially_packed: "secondary",
  packed: "success",
  cancelled: "error",
};

const getReportRange = (filters) => {
  return {
    from: filters.date,
    to: filters.date,
  };
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

const getCountGap = (row) => Math.round((Number(row.produced_quantity || 0) - Number(row.counted_quantity || 0)) * 1000) / 1000;

const CountGapChip = ({ gap }) => {
  const normalizedGap = Number(gap || 0);

  if (normalizedGap > 0) {
    return (
      <Chip
        size="small"
        color="warning"
        variant="outlined"
        label={`Falta por explicar: ${formatUnits(normalizedGap)}`}
        sx={{ fontWeight: 800, maxWidth: "100%", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.35 } }}
      />
    );
  }

  if (normalizedGap < 0) {
    return (
      <Chip
        size="small"
        color="info"
        variant="outlined"
        label={`Contador reporto mas: ${formatUnits(Math.abs(normalizedGap))}`}
        sx={{ fontWeight: 800, maxWidth: "100%", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.35 } }}
      />
    );
  }

  return <Chip size="small" color="success" variant="outlined" label="Sin desfase" sx={{ fontWeight: 800 }} />;
};

const BatchCard = ({ batch }) => {
  const produced = Number(batch.produced_quantity || 0);
  const packed = Number(batch.packed_quantity || 0);
  const damaged = Number(batch.damaged_quantity || 0);
  const missing = Number(batch.missing_quantity || 0);
  const progress = produced > 0 ? Math.min(Math.round(((packed + damaged + missing) / produced) * 100), 100) : 0;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, height: "100%" }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900 }}>Lote #{batch.production_batch_id}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {batch.recipe_name || "Receta"} - {batch.branch_name || "Sucursal"}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={statusLabels[batch.status] || batch.status || "Pendiente"}
            color={statusColors[batch.status] || "default"}
            variant={batch.status === "pending_packaging" ? "outlined" : "filled"}
            sx={{ fontWeight: 800 }}
          />
        </Stack>

        <Box>
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Avance de empaque
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 900 }}>
              {progress}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 999, "& .MuiLinearProgress-bar": { borderRadius: 999 } }}
          />
        </Box>

        <Grid container spacing={1}>
          <Grid item xs={3}>
            <SmallStat label="Mojes" value={formatUnits(batch.batch_quantity)} />
          </Grid>
          <Grid item xs={3}>
            <SmallStat label="Productos" value={formatUnits(batch.products_count)} />
          </Grid>
          <Grid item xs={3}>
            <SmallStat label="Empacados" value={formatUnits(batch.packed_quantity)} />
          </Grid>
          <Grid item xs={3}>
            <SmallStat label="Pendientes" value={formatUnits(batch.pending_quantity)} />
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary">
          Panadero: {batch.baker_name || "-"}
        </Typography>
      </Stack>
    </Paper>
  );
};

const ProductionDayPage = () => {
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    date: toDateInputValue(),
    branchId: "",
  });
  const [report, setReport] = useState({
    summary: {},
    batches: [],
    products: [],
    raw_materials_usage: [],
    posterior_materials: [],
    packers: [],
  });
  const reportRange = useMemo(() => getReportRange(filters), [filters]);

  useEffect(() => {
    const run = async () => {
      setBranchesLoading(true);
      try {
        const response = await catalogService.getBranches({ onlyActive: 1 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudieron cargar sucursales");
          return;
        }
        setBranches(normalizeRows(response.data));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar sucursales"));
      } finally {
        setBranchesLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await productionService.getDayReport({
          dateFrom: reportRange.from,
          dateTo: reportRange.to,
          branchId: filters.branchId || undefined,
        });

        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el reporte de produccion");
          return;
        }

        setReport({
          summary: response.data?.summary || {},
          batches: normalizeRows(response.data?.batches),
          products: normalizeRows(response.data?.products),
          raw_materials_usage: normalizeRows(response.data?.raw_materials_usage),
          posterior_materials: normalizeRows(response.data?.posterior_materials),
          packers: normalizeRows(response.data?.packers),
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar el reporte"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [filters.branchId, reportRange.from, reportRange.to]);

  const summary = report.summary || {};
  const produced = Number(summary.produced_quantity || 0);
  const packed = Number(summary.packed_quantity || 0);
  const damaged = Number(summary.damaged_quantity || 0);
  const missing = Number(summary.missing_quantity || 0);
  const pending = Number(summary.pending_quantity || 0);
  const progress = produced > 0 ? Math.min(Math.round(((packed + damaged + missing) / produced) * 100), 100) : 0;
  const selectedBranchName = useMemo(
    () => branches.find((branch) => String(branch.id) === String(filters.branchId))?.name || "Todas las sucursales",
    [branches, filters.branchId]
  );
  const rawMaterialsTotalCost = useMemo(
    () => report.raw_materials_usage.reduce((total, material) => total + Number(material.total_cost || 0), 0),
    [report.raw_materials_usage]
  );
  const countGap = Math.round((produced - Number(summary.counted_quantity || 0)) * 1000) / 1000;
  const productsWithCountGap = useMemo(
    () => report.products
      .map((product) => ({ ...product, count_gap: getCountGap(product) }))
      .filter((product) => Math.abs(Number(product.count_gap || 0)) > 0.001),
    [report.products]
  );

  return (
    <FlowPageLayout
      title="Produccion - Dia"
      subtitle="Reporte de lotes, productos listos, daños y pendientes."
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
              Reporte de produccion
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reportRange.from === reportRange.to ? reportRange.from : `${reportRange.from} a ${reportRange.to}`} - {selectedBranchName}
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="outlined" color="secondary" component={Link} href="/production/month">
              Reporte mensual
            </Button>
            <Button variant="outlined" color="secondary" component={Link} href="/recipes/new">
              Crear receta
            </Button>
            <Button variant="contained" color="secondary" component={Link} href="/production/packaging">
              Crear o contar lote
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={2} sx={{ alignItems: "flex-start", mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <BalanceDatePicker
              label="Fecha"
              value={filters.date}
              onChange={(value) => setFilters((current) => ({ ...current, date: value || toDateInputValue() }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Sucursal"
              value={filters.branchId}
              onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}
              disabled={branchesLoading}
            >
              <MenuItem value="">Todas las sucursales</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={String(branch.id)}>
                  {getDisplayName(branch)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <AppButton
              color="inherit"
              onClick={() => setFilters({ date: toDateInputValue(), branchId: "" })}
              sx={{ width: "100%", minHeight: 54 }}
            >
              Hoy
            </AppButton>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <MetricCard label="Lotes" value={formatUnits(summary.batches_count)} helper={`${formatUnits(summary.batch_quantity)} mojes`} color="info" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Producido" value={formatUnits(produced)} helper="Unidades esperadas del dia" color="secondary" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Empacados" value={formatUnits(packed)} helper={`${formatUnits(progress)}% contado`} color="success" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            label="Pendientes"
            value={formatUnits(pending)}
            helper={formatUnits(damaged) + " danados / " + formatUnits(missing) + " faltantes"}
            color={pending > 0 ? "warning" : "success"}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            label="Desfase de conteo"
            value={formatUnits(countGap)}
            helper="Reportado por panadero menos conteo real"
            color={Math.abs(countGap) > 0.001 ? "warning" : "success"}
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Avance del dia
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Listos y daños sobre lo producido.
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

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, mb: 2 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Comparativo de produccion
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Compara lo reportado por panadero contra el conteo real. El desfase sirve para preguntar y justificar diferencias.
            </Typography>
          </Box>
          <CountGapChip gap={countGap} />
        </Stack>

        {loading ? <Alert severity="info">Cargando comparativo...</Alert> : null}
        {!loading && report.products.length === 0 ? <Alert severity="info">No hay produccion para comparar en estos filtros.</Alert> : null}
        {!loading && report.products.length > 0 && productsWithCountGap.length === 0 ? (
          <Alert severity="success">No hay desfases entre lo reportado por panadero y el conteo real.</Alert>
        ) : null}

        <Stack spacing={1}>
          {productsWithCountGap.map((product) => (
            <Paper key={product.product_id} variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
              <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
                <Grid item xs={12} md={3}>
                  <Typography sx={{ fontWeight: 900 }}>{product.product_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatUnits(product.batches_count)} {Number(product.batches_count || 0) === 1 ? "lote" : "lotes"}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3} md={1.5}>
                  <SmallStat label="Panadero" value={formatUnits(product.produced_quantity)} />
                </Grid>
                <Grid item xs={6} sm={3} md={1.5}>
                  <SmallStat label="Contador" value={formatUnits(product.counted_quantity)} />
                </Grid>
                <Grid item xs={6} sm={3} md={1.5}>
                  <SmallStat label="Empacado" value={formatUnits(product.packed_quantity)} />
                </Grid>
                <Grid item xs={6} sm={3} md={1.5}>
                  <SmallStat label="Danado" value={formatUnits(product.damaged_quantity)} />
                </Grid>
                <Grid item xs={6} sm={3} md={1.5}>
                  <SmallStat label="Faltante" value={formatUnits(product.missing_quantity)} />
                </Grid>
                <Grid item xs={12} sm={9} md={3}>
                  <CountGapChip gap={product.count_gap} />
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Productos del dia
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Produccion, listos, daños y pendientes por producto.
                </Typography>
              </Box>
              <Chip label={`${report.products.length} productos`} variant="outlined" />
            </Stack>

            {loading ? <Alert severity="info">Cargando reporte...</Alert> : null}
            {!loading && report.products.length === 0 ? <Alert severity="info">No hay productos producidos para estos filtros.</Alert> : null}

            <Stack spacing={1}>
              {report.products.map((product) => (
                <Paper key={product.product_id} variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
                  <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
                    <Grid item xs={12} md={4}>
                      <Typography sx={{ fontWeight: 900 }}>{product.product_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatUnits(product.batches_count)} {Number(product.batches_count || 0) === 1 ? "lote" : "lotes"}
                      </Typography>
                    </Grid>
                    <Grid item xs={3} md={2}>
                      <SmallStat label="Producido" value={formatUnits(product.produced_quantity)} />
                    </Grid>
                    <Grid item xs={3} md={2}>
                      <SmallStat label="Listo" value={formatUnits(product.packed_quantity)} />
                    </Grid>
                    <Grid item xs={3} md={2}>
                      <SmallStat
                        label="Dañado / faltante"
                        value={`${formatUnits(product.damaged_quantity)} / ${formatUnits(product.missing_quantity)}`}
                      />
                    </Grid>
                    <Grid item xs={3} md={2}>
                      <SmallStat label="Pendientes" value={formatUnits(product.pending_quantity)} />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Lotes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Estado por lote creado en la fecha.
                </Typography>
              </Box>
              <Chip label={`${report.batches.length}`} variant="outlined" />
            </Stack>

            {!loading && report.batches.length === 0 ? <Alert severity="info">No hay lotes para estos filtros.</Alert> : null}
            <Grid container spacing={1.5}>
              {report.batches.map((batch) => (
                <Grid item xs={12} key={batch.production_batch_id}>
                  <BatchCard batch={batch} />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Consumo de materias primas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total consumido por los ingredientes base y los ingredientes propios de cada producto. Costo estimado: {formatMoney(rawMaterialsTotalCost)}.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Chip label={`${report.raw_materials_usage.length} insumos`} variant="outlined" />
                <Chip label={formatMoney(rawMaterialsTotalCost)} color="secondary" variant="outlined" />
              </Stack>
            </Stack>

            {!loading && report.raw_materials_usage.length === 0 ? <Alert severity="info">No hay consumo de materias primas para estos filtros.</Alert> : null}
            <Stack spacing={1}>
              {report.raw_materials_usage.map((material) => (
                <Paper
                  key={material.raw_material_id}
                  variant="outlined"
                  sx={{ borderRadius: 2, p: 1.5 }}
                >
                  <Grid container spacing={1.25} sx={{ alignItems: "center" }}>
                    <Grid item xs={12} md={4}>
                      <Typography sx={{ fontWeight: 900 }}>{material.raw_material_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatMaterialEquivalent(material.total_quantity, material.raw_material_unit)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                      <SmallStat label="Costo" value={formatMoney(material.total_cost)} />
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                      <SmallStat label="Total" value={formatMaterialQty(material.total_quantity, material.raw_material_unit)} />
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                      <SmallStat
                        label="Base"
                        value={formatMaterialQty(material.base_quantity, material.raw_material_unit)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatMoney(material.base_cost)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                      <SmallStat
                        label="Producto"
                        value={formatMaterialQty(material.posterior_quantity, material.raw_material_unit)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatMoney(material.posterior_cost)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Empaque por persona
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Cantidades reportadas por empacador.
            </Typography>

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
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default ProductionDayPage;
