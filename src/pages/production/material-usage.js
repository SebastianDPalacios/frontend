import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";
import { getMeasurementUnitName } from "utils/production-measurement-units";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return toDateInputValue(copy);
};

const groupRows = (rows) => rows.reduce((dayAcc, row) => {
  const dayKey = String(row.usage_date || "Sin fecha").slice(0, 10);
  if (!dayAcc[dayKey]) {
    dayAcc[dayKey] = { date: dayKey, recipes: {} };
  }

  const recipeKey = String(row.recipe_id || "sin-receta");
  if (!dayAcc[dayKey].recipes[recipeKey]) {
    dayAcc[dayKey].recipes[recipeKey] = {
      recipeId: row.recipe_id,
      recipeName: row.recipe_name || "Receta sin nombre",
      recipeVersion: row.recipe_version,
      products: {},
      totalQuantity: 0,
    };
  }

  const productKey = String(row.product_id || "sin-producto");
  if (!dayAcc[dayKey].recipes[recipeKey].products[productKey]) {
    dayAcc[dayKey].recipes[recipeKey].products[productKey] = {
      productId: row.product_id,
      productName: row.product_name || "Producto sin nombre",
      productSku: row.product_sku,
      producedQuantity: Number(row.produced_quantity || 0),
      materials: [],
      totalQuantity: 0,
    };
  }

  dayAcc[dayKey].recipes[recipeKey].products[productKey].materials.push(row);
  dayAcc[dayKey].recipes[recipeKey].products[productKey].totalQuantity += Number(row.total_quantity || 0);
  dayAcc[dayKey].recipes[recipeKey].totalQuantity += Number(row.total_quantity || 0);
  return dayAcc;
}, {});

const ProductionMaterialUsagePage = () => {
  const today = toDateInputValue();
  const [filters, setFilters] = useState({
    dateFrom: addDays(new Date(), -7),
    dateTo: today,
    branchId: "",
    recipeId: "",
    search: "",
  });
  const [branches, setBranches] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [report, setReport] = useState({ rows: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState({});

  const loadCatalogs = useCallback(async () => {
    try {
      const response = await productionService.getBaseData({ onlyActive: 1, pageSize: 200 });
      if (response?.code === 1) {
        setBranches(normalizeRows(response.data?.branches));
        setRecipes(normalizeRows(response.data?.recipes));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo cargar filtros de produccion."));
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productionService.getRawMaterialUsageByProductReport({
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
        branchId: filters.branchId || null,
        recipeId: filters.recipeId || null,
      });

      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar el reporte.");
        return;
      }

      setReport({
        rows: normalizeRows(response.data?.rows),
        summary: response.data?.summary || {},
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar materias primas usadas."));
    } finally {
      setLoading(false);
    }
  }, [filters.branchId, filters.dateFrom, filters.dateTo, filters.recipeId]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const filteredRows = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    if (!term) return report.rows;
    return report.rows.filter((row) => [
      row.recipe_name,
      row.product_name,
      row.product_sku,
      row.raw_material_name,
      row.raw_material_category,
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [filters.search, report.rows]);

  const groupedDays = useMemo(() => Object.values(groupRows(filteredRows))
    .map((day) => ({
      ...day,
      recipes: Object.values(day.recipes).map((recipe) => ({
        ...recipe,
        products: Object.values(recipe.products),
      })),
    })), [filteredRows]);

  const updateFilter = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <FlowPageLayout
      title="Materias primas usadas por producto"
      subtitle="Consulta por dia, receta y producto final cuanto insumo se utilizo. Funciona como historico por rango de fechas."
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando materias primas usadas...</Alert> : null}

      <Box sx={{ mb: 3, p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Filtros del historico</Typography>
            <Typography color="text.secondary">Elige fechas, sucursal o receta para revisar el consumo real y estimado.</Typography>
          </Box>
          <Chip label={`${filteredRows.length} registro(s)`} variant="outlined" />
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <BalanceDatePicker fullWidth label="Desde" value={filters.dateFrom} maxDate={filters.dateTo || undefined} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value || "" }))} />
          </Grid>
          <Grid item xs={12} md={3}>
            <BalanceDatePicker fullWidth label="Hasta" value={filters.dateTo} minDate={filters.dateFrom || undefined} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value || "" }))} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth select label="Sucursal" value={filters.branchId} onChange={updateFilter("branchId")}>
              <MenuItem value="">Todas</MenuItem>
              {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth select label="Receta" value={filters.recipeId} onChange={updateFilter("recipeId")}>
              <MenuItem value="">Todas</MenuItem>
              {recipes.map((recipe) => (
                <MenuItem key={recipe.id} value={recipe.id}>
                  {recipe.name || recipe.product_name || `Receta #${recipe.id}`} - V{recipe.version_no}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Buscar producto, receta o materia prima" value={filters.search} onChange={updateFilter("search")} />
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">Dias con consumo</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{formatNumber(report.summary?.days_count)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">Recetas</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{formatNumber(report.summary?.recipes_count)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">Productos finales</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{formatNumber(report.summary?.products_count)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">Consumo total</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{formatNumber(report.summary?.total_quantity)}</Typography>
          </Box>
        </Grid>
      </Grid>

      <Stack spacing={2}>
        {!groupedDays.length && !loading ? (
          <Alert severity="info">No hay consumo de materias primas para los filtros seleccionados.</Alert>
        ) : null}

        {groupedDays.map((day) => (
          <Box key={day.date} sx={{ p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{day.date}</Typography>
                <Typography color="text.secondary">Consumo separado por receta y producto final.</Typography>
              </Box>
              <Chip label={`${day.recipes.length} receta(s)`} color="primary" variant="outlined" />
            </Stack>

            <Stack spacing={2}>
              {day.recipes.map((recipe) => (
                <Paper key={recipe.recipeId} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>{recipe.recipeName}</Typography>
                      <Typography color="text.secondary">Version {recipe.recipeVersion || "-"}</Typography>
                    </Box>
                    <Chip label={`${recipe.products.length} producto(s)`} variant="outlined" />
                  </Stack>

                  <Stack spacing={2}>
                    {recipe.products.map((product) => {
                      const productKey = `${day.date}-${recipe.recipeId}-${product.productId}`;
                      const isExpanded = Boolean(expandedProducts[productKey]);
                      const visibleMaterials = isExpanded ? product.materials : product.materials.slice(0, 3);
                      const hiddenCount = product.materials.length - visibleMaterials.length;
                      return (
                      <Paper key={product.productId} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "divider" }}>
                          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                            <Box>
                              <Typography sx={{ fontWeight: 900 }}>{product.productName}</Typography>
                              <Typography color="text.secondary" variant="body2">{product.productSku || "Sin SKU"}</Typography>
                            </Box>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip color="secondary" label={`${formatNumber(product.producedQuantity)} unidades producidas`} />
                              <Chip variant="outlined" label={`${product.materials.length} materia(s) prima(s)`} />
                            </Stack>
                          </Stack>
                        </Box>
                        <TableContainer sx={{ maxHeight: 520 }}>
                          <Table stickyHeader size="small" sx={{ minWidth: 760 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 900, width: "30%" }}>Materia prima</TableCell>
                                <TableCell sx={{ fontWeight: 900, width: "25%" }}>Categoría</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 900 }}>Según receta</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 900 }}>Adicional</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 900 }}>Consumo total</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {product.materials.map((material, materialIndex) => {
                                const unitName = getMeasurementUnitName(material.raw_material_unit);
                                const directQuantity = Number(material.direct_quantity || 0);
                                return <TableRow key={`table-${material.raw_material_id}-${material.raw_material_name}`} sx={{ bgcolor: materialIndex % 2 ? "grey.50" : "background.paper", "&:last-child td": { borderBottom: 0 } }}>
                                  <TableCell><Typography fontWeight={900}>{material.raw_material_name}</Typography></TableCell>
                                  <TableCell><Typography variant="body2" color="text.secondary">{material.raw_material_category || "Sin categoría"}</Typography></TableCell>
                                  <TableCell align="right">{formatNumber(material.base_quantity)} {unitName}</TableCell>
                                  <TableCell align="right">{directQuantity > 0 ? <Chip size="small" color="warning" variant="outlined" label={`${formatNumber(directQuantity)} ${unitName}`} /> : <Typography color="text.secondary">No aplica</Typography>}</TableCell>
                                  <TableCell align="right"><Typography fontWeight={900} color="secondary.main">{formatNumber(material.total_quantity)} {unitName}</Typography></TableCell>
                                </TableRow>;
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Grid container spacing={1.5} sx={{ display: "none", p: { xs: 1.5, md: 2 } }}>
                          {visibleMaterials.map((material) => {
                            const unitName = getMeasurementUnitName(material.raw_material_unit);
                            const directQuantity = Number(material.direct_quantity || 0);
                            return <Grid item xs={12} sm={6} lg={4} key={`${material.raw_material_id}-${material.raw_material_name}`}>
                              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: "100%", borderLeft: "4px solid", borderLeftColor: "secondary.main" }}>
                                <Typography variant="caption" color="text.secondary">{material.raw_material_category || "Sin categoría"}</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2, mt: 0.25 }}>{material.raw_material_name}</Typography>
                                <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: "grey.50" }}>
                                  <Typography variant="caption" color="text.secondary">CONSUMO TOTAL</Typography>
                                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{formatNumber(material.total_quantity)} {unitName}</Typography>
                                </Box>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                                  <Chip size="small" variant="outlined" label={`Receta: ${formatNumber(material.base_quantity)} ${unitName}`} />
                                  {directQuantity > 0 ? <Chip size="small" color="warning" variant="outlined" label={`Adicional: ${formatNumber(directQuantity)} ${unitName}`} /> : null}
                                </Stack>
                              </Paper>
                            </Grid>;
                          })}
                        </Grid>
                        {product.materials.length > 3 ? <Box sx={{ display: "none", px: 2, pb: 2, textAlign: "center" }}>
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => setExpandedProducts((current) => ({ ...current, [productKey]: !isExpanded }))}
                          >
                            {isExpanded ? "Mostrar menos" : `Ver ${hiddenCount} materia(s) prima(s) más`}
                          </Button>
                        </Box> : null}
                      </Paper>
                      );
                    })}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </FlowPageLayout>
  );
};

export default ProductionMaterialUsagePage;
