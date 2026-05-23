import { GetEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class OrdersService {
  async getBaseData(params = {}) {
    return GetEndpoint(endpoints.orders.baseData, { params });
  }

  async createOrder(payload) {
    return PostEndpoint(endpoints.orders.create, payload);
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

  async receivePurchaseOrder(purchaseOrderId) {
    return PostEndpoint(endpoints.orders.receivePurchaseOrder(purchaseOrderId), {});
  }
}

const ordersService = new OrdersService();

export default ordersService;
