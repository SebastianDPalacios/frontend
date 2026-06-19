import { Chip, Stack } from "@mui/material";

const ProductionOutputChip = ({ output, itemId, formatNumber }) => {
  const reserved = Number(output.reserved_quantity || 0);
  const delivered = Number(output.direct_delivered_quantity || 0);

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Chip
        key={`${itemId}-${output.product_id}`}
        label={`${output.product_name}: ${formatNumber(output.expected_quantity)} unidades`}
        color="primary"
        variant="outlined"
      />
      {reserved > 0 ? (
        <Chip
          size="small"
          label={`${formatNumber(reserved)} reservadas`}
          color="warning"
          variant="outlined"
        />
      ) : null}
      {delivered > 0 ? (
        <Chip
          size="small"
          label={`${formatNumber(delivered)} entregadas directo`}
          color="success"
          variant="outlined"
        />
      ) : null}
    </Stack>
  );
};

export default ProductionOutputChip;
