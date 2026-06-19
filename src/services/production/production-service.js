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

  async registerBatch(payload) {
    return PostEndpoint(endpoints.production.batches, payload);
  }

  async getPendingPackaging(params = {}) {
    return GetEndpoint(endpoints.production.pendingPackaging, { params });
  }

  async createPackingReport(payload) {
    return PostEndpoint(endpoints.production.packingReports, payload);
  }

  async getJustifiedShortages(params = {}) {
    return GetEndpoint(endpoints.production.justifiedShortages, { params });
  }

  async getDayReport(params = {}) {
    return GetEndpoint(endpoints.production.dayReport, { params });
  }

  async getMonthReport(params = {}) {
    return GetEndpoint(endpoints.production.monthReport, { params });
  }

  async getPlans(params = {}) {
    return GetEndpoint(endpoints.production.plans, { params });
  }

  async createPlan(payload) {
    return PostEndpoint(endpoints.production.plans, payload);
  }

  async getMyPlans(params = {}) {
    return GetEndpoint(endpoints.production.myPlans, { params });
  }

  async startPlanItem(productionPlanItemId) {
    return PostEndpoint(endpoints.production.startPlanItem(productionPlanItemId), {});
  }

  async finishPlanItem(productionPlanItemId) {
    return PostEndpoint(endpoints.production.finishPlanItem(productionPlanItemId), {});
  }

  async getNotifications(params = {}) {
    return GetEndpoint(endpoints.production.notifications, { params });
  }

  async markNotificationViewed(notificationId) {
    return PatchEndpoint(endpoints.production.notificationViewed(notificationId), {});
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
