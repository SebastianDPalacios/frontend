import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import toast from "react-hot-toast";
import AppCard from "@core/components/ui/AppCard";
import SectionHeader from "components/atoms/SectionHeader";
import FlowPageLayout from "views/modules/FlowPageLayout";
import settingsService from "services/settings/settings-service";

const initialValues = {
  businessName: "PANADERIA",
  businessSubtitle: "",
  logoDataUrl: "",
  showLogo: false,
  showBranchName: true,
  showBranchContact: true,
  showSeller: true,
  showDeliveryDate: true,
  showSaleTotal: true,
  showBonusTotal: true,
  showGiftTotal: true,
  showExchangeTotal: true,
  customerTitle: "CLIENTE",
  showCustomerName: true,
  showCustomerIdentification: true,
  showCustomerAddress: true,
  showCustomerNeighborhood: true,
  showCustomerPhone: true,
  customerIdentificationLabel: "Identificacion",
  customerAddressLabel: "Direccion",
  customerNeighborhoodLabel: "Barrio/Zona",
  customerPhoneLabel: "Tel",
  detailTitle: "DETALLE SOLICITADO",
  showProductCategories: true,
  requestedLabel: "Solicitado",
  unitLabel: "UND",
  showItemDetail: true,
  policyTitle: "POLITICA DE CAMBIOS",
  policyText:
    "Se realizan cambios por producto vencido, con moho, mojado o mal moldeado. La vigencia es de 15 dias desde la entrega. El inconveniente debe reportarse como maximo dentro de los 2 dias siguientes al vencimiento y requiere autorizacion del vendedor.",
  footerText: "Gracias por su compra",
  fontScale: "normal",
  bodyFontSize: 12,
  headerFontSize: 24,
  customerFontSize: 20,
  customerContactFontSize: 16,
  customerIdentificationFontSize: 13,
  customerAddressFontSize: 16,
  customerNeighborhoodFontSize: 15,
  customerPhoneFontSize: 16,
  productFontSize: 13,
  quantityFontSize: 20,
  totalFontSize: 17,
  subtitleFontSize: 12,
  branchFontSize: 14,
  branchContactFontSize: 11,
  orderNumberFontSize: 18,
  orderDateFontSize: 12,
  deliveryDateFontSize: 12,
  sellerFontSize: 12,
  sectionTitleFontSize: 14,
  categoryFontSize: 12,
  typeFontSize: 10,
  productValueFontSize: 13,
  quantityLabelFontSize: 10,
  itemDetailFontSize: 11,
  summaryFontSize: 13,
  policyTitleFontSize: 11,
  policyTextFontSize: 10,
  footerFontSize: 11,
  showExtraLegend: false,
  extraLegendTitle: "LEYENDA ADICIONAL",
  extraLegendText: "",
  settlementPrint: {
    pageWidthMm: 80,
    pageMarginMm: 3,
    bodyWidthMm: 74,
    bodyFontSize: 10.5,
    titleFontSize: 20,
    metaFontSize: 12,
    customerFontSize: 11.5,
    mutedFontSize: 10,
    totalsFontSize: 11.5,
    deliverFontSize: 15,
    footerFontSize: 9,
  },
};

const fontScales = {
  normal: {
    bodyFontSize: 12,
    headerFontSize: 24,
    customerFontSize: 20,
    customerContactFontSize: 16,
    customerIdentificationFontSize: 13,
    customerAddressFontSize: 16,
    customerNeighborhoodFontSize: 15,
    customerPhoneFontSize: 16,
    productFontSize: 13,
    quantityFontSize: 20,
    totalFontSize: 17,
    subtitleFontSize: 12, branchFontSize: 14, branchContactFontSize: 11, orderNumberFontSize: 18,
    orderDateFontSize: 12, deliveryDateFontSize: 12, sellerFontSize: 12, sectionTitleFontSize: 14,
    categoryFontSize: 12, typeFontSize: 10, productValueFontSize: 13, quantityLabelFontSize: 10,
    itemDetailFontSize: 11, summaryFontSize: 13, policyTitleFontSize: 11, policyTextFontSize: 10, footerFontSize: 11,
  },
  large: {
    bodyFontSize: 13,
    headerFontSize: 27,
    customerFontSize: 23,
    customerContactFontSize: 18,
    customerIdentificationFontSize: 14,
    customerAddressFontSize: 18,
    customerNeighborhoodFontSize: 17,
    customerPhoneFontSize: 18,
    productFontSize: 14,
    quantityFontSize: 22,
    totalFontSize: 19,
    subtitleFontSize: 13, branchFontSize: 15, branchContactFontSize: 12, orderNumberFontSize: 20,
    orderDateFontSize: 13, deliveryDateFontSize: 13, sellerFontSize: 13, sectionTitleFontSize: 15,
    categoryFontSize: 13, typeFontSize: 11, productValueFontSize: 14, quantityLabelFontSize: 11,
    itemDetailFontSize: 12, summaryFontSize: 14, policyTitleFontSize: 12, policyTextFontSize: 11, footerFontSize: 12,
  },
  extra_large: {
    bodyFontSize: 14,
    headerFontSize: 29,
    customerFontSize: 25,
    customerContactFontSize: 19,
    customerIdentificationFontSize: 15,
    customerAddressFontSize: 20,
    customerNeighborhoodFontSize: 18,
    customerPhoneFontSize: 20,
    productFontSize: 15,
    quantityFontSize: 24,
    totalFontSize: 20,
    subtitleFontSize: 14, branchFontSize: 16, branchContactFontSize: 13, orderNumberFontSize: 22,
    orderDateFontSize: 14, deliveryDateFontSize: 14, sellerFontSize: 14, sectionTitleFontSize: 16,
    categoryFontSize: 14, typeFontSize: 12, productValueFontSize: 15, quantityLabelFontSize: 12,
    itemDetailFontSize: 13, summaryFontSize: 15, policyTitleFontSize: 13, policyTextFontSize: 12, footerFontSize: 13,
  },
};

const fieldGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    sm: "repeat(2, minmax(0, 1fr))",
  },
  gap: 2,
  width: "100%",
  minWidth: 0,
};

const threeFieldGridSx = {
  ...fieldGridSx,
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    sm: "repeat(2, minmax(0, 1fr))",
    md: "repeat(3, minmax(0, 1fr))",
  },
};

const fontSizeGroups = [
  {
    title: "Encabezado",
    description: "Marca, sucursal y datos iniciales.",
    fields: [
      ["headerFontSize", "Nombre del negocio", 18, 34],
      ["subtitleFontSize", "Subtitulo", 8, 24],
      ["branchFontSize", "Sucursal", 9, 26],
      ["branchContactFontSize", "Contacto sucursal", 8, 22],
      ["bodyFontSize", "Texto general", 10, 18],
    ],
  },
  {
    title: "Datos del pedido",
    description: "Numero, fechas, vendedor y rotulos.",
    fields: [
      ["orderNumberFontSize", "Numero de pedido", 12, 32],
      ["orderDateFontSize", "Fecha del pedido", 8, 22],
      ["deliveryDateFontSize", "Fecha de entrega", 8, 22],
      ["sellerFontSize", "Vendedor", 8, 22],
      ["sectionTitleFontSize", "Titulos de seccion", 9, 26],
    ],
  },
  {
    title: "Cliente",
    description: "Nombre y datos de contacto del cliente.",
    fields: [
      ["customerFontSize", "Nombre", 16, 30],
      ["customerContactFontSize", "Contacto general", 12, 24],
      ["customerIdentificationFontSize", "Identificacion", 10, 24],
      ["customerAddressFontSize", "Direccion", 12, 28],
      ["customerNeighborhoodFontSize", "Barrio/Zona", 12, 26],
      ["customerPhoneFontSize", "Telefono", 12, 28],
    ],
  },
  {
    title: "Detalle de productos",
    description: "Categoria, producto, tipo, cantidades y valores.",
    fields: [
      ["categoryFontSize", "Categoria", 8, 22],
      ["productFontSize", "Nombre producto", 11, 22],
      ["typeFontSize", "Tipo de movimiento", 7, 18],
      ["quantityFontSize", "Cantidad", 16, 34],
      ["quantityLabelFontSize", "Etiqueta UND", 7, 18],
      ["productValueFontSize", "Valor", 9, 24],
      ["itemDetailFontSize", "Detalle solicitado", 8, 20],
    ],
  },
  {
    title: "Resumen y cierre",
    description: "Totales, politica y mensaje final.",
    fields: [
      ["summaryFontSize", "Resumen de valores", 9, 24],
      ["totalFontSize", "Total a cobrar", 15, 30],
      ["policyTitleFontSize", "Titulo de politica", 8, 22],
      ["policyTextFontSize", "Texto de politica", 8, 20],
      ["footerFontSize", "Texto final", 8, 22],
    ],
  },
];

const previewItems = [
  { name: "PAN ROYAL 2.000", category: "PAN DE SAL", type: "VENTA CON VENDAJE INCLUIDO", qty: 5, value: "$ 10.500" },
  { name: "Mogicon 500", category: "PAN DE DULCE", type: "SOLO VENDAJE", qty: 1, value: "$ 5.251" },
];

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const numberOrFallback = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const EditorPanel = ({ title, subtitle, children }) => (
  <Box
    sx={{
      px: { xs: 2, sm: 3 },
      py: { xs: 2.25, sm: 3 },
      border: "1px solid",
      borderColor: "rgba(17, 24, 39, 0.08)",
      borderRadius: 3,
      bgcolor: "#fff",
      boxShadow: "0 12px 30px rgba(17, 24, 39, 0.04)",
      boxSizing: "border-box",
      minWidth: 0,
      "& .MuiFormControl-root": {
        minWidth: 0,
      },
      "& .MuiInputBase-root": {
        boxSizing: "border-box",
      },
    }}
  >
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 900, mb: 0.25 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Stack>
  </Box>
);

const PosTicketPreview = ({ values }) => {
  const preset = fontScales[values.fontScale] || fontScales.normal;
  const scale = {
    body: numberOrFallback(values.bodyFontSize, preset.bodyFontSize),
    title: numberOrFallback(values.headerFontSize, preset.headerFontSize),
    customer: numberOrFallback(values.customerFontSize, preset.customerFontSize),
    important: numberOrFallback(values.customerContactFontSize, preset.customerContactFontSize),
    identification: numberOrFallback(values.customerIdentificationFontSize, values.customerContactFontSize || 13),
    address: numberOrFallback(values.customerAddressFontSize, values.customerContactFontSize || 16),
    neighborhood: numberOrFallback(values.customerNeighborhoodFontSize, values.customerContactFontSize || 15),
    phone: numberOrFallback(values.customerPhoneFontSize, values.customerContactFontSize || 16),
    product: numberOrFallback(values.productFontSize, preset.productFontSize),
    quantity: numberOrFallback(values.quantityFontSize, preset.quantityFontSize),
    total: numberOrFallback(values.totalFontSize, preset.totalFontSize),
    subtitle: numberOrFallback(values.subtitleFontSize, preset.subtitleFontSize),
    branch: numberOrFallback(values.branchFontSize, preset.branchFontSize),
    branchContact: numberOrFallback(values.branchContactFontSize, preset.branchContactFontSize),
    orderNumber: numberOrFallback(values.orderNumberFontSize, preset.orderNumberFontSize),
    orderDate: numberOrFallback(values.orderDateFontSize, preset.orderDateFontSize),
    deliveryDate: numberOrFallback(values.deliveryDateFontSize, preset.deliveryDateFontSize),
    seller: numberOrFallback(values.sellerFontSize, preset.sellerFontSize),
    section: numberOrFallback(values.sectionTitleFontSize, preset.sectionTitleFontSize),
    category: numberOrFallback(values.categoryFontSize, preset.categoryFontSize),
    type: numberOrFallback(values.typeFontSize, preset.typeFontSize),
    productValue: numberOrFallback(values.productValueFontSize, preset.productValueFontSize),
    quantityLabel: numberOrFallback(values.quantityLabelFontSize, preset.quantityLabelFontSize),
    itemDetail: numberOrFallback(values.itemDetailFontSize, preset.itemDetailFontSize),
    summary: numberOrFallback(values.summaryFontSize, preset.summaryFontSize),
    policyTitle: numberOrFallback(values.policyTitleFontSize, preset.policyTitleFontSize),
    policyText: numberOrFallback(values.policyTextFontSize, preset.policyTextFontSize),
    footer: numberOrFallback(values.footerFontSize, preset.footerFontSize),
  };
  const groupedItems = useMemo(() => (
    previewItems.reduce((groups, item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
      return groups;
    }, {})
  ), []);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 360,
        mx: "auto",
        bgcolor: "#fff",
        color: "#111",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 14px 40px rgba(17, 24, 39, 0.12)",
        px: 2.5,
        py: 2,
        fontFamily: "Arial, sans-serif",
        fontSize: scale.body,
        lineHeight: 1.28,
      }}
    >
      {values.showLogo && values.logoDataUrl ? (
        <Box
          component="img"
          src={values.logoDataUrl}
          alt="Logo ticket"
          sx={{
            display: "block",
            maxWidth: 120,
            maxHeight: 80,
            objectFit: "contain",
            mx: "auto",
            mb: 0.75,
          }}
        />
      ) : null}

      <Typography sx={{ fontFamily: "Arial, sans-serif", fontWeight: 900, textAlign: "center", fontSize: scale.title, lineHeight: 1 }}>
        {values.businessName || "PANADERIA"}
      </Typography>
      {values.businessSubtitle ? (
        <Typography sx={{ fontFamily: "Arial, sans-serif", textAlign: "center", fontSize: scale.subtitle, fontWeight: 700, mt: 0.5 }}>
          {values.businessSubtitle}
        </Typography>
      ) : null}
      {values.showBranchName ? (
        <Typography sx={{ fontFamily: "Arial, sans-serif", textAlign: "center", fontSize: scale.branch, fontWeight: 900, mt: 0.5 }}>
          Branch 20260525202730
        </Typography>
      ) : null}
      {values.showBranchContact ? (
        <Typography sx={{ fontFamily: "Arial, sans-serif", textAlign: "center", fontSize: scale.branchContact, mt: 0.25 }}>
          Cra 11 No 1D-43 B/Diego de Ospina
          <br />
          Tel. 6088667316
        </Typography>
      ) : null}

      <Box sx={{ borderTop: "1px dashed #111", my: 1 }} />
      <Box sx={{ border: "1px solid #111", py: 0.75, textAlign: "center", fontSize: scale.orderNumber, fontWeight: 900 }}>
        PEDIDO #31
      </Box>
      <Box sx={{ borderTop: "1px dashed #111", my: 1 }} />

      <Stack spacing={0.25}>
        <span style={{ fontSize: scale.orderDate }}>Fecha: 2026-07-04 14:31:33</span>
        {values.showDeliveryDate ? <span style={{ fontSize: scale.deliveryDate }}>Entrega: 2026-07-04</span> : null}
        {values.showSeller ? <span style={{ fontSize: scale.seller }}>Vendedor: ventas</span> : null}
      </Stack>

      <Box sx={{ borderTop: "1px dashed #111", my: 1 }} />
      <Typography sx={{ fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: scale.section }}>
        {values.customerTitle || "CLIENTE"}
      </Typography>
      {values.showCustomerName ? (
        <Typography sx={{ fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: scale.customer, lineHeight: 1.05 }}>
          CARLOS MEN
        </Typography>
      ) : null}
      {values.showCustomerIdentification ? (
        <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: scale.identification }}>
          {values.customerIdentificationLabel || "Identificacion"}: 123456789
        </Typography>
      ) : null}
      {values.showCustomerAddress ? (
        <Typography sx={{ fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: scale.address }}>
          {values.customerAddressLabel || "Direccion"}: calle 10#10-10
        </Typography>
      ) : null}
      {values.showCustomerNeighborhood ? (
        <Typography sx={{ fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: scale.neighborhood }}>
          {values.customerNeighborhoodLabel || "Barrio/Zona"}: Sin barrio/zona
        </Typography>
      ) : null}
      {values.showCustomerPhone ? (
        <Typography sx={{ fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: scale.phone }}>
          {values.customerPhoneLabel || "Tel"}: 12345788
        </Typography>
      ) : null}

      <Box sx={{ borderTop: "1px dashed #111", my: 1 }} />
      <Typography sx={{ fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: scale.section }}>
        {values.detailTitle || "DETALLE SOLICITADO"}
      </Typography>

      {Object.entries(groupedItems).map(([category, items]) => (
        <Box key={category} sx={{ mt: values.showProductCategories ? 1 : 0 }}>
          {values.showProductCategories ? (
            <Box sx={{ border: "1px solid #111", bgcolor: "#eee", py: 0.5, textAlign: "center", fontSize: scale.category, fontWeight: 900 }}>
              {category}
            </Box>
          ) : null}
          {items.map((item) => (
            <Box key={`${item.category}-${item.name}-${item.type}`} sx={{ py: 1, borderBottom: "1px dashed #777" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 42px minmax(74px, auto)", alignItems: "center", gap: 0.6 }}>
                <Stack sx={{ minWidth: 0, alignItems: "flex-start", gap: 0.4 }}>
                  <Box component="strong" sx={{ fontSize: scale.product, overflowWrap: "anywhere" }}>{item.name}</Box>
                  <Box
                    component="span"
                    sx={{
                      maxWidth: "100%",
                      border: "1px solid #111",
                      borderRadius: "2px",
                      px: 0.5,
                      fontSize: scale.type,
                      fontWeight: 900,
                      lineHeight: 1.12,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.type}
                  </Box>
                </Stack>
                <Box sx={{ textAlign: "center", fontWeight: 900 }}>
                  <Box sx={{ fontSize: scale.quantity, lineHeight: 1 }}>{item.qty}</Box>
                  <Box sx={{ fontSize: scale.quantityLabel, lineHeight: 1 }}>{values.unitLabel || "UND"}</Box>
                </Box>
                <strong style={{ fontSize: scale.productValue, textAlign: "right" }}>{item.value}</strong>
              </Box>
              {values.showItemDetail ? (
                <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: scale.itemDetail }}>
                  {values.requestedLabel || "Solicitado"}: $ 10.000
                </Typography>
              ) : null}
            </Box>
          ))}
        </Box>
      ))}

      <Stack spacing={0.4} sx={{ mt: 1, fontSize: scale.summary }}>
        {[
          ["Venta", "$ 10.500", values.showSaleTotal],
          ["Vendaje", "$ 0", values.showBonusTotal],
          ["Obsequio", "$ 0", values.showGiftTotal],
          ["Cambio", "$ 0", values.showExchangeTotal],
        ].filter(([, , visible]) => visible).map(([label, value]) => (
          <Stack key={label} direction="row" sx={{ justifyContent: "space-between" }}>
            <span>{label}</span>
            <strong>{value}</strong>
          </Stack>
        ))}
        <Stack direction="row" sx={{ justifyContent: "space-between", borderTop: "2px solid #111", pt: 0.75, fontSize: scale.total, fontWeight: 900 }}>
          <span>TOTAL</span>
          <span>$ 10.500</span>
        </Stack>
      </Stack>

      <Box sx={{ borderTop: "1px dashed #111", my: 1 }} />
      <Box sx={{ border: "1px solid #111", p: 1, fontSize: scale.policyText }}>
        <strong style={{ display: "block", textAlign: "center", marginBottom: 4, fontSize: scale.policyTitle }}>
          {values.policyTitle || "POLITICA DE CAMBIOS"}
        </strong>
        {values.policyText || initialValues.policyText}
      </Box>
      {values.showExtraLegend && values.extraLegendText ? (
        <>
          <Box sx={{ borderTop: "1px dashed #111", my: 1 }} />
          <Box sx={{ border: "1px solid #111", p: 1, fontSize: scale.policyText }}>
            <strong style={{ display: "block", textAlign: "center", marginBottom: 4, fontSize: scale.policyTitle }}>
              {values.extraLegendTitle || "LEYENDA ADICIONAL"}
            </strong>
            {values.extraLegendText}
          </Box>
        </>
      ) : null}
      <Typography sx={{ fontFamily: "Arial, sans-serif", textAlign: "center", mt: 1, fontSize: scale.footer, fontWeight: 700 }}>
        {values.footerText || "Gracias por su compra"}
      </Typography>
    </Box>
  );
};

const PosTicketSettingsPage = () => {
  const fileInputRef = useRef(null);
  const [values, setValues] = useState(initialValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await settingsService.getPosTicketSettings();
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar la configuracion del ticket");
        return;
      }

      setValues({
        ...initialValues,
        ...(response.data || {}),
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar la configuracion"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === "fontScale") {
      setValues((current) => ({
        ...current,
        fontScale: value,
        ...(fontScales[value] || fontScales.normal),
      }));
      return;
    }
    updateValue(name, value);
  };

  const handleSwitchChange = (event) => {
    const { name, checked } = event.target;
    updateValue(name, checked);
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Usa una imagen PNG, JPG o WEBP");
      return;
    }

    if (file.size > 1500000) {
      toast.error("El logo no puede superar 1.5 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setValues((current) => ({
        ...current,
        logoDataUrl: String(reader.result || ""),
        showLogo: true,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!values.businessName.trim()) {
      toast.error("El nombre del negocio es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const response = await settingsService.updatePosTicketSettings(values);
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo guardar el ticket");
        return;
      }

      setValues({ ...initialValues, ...(response.data || {}) });
      toast.success("Ticket POS actualizado");
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Error de red al guardar el ticket"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FlowPageLayout
        title="Ticket POS"
        subtitle="Configura el comprobante que se imprime para cada pedido."
      >
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 280 }}>
          <CircularProgress color="secondary" />
        </Box>
      </FlowPageLayout>
    );
  }

  return (
    <FlowPageLayout
      title="Ticket POS"
      subtitle="Edita textos, logo y datos visibles del comprobante de pedido."
    >
      <AppCard
        variant="outlined"
        contentSx={{ p: { xs: 2.25, sm: 3 } }}
        sx={{
          mb: 3,
          borderColor: "rgba(219, 91, 39, 0.22)",
          background:
            "linear-gradient(135deg, rgba(219, 91, 39, 0.10), rgba(255,255,255,0.96) 46%, rgba(17,24,39,0.04))",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 900, mb: 0.75 }}>
              Editor visual del comprobante
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
              Ajusta el ticket con vista previa antes de imprimir: logo, textos, tamanos y leyendas sin tocar codigo.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {["80 mm", "Vista previa", "Texto editable"].map((label) => (
              <Box
                key={label}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "rgba(219, 91, 39, 0.25)",
                  color: "secondary.main",
                  fontWeight: 900,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Box>
            ))}
          </Stack>
        </Stack>
      </AppCard>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <AppCard
            variant="outlined"
            contentSx={{ p: { xs: 2, sm: 2.5 } }}
            sx={{ bgcolor: "#fbfafc", borderColor: "rgba(17, 24, 39, 0.10)" }}
          >
            <Stack component="form" spacing={3} onSubmit={handleSubmit}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}
              >
                <SectionHeader
                  title="Contenido del ticket"
                  subtitle="Los cambios se aplicaran a las proximas impresiones."
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  startIcon={<SaveRoundedIcon />}
                  disabled={saving || Boolean(error)}
                  sx={{ minWidth: 180 }}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </Stack>

              {error ? <Alert severity="error">{error}</Alert> : null}

              <EditorPanel
                title="Marca y encabezado"
                subtitle="Define lo primero que vera el cliente en el comprobante."
              >
                <Box
                  sx={{
                    ...fieldGridSx,
                    gridTemplateColumns: {
                      xs: "minmax(0, 1fr)",
                      sm: "minmax(0, 2fr) minmax(220px, 1fr)",
                    },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      name="businessName"
                      label="Nombre principal"
                      value={values.businessName}
                      onChange={handleInputChange}
                      fullWidth
                      required
                    />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      name="fontScale"
                      label="Preset de letra"
                      value={values.fontScale}
                      onChange={handleInputChange}
                      select
                      fullWidth
                    >
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="large">Grande</MenuItem>
                      <MenuItem value="extra_large">Muy grande</MenuItem>
                    </TextField>
                  </Box>
                  <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
                    <TextField
                      name="businessSubtitle"
                      label="Texto debajo del nombre"
                      value={values.businessSubtitle}
                      onChange={handleInputChange}
                      fullWidth
                      helperText="Opcional. Puede ser direccion, redes o un mensaje corto."
                    />
                  </Box>
                </Box>
              </EditorPanel>

              <EditorPanel
                title="Tamanos de letra"
                subtitle="Personaliza cada zona del comprobante. Todos los valores estan expresados en pixeles."
              >
                <Stack spacing={1.5}>
                  {fontSizeGroups.map((group) => (
                    <Box
                      key={group.title}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "rgba(17, 24, 39, 0.10)",
                        bgcolor: "rgba(248, 250, 252, 0.82)",
                      }}
                    >
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={0.5} sx={{ mb: 1.5, justifyContent: "space-between" }}>
                        <Typography sx={{ fontWeight: 900, color: "text.primary" }}>{group.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{group.description}</Typography>
                      </Stack>
                      <Box sx={threeFieldGridSx}>
                        {group.fields.map(([name, label, min, max]) => (
                          <TextField
                            key={name}
                            type="number"
                            size="small"
                            name={name}
                            label={label}
                            value={values[name]}
                            onChange={handleInputChange}
                            fullWidth
                            inputProps={{ min, max, step: 1 }}
                            helperText={`${min}–${max} px`}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </EditorPanel>

              <EditorPanel
                title="Imagen del ticket"
                subtitle="Carga un logo liviano para que la impresion siga siendo rapida."
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                  <Button
                    component="label"
                    variant="outlined"
                    color="secondary"
                    startIcon={<ImageRoundedIcon />}
                  >
                    Cargar logo
                    <input
                      ref={fileInputRef}
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                    />
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    disabled={!values.logoDataUrl}
                    onClick={() => {
                      updateValue("logoDataUrl", "");
                      updateValue("showLogo", false);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Quitar logo
                  </Button>
                </Stack>
                <FormControlLabel
                  control={<Switch name="showLogo" checked={Boolean(values.showLogo)} onChange={handleSwitchChange} />}
                  label="Mostrar logo en el comprobante"
                />
              </EditorPanel>

              <EditorPanel
                title="Datos visibles"
                subtitle="Oculta o muestra datos operativos segun lo que quieras imprimir."
              >
                <Box sx={fieldGridSx}>
                  {[
                    ["showBranchName", "Mostrar sucursal"],
                    ["showBranchContact", "Mostrar contacto de sucursal"],
                    ["showDeliveryDate", "Mostrar fecha de entrega"],
                    ["showSeller", "Mostrar vendedor"],
                    ["showProductCategories", "Mostrar categorias de productos"],
                  ].map(([name, label]) => (
                    <Box key={name} sx={{ minWidth: 0 }}>
                      <FormControlLabel
                        control={<Switch name={name} checked={Boolean(values[name])} onChange={handleSwitchChange} />}
                        label={label}
                      />
                    </Box>
                  ))}
                </Box>
              </EditorPanel>

              <EditorPanel
                title="Resumen de valores"
                subtitle="Elige que conceptos aparecen en el resumen final del ticket. El total a cobrar siempre permanece visible."
              >
                <Box sx={fieldGridSx}>
                  {[
                    ["showSaleTotal", "Mostrar venta"],
                    ["showBonusTotal", "Mostrar vendaje"],
                    ["showGiftTotal", "Mostrar obsequio"],
                    ["showExchangeTotal", "Mostrar cambio"],
                  ].map(([name, label]) => (
                    <Box key={name} sx={{ minWidth: 0 }}>
                      <FormControlLabel
                        control={<Switch name={name} checked={Boolean(values[name])} onChange={handleSwitchChange} />}
                        label={label}
                      />
                    </Box>
                  ))}
                </Box>
              </EditorPanel>


              <EditorPanel
                title="Bloque del cliente"
                subtitle="Parametriza que datos del cliente aparecen y como se llaman en el comprobante."
              >
                <Box sx={fieldGridSx}>
                  {[
                    ["showCustomerName", "Mostrar nombre del cliente"],
                    ["showCustomerIdentification", "Mostrar identificacion"],
                    ["showCustomerAddress", "Mostrar direccion"],
                    ["showCustomerNeighborhood", "Mostrar barrio/zona"],
                    ["showCustomerPhone", "Mostrar telefono"],
                  ].map(([name, label]) => (
                    <Box key={name} sx={{ minWidth: 0 }}>
                      <FormControlLabel
                        control={<Switch name={name} checked={Boolean(values[name])} onChange={handleSwitchChange} />}
                        label={label}
                      />
                    </Box>
                  ))}
                </Box>
                <Box sx={fieldGridSx}>
                  {[
                    ["customerIdentificationLabel", "Etiqueta identificacion", values.showCustomerIdentification],
                    ["customerAddressLabel", "Etiqueta direccion", values.showCustomerAddress],
                    ["customerNeighborhoodLabel", "Etiqueta barrio/zona", values.showCustomerNeighborhood],
                    ["customerPhoneLabel", "Etiqueta telefono", values.showCustomerPhone],
                  ].map(([name, label, enabled]) => (
                    <Box key={name} sx={{ minWidth: 0 }}>
                      <TextField
                        name={name}
                        label={label}
                        value={values[name]}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={!enabled}
                      />
                    </Box>
                  ))}
                </Box>
              </EditorPanel>
              <EditorPanel
                title="Textos del comprobante"
                subtitle="Edita todos los textos fijos del ticket, incluida la unidad y el valor solicitado."
              >
                <Box sx={fieldGridSx}>
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      name="customerTitle"
                      label="Titulo cliente"
                      value={values.customerTitle}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      name="detailTitle"
                      label="Titulo detalle"
                      value={values.detailTitle}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      name="requestedLabel"
                      label="Etiqueta del valor solicitado"
                      value={values.requestedLabel}
                      onChange={handleInputChange}
                      fullWidth
                      disabled={!values.showItemDetail}
                    />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      name="unitLabel"
                      label="Etiqueta de unidad"
                      value={values.unitLabel}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
                    <FormControlLabel
                      control={<Switch name="showItemDetail" checked={Boolean(values.showItemDetail)} onChange={handleSwitchChange} />}
                      label="Mostrar el valor solicitado debajo del producto"
                    />
                  </Box>
                  <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
                    <TextField
                      name="policyTitle"
                      label="Titulo politica"
                      value={values.policyTitle}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
                    <TextField
                      name="policyText"
                      label="Politica de cambios"
                      value={values.policyText}
                      onChange={handleInputChange}
                      minRows={4}
                      multiline
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
                    <TextField
                      name="footerText"
                      label="Texto final"
                      value={values.footerText}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Box>
                </Box>
              </EditorPanel>

              <EditorPanel
                title="Leyenda adicional"
                subtitle="Usala para horarios, recomendaciones, datos legales o mensajes especiales."
              >
                <FormControlLabel
                  control={<Switch name="showExtraLegend" checked={Boolean(values.showExtraLegend)} onChange={handleSwitchChange} />}
                  label="Mostrar leyenda adicional"
                />
                <Box
                  sx={{
                    ...fieldGridSx,
                    gridTemplateColumns: {
                      xs: "minmax(0, 1fr)",
                      sm: "minmax(220px, 0.8fr) minmax(0, 1.2fr)",
                    },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      name="extraLegendTitle"
                      label="Titulo de leyenda"
                      value={values.extraLegendTitle}
                      onChange={handleInputChange}
                      fullWidth
                      disabled={!values.showExtraLegend}
                    />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      name="extraLegendText"
                      label="Texto de leyenda"
                      value={values.extraLegendText}
                      onChange={handleInputChange}
                      minRows={3}
                      multiline
                      fullWidth
                      disabled={!values.showExtraLegend}
                    />
                  </Box>
                </Box>
              </EditorPanel>

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  startIcon={<SaveRoundedIcon />}
                  disabled={saving || Boolean(error)}
                  sx={{ minWidth: 190 }}
                >
                  {saving ? "Guardando..." : "Guardar ticket"}
                </Button>
              </Box>
            </Stack>
          </AppCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <AppCard
            variant="outlined"
            contentSx={{ p: { xs: 2, sm: 2.5 } }}
            sx={{
              position: { lg: "sticky" },
              top: { lg: 88 },
              bgcolor: "#111827",
              borderColor: "rgba(17, 24, 39, 0.18)",
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
                  Vista previa
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
                  Referencia visual. La impresion real conserva el ancho POS.
                </Typography>
              </Box>
              <Box
                sx={{
                  py: 2.5,
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <PosTicketPreview values={values} />
              </Box>
            </Stack>
          </AppCard>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default PosTicketSettingsPage;

