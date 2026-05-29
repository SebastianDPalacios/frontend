import { GetEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class OrdersService {
  async getOrders(params = {}) {
    return GetEndpoint(endpoints.orders.list, { params });
  }

  async getBaseData(params = {}) {
    return GetEndpoint(endpoints.orders.baseData, { params });
  }

  async createOrder(payload) {
    return PostEndpoint(endpoints.orders.create, payload);
  }

  async getOrderItems(orderId) {
    return GetEndpoint(endpoints.orders.items(orderId));
  }

  async upsertItem(orderId, payload) {
    return PostEndpoint(endpoints.orders.upsertItem(orderId), payload);
  }

  async confirmOrder(orderId) {
    return PostEndpoint(endpoints.orders.confirm(orderId), {});
  }

  async cancelOrder(orderId, payload = {}) {
    return PostEndpoint(endpoints.orders.cancel(orderId), payload);
  }

  async dispatchOrder(orderId) {
    return PostEndpoint(endpoints.orders.dispatch(orderId), {});
  }

  async createProduction(orderId, payload = {}) {
    return PostEndpoint(endpoints.orders.createProduction(orderId), payload);
  }

  async receivePurchaseOrder(purchaseOrderId) {
    return PostEndpoint(endpoints.orders.receivePurchaseOrder(purchaseOrderId), {});
  }

  async getPendingPurchaseOrders(params = {}) {
    return GetEndpoint(endpoints.orders.pendingPurchaseOrders, { params });
  }

  async createPurchaseOrder(payload = {}) {
    return PostEndpoint(endpoints.orders.purchaseOrders, payload);
  }
}

const ordersService = new OrdersService();

export default ordersService;
