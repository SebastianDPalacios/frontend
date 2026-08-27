import { GetEndpoint, PatchEndpoint, PostEndpoint, PutEndpoint } from "services/api/api-base";
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

  async getPackagingPackers(params = {}) {
    return GetEndpoint(endpoints.production.packagingPackers, { params });
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

  async getRawMaterialUsageByProductReport(params = {}) {
    return GetEndpoint(endpoints.production.rawMaterialUsageByProductReport, { params });
  }
  async getPlans(params = {}) {
    return GetEndpoint(endpoints.production.plans, { params });
  }

  async createPlan(payload) {
    return PostEndpoint(endpoints.production.plans, payload);
  }

  async updatePlan(planId, payload) {
    return PutEndpoint(endpoints.production.planById(planId), payload);
  }

  async getMyPlans(params = {}) {
    return GetEndpoint(endpoints.production.myPlans, { params });
  }

  async getMyProductionBaseData(params = {}) {
    return GetEndpoint(endpoints.production.myBaseData, { params });
  }

  async registerMyBatch(payload) {
    return PostEndpoint(endpoints.production.myBatches, payload);
  }

  async startPlanItem(productionPlanItemId) {
    return PostEndpoint(endpoints.production.startPlanItem(productionPlanItemId), {});
  }

  async finishPlanItem(productionPlanItemId, payload = {}) {
    return PostEndpoint(endpoints.production.finishPlanItem(productionPlanItemId), payload);
  }

  async startPlanProduct(productionPlanOutputId) {
    return PostEndpoint(endpoints.production.startPlanProduct(productionPlanOutputId), {});
  }

  async savePlanProductProgress(productionPlanOutputId, payload) {
    return PatchEndpoint(endpoints.production.planProductProgress(productionPlanOutputId), payload);
  }

  async skipPlanProduct(productionPlanOutputId, justification) {
    return PostEndpoint(endpoints.production.skipPlanProduct(productionPlanOutputId), { p_justification: justification });
  }

  async finishPlanProduct(productionPlanOutputId, payload) {
    return PostEndpoint(endpoints.production.finishPlanProduct(productionPlanOutputId), payload);
  }

  async correctPlanProduct(productionPlanOutputId, payload) {
    return PatchEndpoint(endpoints.production.correctPlanProduct(productionPlanOutputId), payload);
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

