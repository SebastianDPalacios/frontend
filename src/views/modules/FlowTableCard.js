import {
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const FlowTableCard = ({
  title,
  loading,
  error,
  columns = [],
  rows = [],
  emptyMessage = "No hay datos",
  actions = null,
  onRowClick = null,
  getRowSx = null,
  sx = null,
}) => {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", ...sx }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontSize: { xs: 16, sm: 20 } }}>
          {title}
        </Typography>
        {actions}
      </Stack>
      {loading ? (
        <Typography sx={{ px: { xs: 1.5, sm: 2 }, pb: 2 }}>
          <CircularProgress size={24} />
        </Typography>
      ) : null}
      {error ? <Alert severity="error" sx={{ mx: { xs: 1.5, sm: 2 }, mb: 2 }}>{error}</Alert> : null}
      {!loading ? (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key} sx={{ whiteSpace: "nowrap", fontWeight: 700 }}>
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={row.id ?? row.code ?? index}
                  hover={Boolean(onRowClick)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{
                    cursor: onRowClick ? "pointer" : "default",
                    ...(getRowSx ? getRowSx(row) : {}),
                  }}
                >
                  {columns.map((column) => (
                    <TableCell key={`${column.key}-${index}`} sx={{ whiteSpace: "nowrap" }}>
                      {column.render ? column.render(row) : row[column.key] || "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Math.max(columns.length, 1)}>{emptyMessage}</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Paper>
  );
};

export default FlowTableCard;
