import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import recipesService from "services/recipes/recipes-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const getRecipeName = (recipe) => {
  const notes = String(recipe?.notes || "").trim();
  return notes.split(/\s+-\s+/)[0] || recipe?.product_name || `Receta #${recipe?.id || ""}`;
};

const RecipesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState("");

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await recipesService.getList({});
      if (response?.code !== 1) {
        setError(response?.message || "No se pudieron cargar las recetas");
        return;
      }

      const grouped = new Map();
      normalizeRows(response.data).forEach((row) => {
        const key = String(row.id);
        const current = grouped.get(key) || { ...row, products: [] };
        if (row.product_id) {
          current.products.push(row.product_name || `Producto #${row.product_id}`);
        }
        grouped.set(key, current);
      });
      setRecipes(Array.from(grouped.values()));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error al cargar recetas"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const filteredRecipes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recipes;
    return recipes.filter((recipe) => [getRecipeName(recipe), recipe.products.join(" "), recipe.version_no].join(" ").toLowerCase().includes(term));
  }, [recipes, search]);

  return (
    <FlowPageLayout title="Recetas" subtitle="Gestiona recetas activas y crea nuevas versiones cuando necesites cambiar cantidades.">
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between", px: { xs: 2, md: 3 }, py: 2, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Listado de recetas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {loading ? "Cargando recetas..." : `${filteredRecipes.length} receta(s)`}
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar receta o producto" sx={{ minWidth: { sm: 280 } }} />
            <AppButton component={Link} href="/recipes/new" color="secondary">
              Crear receta
            </AppButton>
          </Stack>
        </Stack>

        {loading ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: { xs: 2, md: 3 }, py: 3 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">Cargando recetas...</Typography>
          </Stack>
        ) : null}

        {error ? <Alert severity="error" sx={{ m: { xs: 2, md: 3 } }}>{error}</Alert> : null}

        {!loading ? (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow sx={{ "& th": { bgcolor: "background.paper", color: "text.secondary", fontSize: 12, fontWeight: 900, textTransform: "uppercase" } }}>
                  <TableCell>Receta</TableCell>
                  <TableCell>Productos finales</TableCell>
                  <TableCell>Versión</TableCell>
                  <TableCell>Uso en producción</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecipes.map((recipe) => (
                  <TableRow key={recipe.id} sx={{ "&:last-child td": { borderBottom: 0 }, "&:hover": { bgcolor: "action.hover" } }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 900 }}>{getRecipeName(recipe)}</Typography>
                      <Typography variant="body2" color="text.secondary">ID #{recipe.id}</Typography>
                    </TableCell>
                    <TableCell>{recipe.products.length ? recipe.products.join(", ") : "Sin productos"}</TableCell>
                    <TableCell>V{recipe.version_no || 1}</TableCell>
                    <TableCell>
                      <Chip
                        label={Number(recipe.is_current) === 1 ? "Versión vigente" : "Versión anterior"}
                        color={Number(recipe.is_current) === 1 ? "success" : "default"}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <AppButton component={Link} href={`/recipes/${recipe.id}/edit`} color="secondary" variant="outlined">
                        Editar
                      </AppButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRecipes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary">No hay recetas con esos filtros.</Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Paper>
    </FlowPageLayout>
  );
};

export default RecipesPage;
