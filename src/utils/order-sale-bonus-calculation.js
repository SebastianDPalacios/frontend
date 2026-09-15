import { isIntegerUnit } from "views/modules/flow-utils";

export const getCommercialUnitPrice = (product) => {
  const price = Number(product?.base_price || 0);
  const taxPercent = Number(product?.tax_percent || product?.rate_percent || 0);
  return price * (1 + taxPercent / 100);
};

export const calculateOrderEntry = (product, entry) => {
  const price = Number(product?.base_price || 0);
  const taxPercent = Number(product?.tax_percent || product?.rate_percent || 0);
  let quantity = Number(entry?.value || 0);
  if (entry?.captureMode === "amount" && price > 0) {
    const raw = quantity / price;
    quantity = isIntegerUnit(product?.unit)
      ? (entry?.orderMode === "sale_bonus" ? Math.max(Math.floor(raw), 1) : Math.floor(raw))
      : Math.floor(raw * 1000) / 1000;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { quantity: 0, commercialValue: 0, requestedValue: 0 };
  }
  const subtotal = quantity * price;
  const commercialValue = Math.round(subtotal * (1 + taxPercent / 100) * 100) / 100;
  const requestedValue = entry?.captureMode === "amount" ? Number(entry.value || 0) : commercialValue;
  return { quantity, commercialValue, requestedValue };
};

export const calculateSaleBonusOrder = ({ lines = [], bonusPercent, maxCompanyLoss = 0, enabled = true }) => {
  let remainingMargin = Math.max(Number(maxCompanyLoss || 0), 0);
  let generatedBonusValue = 0;
  let physicalBonusValue = 0;
  let marginUsed = 0;
  const allocations = lines.map((line) => {
    const commercialUnitPrice = getCommercialUnitPrice(line.product);
    const paidValue = Number(line.paidValue || 0);
    const generatedValue = enabled ? paidValue * (Number(bonusPercent || 0) / 100) : 0;
    generatedBonusValue += generatedValue;
    if (commercialUnitPrice <= 0 || generatedValue <= 0) {
      return { ...line, generatedValue, quantity: 0, commercialValue: 0, roundingDifference: 0 };
    }
    const availableValue = paidValue + generatedValue;
    const rawTotalQuantity = availableValue / commercialUnitPrice;
    let totalQuantity;
    let roundingDifference = 0;
    if (isIntegerUnit(line.product?.unit)) {
      totalQuantity = Math.floor(rawTotalQuantity);
      const upperQuantity = Math.ceil(rawTotalQuantity);
      const requiredDifference = Math.round((upperQuantity * commercialUnitPrice - availableValue) * 100) / 100;
      if (upperQuantity > totalQuantity && requiredDifference <= remainingMargin) {
        totalQuantity = upperQuantity;
        roundingDifference = requiredDifference;
        remainingMargin -= requiredDifference;
        marginUsed += requiredDifference;
      }
    } else {
      totalQuantity = Math.floor(rawTotalQuantity * 1000) / 1000;
    }
    const quantity = Math.max(totalQuantity - Number(line.saleQuantity || 0), 0);
    const commercialValue = Math.round(quantity * commercialUnitPrice * 100) / 100;
    physicalBonusValue += commercialValue;
    return { ...line, generatedValue, quantity, commercialValue, roundingDifference };
  });
  return { allocations, generatedBonusValue, physicalBonusValue, marginUsed };
};

export const calculateSaleBonus = (options) => calculateSaleBonusOrder({
  lines: [{ product: options.product, paidValue: options.paidValue, saleQuantity: options.saleQuantity }],
  bonusPercent: options.bonusPercent,
  maxCompanyLoss: options.maxCompanyLoss,
  enabled: options.enabled,
}).allocations[0];
