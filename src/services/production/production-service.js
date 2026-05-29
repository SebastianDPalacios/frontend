import { GetEndpoint, PatchEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class ProductionService {
  async getOrders(params = {}) {
    return GetEndpoint(endpoints.production.orders, { params });
  }

  async createOrder(payload) {
    return PostEndpoint(endpoints.production.orders, payload);
  }

  async getOrderItems(orderId) {
    return GetEndpoint(endpoints.production.orderItems(orderId));
  }

  async addOrderItem(orderId, payload) {
    return PostEndpoint(endpoints.production.orderItems(orderId), payload);
  }

  async registerOrderItemResult(orderId, itemId, payload) {
    return PostEndpoint(endpoints.production.orderItemResults(orderId, itemId), payload);
  }

  async updateOrderItemPlan(orderId, itemId, payload) {
    return PatchEndpoint(endpoints.production.orderItem(orderId, itemId), payload);
  }

  async cancelOrderItem(orderId, itemId, payload = {}) {
    return PostEndpoint(endpoints.production.cancelOrderItem(orderId, itemId), payload);
  }

  async getBaseData(params = {}) {
    return GetEndpoint(endpoints.production.baseData, { params });
  }

  async registerResult(payload) {
    return PostEndpoint(endpoints.production.results, payload);
  }

  async closeOrder(productionOrderId) {
    return PostEndpoint(endpoints.production.closeOrder(productionOrderId), {});
  }

  async cancelOrder(productionOrderId, payload = {}) {
    return PostEndpoint(endpoints.production.cancelOrder(productionOrderId), payload);
  }
}

const productionService = new ProductionService();

export default productionService;
