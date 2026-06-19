import { useCallback, useEffect, useState } from "react";
import { Alert, Grid } from "@mui/material";
import toast from "react-hot-toast";
import PendingPurchaseOrdersPanel from "components/organisms/inventory/PendingPurchaseOrdersPanel";
import PurchaseEntryIntro from "components/organisms/inventory/PurchaseEntryIntro";
import PurchaseInvoiceHistory from "components/organisms/inventory/PurchaseInvoiceHistory";
import PurchaseInvoiceDialog from "components/organisms/inventory/PurchaseInvoiceDialog";
import PurchaseMaterialsGrid from "components/organisms/inventory/PurchaseMaterialsGrid";
import QuickRawMaterialDialog from "components/organisms/inventory/QuickRawMaterialDialog";
import catalogService from "services/catalog/catalog-service";
import inventoryService from "services/inventory/inventory-service";
import ordersService from "services/orders/orders-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatNumber = (value, unit) => formatInventoryQuantity(value, unit);
const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const onlyPesos = (value) => String(value || "").replace(/\D/g, "");
const formatDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  return String(value).slice(0, 10);
};

const toBaseQuantity = (quantity, unit) => {
  const numericQuantity = Number(quantity || 0);
  if (numericQuantity <= 0) return null;
  if (unit === "kg" || unit === "l") return numericQuantity * 1000;
  return numericQuantity;
};

const getDefaultPackageName = (unit) => (unit === "ml" ? "Garrafa" : "Bulto");

const formatPackageQuantity = (quantity, unit) => {
  const amount = Number(quantity || 0);
  if (amount <= 0) return "";
  if (unit === "ml") {
    return amount >= 1000 ? `${Number((amount / 1000).toFixed(3)).toLocaleString("es-CO")} litros` : `${amount.toLocaleString("es-CO")} ml`;
  }
  return amount >= 1000 ? `${Number((amount / 1000).toFixed(3)).toLocaleString("es-CO")} kg` : `${amount.toLocaleString("es-CO")} g`;
};

const purchaseUnitOptions = {
  g: [
    { value: "kg", label: "Kilos" },
    { value: "g", label: "Gramos" },
  ],
  ml: [
    { value: "l", label: "Litros" },
    { value: "ml", label: "Mililitros" },
  ],
};

const emptyQuickMaterial = {
  name: "",
  description: "",
  categoryId: "",
  unit: "g",
  packageName: "Bulto",
  packageQuantity: "",
  packageUnit: "kg",
  minStock: "",
};

const MATERIALS_PER_PAGE = 9;

const basePurchaseUnitOptions = [
  { value: "kg", label: "Kilos", factor: 1000, baseUnit: "g" },
  { value: "g", label: "Gramos", factor: 1, baseUnit: "g" },
  { value: "l", label: "Litros", factor: 1000, baseUnit: "ml" },
  { value: "ml", label: "Mililitros", factor: 1, baseUnit: "ml" },
];

const getLineUnitOptions = (material) => {
  if (!material) return [];
  const baseUnit = material.unit === "ml" ? "ml" : "g";
  const options = basePurchaseUnitOptions.filter((option) => option.baseUnit === baseUnit);
  const packageName = String(material.purchase_package_name || "").trim();
  const packageQuantity = Number(material.purchase_package_quantity || 0);

  if (!packageName || packageQuantity <= 0) {
    return options;
  }

  return [
    {
      value: "package",
      label: `${packageName} (${formatPackageQuantity(packageQuantity, baseUnit)})`,
      factor: packageQuantity,
      baseUnit,
    },
    ...options,
  ];
};

const getLinePurchaseData = (item, material) => {
  const options = getLineUnitOptions(material);
  const option = options.find((unitOption) => unitOption.value === item.purchaseUnit) || options[0];
  const boughtQty = Number(item.quantity || 0);
  const totalCost = Number(onlyPesos(item.totalCost) || 0);
  const baseQuantity = option && boughtQty > 0 ? boughtQty * option.factor : 0;
  const unitCost = baseQuantity > 0 && totalCost > 0 ? totalCost / baseQuantity : 0;

  return {
    option,
    baseQuantity,
    unitCost,
    totalCost,
  };
};

const InventoryPurchaseOrdersPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [newOrder, setNewOrder] = useState({
    supplierId: "",
    invoiceNumber: "",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDate: "",
    notes: "",
  });
  const [newOrderItems, setNewOrderItems] = useState([{ rawMaterialId: "", quantity: "", purchaseUnit: "", totalCost: "" }]);
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [materialsPage, setMaterialsPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [quickMaterialOpen, setQuickMaterialOpen] = useState(false);
  const [quickMaterialIndex, setQuickMaterialIndex] = useState(null);
  const [quickMaterial, setQuickMaterial] = useState(emptyQuickMaterial);
  const [quickMaterialSaving, setQuickMaterialSaving] = useState(false);

  const totalMaterialsPages = Math.max(Math.ceil(materials.length / MATERIALS_PER_PAGE), 1);
  const currentMaterialsPage = Math.min(materialsPage, totalMaterialsPages);
  const visibleMaterials = materials.slice((currentMaterialsPage - 1) * MATERIALS_PER_PAGE, currentMaterialsPage * MATERIALS_PER_PAGE);
  const totalHistoryPages = Math.max(Math.ceil(historyTotal / MATERIALS_PER_PAGE), 1);
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [response, categoriesResponse] = await Promise.all([
          inventoryService.getBaseData({
            onlyActive: 1,
            page: 1,
            pageSize: 200,
            branchId: selectedBranch || undefined,
          }),
          catalogService.getRawMaterialCategories({ onlyActive: 1 }),
        ]);
        if (response?.code !== 1) {
          setError(response?.message || "No se pudieron cargar ordenes de compra");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        const supplierRows = normalizeRows(response.data?.suppliers);
        setBranches(branchRows);
        setSuppliers(supplierRows);
        setMaterials(normalizeRows(response.data?.raw_materials));
        setCategories(normalizeRows(categoriesResponse?.data));
        setSelectedBranch((current) => current || (response.data?.selected_branch_id ? String(response.data.selected_branch_id) : ""));
        setNewOrder((current) => ({
          ...current,
          supplierId: current.supplierId || (supplierRows[0]?.id ? String(supplierRows[0].id) : ""),
        }));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar ordenes de compra"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedBranch]);

  useEffect(() => {
    setMaterialsPage((current) => Math.min(current, Math.max(Math.ceil(materials.length / MATERIALS_PER_PAGE), 1)));
  }, [materials.length]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, selectedBranch]);

  const loadPurchaseHistory = useCallback(async (page = currentHistoryPage) => {
    if (!selectedBranch) {
      setInvoiceHistory([]);
      setHistoryTotal(0);
      return;
    }

    setHistoryLoading(true);
    try {
      const response = await ordersService.getPurchaseOrderHistory({
        branchId: selectedBranch,
        search: historySearch || undefined,
        page,
        pageSize: MATERIALS_PER_PAGE,
      });

      if (response?.code !== 1) {
        setInvoiceHistory([]);
        setHistoryTotal(0);
        setError(response?.message || "No se pudieron cargar las facturas recibidas");
        return;
      }

      setInvoiceHistory(normalizeRows(response.data));
      setHistoryTotal(Number(response.data?.total || 0));
    } catch (requestError) {
      setInvoiceHistory([]);
      setHistoryTotal(0);
      setError(getErrorMessage(requestError, "Error de red al cargar facturas recibidas"));
    } finally {
      setHistoryLoading(false);
    }
  }, [currentHistoryPage, historySearch, selectedBranch]);

  useEffect(() => {
    const run = async () => {
      if (!selectedBranch) {
        setPendingOrders([]);
        return;
      }

      setOrdersLoading(true);
      try {
        const response = await ordersService.getPendingPurchaseOrders({
          branchId: selectedBranch,
          search: orderSearch || undefined,
          page: 1,
          pageSize: 50,
        });

        if (response?.code !== 1) {
          setPendingOrders([]);
          setError(response?.message || "No se pudieron cargar ordenes pendientes");
          return;
        }

        const rows = normalizeRows(response.data);
        setPendingOrders(rows);
        setPurchaseOrderId((current) => (rows.some((order) => String(order.id) === String(current)) ? current : ""));
      } catch (requestError) {
        setPendingOrders([]);
        setError(getErrorMessage(requestError, "Error de red al cargar ordenes pendientes"));
      } finally {
        setOrdersLoading(false);
      }
    };

    run();
  }, [orderSearch, selectedBranch]);

  useEffect(() => {
    loadPurchaseHistory(currentHistoryPage);
  }, [currentHistoryPage, loadPurchaseHistory]);

  const selectedOrder = pendingOrders.find((order) => String(order.id) === String(purchaseOrderId));

  const openInvoiceDetail = async (invoice) => {
    if (!invoice?.id) {
      return;
    }

    setDetailDialogOpen(true);
    setDetailLoading(true);
    setSelectedInvoiceDetail({ order: invoice, items: [] });
    try {
      const response = await ordersService.getPurchaseOrderDetail(invoice.id);
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo abrir el detalle de la factura");
        return;
      }

      setSelectedInvoiceDetail(response.data);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Error de red al abrir la factura"));
    } finally {
      setDetailLoading(false);
    }
  };

  const onReceivePurchaseOrder = async () => {
    if (saving) {
      return;
    }

    setError(null);
    const parsedId = Number(purchaseOrderId);
    if (!parsedId || parsedId <= 0) {
      setError("Ingresa un nÃºmero de orden de compra vÃ¡lido");
      return;
    }

    setSaving(true);
    try {
      const result = await ordersService.receivePurchaseOrder(parsedId);
      if (result?.code !== 1) {
        setError(result?.message || "No se pudo recepcionar la orden de compra");
        return;
      }

      toast.success(result?.message || `Orden de compra ${parsedId} recepcionada`);
      setPurchaseOrderId("");
      const [pendingResponse, inventoryResponse, historyResponse] = await Promise.all([
        ordersService.getPendingPurchaseOrders({
          branchId: selectedBranch,
          search: orderSearch || undefined,
          page: 1,
          pageSize: 50,
        }),
        inventoryService.getBaseData({
          onlyActive: 1,
          page: 1,
          pageSize: 200,
          branchId: selectedBranch || undefined,
        }),
        ordersService.getPurchaseOrderHistory({
          branchId: selectedBranch,
          search: historySearch || undefined,
          page: currentHistoryPage,
          pageSize: MATERIALS_PER_PAGE,
        }),
      ]);
      if (pendingResponse?.code === 1) {
        setPendingOrders(normalizeRows(pendingResponse.data));
      }
      if (inventoryResponse?.code === 1) {
        setMaterials(normalizeRows(inventoryResponse.data?.raw_materials));
      }
      if (historyResponse?.code === 1) {
        setInvoiceHistory(normalizeRows(historyResponse.data));
        setHistoryTotal(Number(historyResponse.data?.total || 0));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al recepcionar orden de compra"));
    } finally {
      setSaving(false);
    }
  };

  const onUpdateNewOrderItem = (index, key, value) => {
    setNewOrderItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [key]: value };

        if (key === "rawMaterialId") {
          const material = materials.find((row) => String(row.id) === String(value));
          next.purchaseUnit = getLineUnitOptions(material)[0]?.value || "";
        }

        return next;
      })
    );
  };

  const onAddNewOrderItem = () => {
    setNewOrderItems((current) => [...current, { rawMaterialId: "", quantity: "", purchaseUnit: "", totalCost: "" }]);
  };

  const onRemoveNewOrderItem = (index) => {
    setNewOrderItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const onCreatePurchaseOrder = async () => {
    if (creating) {
      return;
    }

    setError(null);
    const items = newOrderItems
      .map((item) => {
        const material = materials.find((row) => String(row.id) === String(item.rawMaterialId));
        const purchaseData = getLinePurchaseData(item, material);

        return {
          raw_material_id: Number(item.rawMaterialId || 0),
          quantity: purchaseData.baseQuantity,
          unit_cost: purchaseData.unitCost,
          tax_percent: 0,
        };
      })
      .filter((item) => item.raw_material_id > 0 || item.quantity > 0 || item.unit_cost > 0);

    if (!selectedBranch) {
      setError("Selecciona una sucursal");
      return;
    }

    if (!newOrder.supplierId) {
      setError("Selecciona un proveedor");
      return;
    }

    if (!items.length || items.some((item) => !item.raw_material_id || item.quantity <= 0 || item.unit_cost <= 0)) {
      setError("Agrega productos comprados con cantidad y costo total mayor a 0");
      return;
    }

    setCreating(true);
    try {
      const result = await ordersService.createPurchaseOrder({
        p_branch_id: Number(selectedBranch),
        p_supplier_id: Number(newOrder.supplierId),
        p_invoice_number: newOrder.invoiceNumber.trim() || null,
        p_order_date: newOrder.orderDate || new Date().toISOString().slice(0, 10),
        p_expected_date: newOrder.expectedDate || null,
        p_notes: newOrder.notes || null,
        p_items_json: items,
      });

      if (result?.code !== 1) {
        setError(result?.message || "No se pudo crear la orden de compra");
        return;
      }

      const createdPurchaseOrderId = result.data?.purchase_order_id;
      if (createdPurchaseOrderId) {
        const receiveResult = await ordersService.receivePurchaseOrder(createdPurchaseOrderId);
        if (receiveResult?.code !== 1) {
          setError(receiveResult?.message || "La factura se guardo, pero no se pudo sumar el stock");
          setPurchaseOrderId(String(createdPurchaseOrderId));
          return;
        }
      }

      toast.success("Factura registrada y stock actualizado");
      setPurchaseOrderId("");
      setNewOrder((current) => ({
        ...current,
        invoiceNumber: "",
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDate: "",
        notes: "",
      }));
      setNewOrderItems([{ rawMaterialId: "", quantity: "", purchaseUnit: "", totalCost: "" }]);
      setCreateDialogOpen(false);
      const [pendingResponse, inventoryResponse, historyResponse] = await Promise.all([
        ordersService.getPendingPurchaseOrders({ branchId: selectedBranch, page: 1, pageSize: 50 }),
        inventoryService.getBaseData({
          onlyActive: 1,
          page: 1,
          pageSize: 200,
          branchId: selectedBranch || undefined,
        }),
        ordersService.getPurchaseOrderHistory({
          branchId: selectedBranch,
          search: historySearch || undefined,
          page: 1,
          pageSize: MATERIALS_PER_PAGE,
        }),
      ]);
      if (pendingResponse?.code === 1) {
        setPendingOrders(normalizeRows(pendingResponse.data));
      }
      if (inventoryResponse?.code === 1) {
        setMaterials(normalizeRows(inventoryResponse.data?.raw_materials));
      }
      if (historyResponse?.code === 1) {
        setHistoryPage(1);
        setInvoiceHistory(normalizeRows(historyResponse.data));
        setHistoryTotal(Number(historyResponse.data?.total || 0));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al crear orden de compra"));
    } finally {
      setCreating(false);
    }
  };

  const openQuickMaterialDialog = (index) => {
    setQuickMaterialIndex(index);
    setQuickMaterial(emptyQuickMaterial);
    setQuickMaterialOpen(true);
  };

  const updateQuickMaterial = (field) => (event) => {
    const value = event.target.value;
    setQuickMaterial((current) => {
      const next = { ...current, [field]: value };
      if (field === "unit") {
        next.packageName = current.packageName === getDefaultPackageName(current.unit) ? getDefaultPackageName(value) : current.packageName;
        next.packageUnit = value === "ml" ? "l" : "kg";
      }
      return next;
    });
  };

  const onCreateQuickMaterial = async () => {
    if (quickMaterialSaving) {
      return;
    }

    if (!quickMaterial.name.trim()) {
      toast.error("Escribe el nombre de la materia prima nueva");
      return;
    }

    if (!quickMaterial.categoryId) {
      toast.error("Selecciona la categoria de la materia prima nueva");
      return;
    }

    setQuickMaterialSaving(true);
    try {
      const result = await catalogService.createRawMaterial({
        p_name: quickMaterial.name.trim(),
        p_description: quickMaterial.description.trim() || null,
        p_category_id: Number(quickMaterial.categoryId),
        p_supplier_id: newOrder.supplierId ? Number(newOrder.supplierId) : null,
        p_unit: quickMaterial.unit,
        p_purchase_package_name: quickMaterial.packageName.trim() || getDefaultPackageName(quickMaterial.unit),
        p_purchase_package_quantity: toBaseQuantity(quickMaterial.packageQuantity, quickMaterial.packageUnit),
        p_unit_cost: 0,
        p_min_stock: quickMaterial.minStock ? Number(quickMaterial.minStock) : 0,
        p_is_active: 1,
      });

      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo crear la materia prima");
        return;
      }

      const rawMaterialId = result.data?.raw_material_id;
      const response = await inventoryService.getBaseData({
        onlyActive: 1,
        page: 1,
        pageSize: 200,
        branchId: selectedBranch || undefined,
      });

      if (response?.code === 1) {
        setMaterials(normalizeRows(response.data?.raw_materials));
      }

      if (rawMaterialId && quickMaterialIndex !== null) {
        onUpdateNewOrderItem(quickMaterialIndex, "rawMaterialId", String(rawMaterialId));
      }

      toast.success("Materia prima creada y seleccionada");
      setQuickMaterialOpen(false);
      setQuickMaterial(emptyQuickMaterial);
      setQuickMaterialIndex(null);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Error de red al crear la materia prima"));
    } finally {
      setQuickMaterialSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Inventario - Compras" subtitle="Registra facturas de proveedores y entradas de materia prima">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={5}>
          <PurchaseEntryIntro
            loading={loading}
            onOpenInvoice={() => setCreateDialogOpen(true)}
          />
        </Grid>

        <Grid item xs={12} md={7}>
          <PendingPurchaseOrdersPanel
            loading={loading}
            ordersLoading={ordersLoading}
            saving={saving}
            branches={branches}
            selectedBranch={selectedBranch}
            orderSearch={orderSearch}
            pendingOrders={pendingOrders}
            purchaseOrderId={purchaseOrderId}
            selectedOrder={selectedOrder}
            onOpenInvoice={() => setCreateDialogOpen(true)}
            onBranchChange={setSelectedBranch}
            onSearchChange={setOrderSearch}
            onSelectOrder={setPurchaseOrderId}
            onReceiveOrder={onReceivePurchaseOrder}
            getDisplayName={getDisplayName}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
          />
        </Grid>
      </Grid>

      <PurchaseMaterialsGrid
        loading={loading}
        materials={materials}
        visibleMaterials={visibleMaterials}
        currentPage={currentMaterialsPage}
        totalPages={totalMaterialsPages}
        pageSize={MATERIALS_PER_PAGE}
        onPreviousPage={() => setMaterialsPage((current) => Math.max(current - 1, 1))}
        onNextPage={() => setMaterialsPage((current) => Math.min(current + 1, totalMaterialsPages))}
        formatNumber={formatNumber}
        getDisplayName={getDisplayName}
      />

      <PurchaseInvoiceHistory
        historyTotal={historyTotal}
        historySearch={historySearch}
        onHistorySearchChange={setHistorySearch}
        historyLoading={historyLoading}
        invoices={invoiceHistory}
        onOpenInvoiceDetail={openInvoiceDetail}
        currentPage={currentHistoryPage}
        totalPages={totalHistoryPages}
        pageSize={MATERIALS_PER_PAGE}
        onPreviousPage={() => setHistoryPage((current) => Math.max(current - 1, 1))}
        onNextPage={() => setHistoryPage((current) => Math.min(current + 1, totalHistoryPages))}
        detailDialogOpen={detailDialogOpen}
        detailLoading={detailLoading}
        selectedInvoiceDetail={selectedInvoiceDetail}
        onCloseDetail={() => setDetailDialogOpen(false)}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        formatNumber={formatNumber}
      />
      <PurchaseInvoiceDialog
        open={createDialogOpen}
        creating={creating}
        loading={loading}
        suppliers={suppliers}
        materials={materials}
        newOrder={newOrder}
        newOrderItems={newOrderItems}
        onClose={() => setCreateDialogOpen(false)}
        onUpdateOrder={(changes) => setNewOrder((current) => ({ ...current, ...changes }))}
        onUpdateItem={onUpdateNewOrderItem}
        onAddItem={onAddNewOrderItem}
        onRemoveItem={onRemoveNewOrderItem}
        onCreate={onCreatePurchaseOrder}
        onOpenQuickMaterial={openQuickMaterialDialog}
        getDisplayName={getDisplayName}
        getLineUnitOptions={getLineUnitOptions}
        getLinePurchaseData={getLinePurchaseData}
        formatNumber={formatNumber}
      />

      <QuickRawMaterialDialog
        open={quickMaterialOpen}
        saving={quickMaterialSaving}
        quickMaterial={quickMaterial}
        categories={categories}
        purchaseUnitOptions={purchaseUnitOptions}
        onClose={() => setQuickMaterialOpen(false)}
        onUpdate={updateQuickMaterial}
        onCreate={onCreateQuickMaterial}
      />
    </FlowPageLayout>
  );
};

export default InventoryPurchaseOrdersPage;
