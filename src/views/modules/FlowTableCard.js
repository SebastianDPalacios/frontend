import {
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const FlowTableCard = ({ title, loading, error, columns = [], rows = [], emptyMessage = "No hay datos" }) => {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Typography variant="h6" sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, fontSize: { xs: 16, sm: 20 } }}>
        {title}
      </Typography>
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
                <TableRow key={row.id ?? row.code ?? index}>
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
