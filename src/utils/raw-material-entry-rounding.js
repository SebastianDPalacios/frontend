const QUANTITY_SCALE = 1000;

export const normalizeRawMaterialEntryQuantity = (value) => {
  const originalQuantity = Math.round(Number(value) * QUANTITY_SCALE) / QUANTITY_SCALE;
  if (!Number.isFinite(originalQuantity) || originalQuantity <= 0) return 0;
  const whole = Math.trunc(originalQuantity);
  const decimalPart = Math.round((originalQuantity - whole) * QUANTITY_SCALE) / QUANTITY_SCALE;
  return decimalPart > 0.5 ? whole + 1 : originalQuantity;
};
