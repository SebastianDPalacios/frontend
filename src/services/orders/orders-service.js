import { DeleteEndpoint, GetEndpoint, PostEndpoint, PutEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class OrdersService {
  async getOrders(params = {}) {
    return GetEndpoint(endpoints.orders.list, { params });
  }

  async getBaseData(params = {}) {
    return GetEndpoint(endpoints.orders.baseData, { params });
  }

  async getSalesSettings() {
    return GetEndpoint(endpoints.orders.salesSettings);
  }

  async updateSalesSettings(payload) {
    return PutEndpoint(endpoints.orders.salesSettings, payload);
  }

  async createOrder(payload) {
    return PostEndpoint(endpoints.orders.create, payload);
  }

  async getOrderItems(orderId) {
    return GetEndpoint(endpoints.orders.items(orderId));
  }

  async getOrderPrintData(orderId) {
    return GetEndpoint(endpoints.orders.printData(orderId));
  }

  async confirmOrderPrint(orderId) {
    return PostEndpoint(endpoints.orders.confirmPrint(orderId), {});
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

  async deliverOrder(orderId) {
    return PostEndpoint(endpoints.orders.deliver(orderId), {});
  }

  async updateDeliveryDate(orderId, payload) {
    return PutEndpoint(endpoints.orders.deliveryDate(orderId), payload);
  }

  async updateCustomer(orderId, customerId) {
    return PutEndpoint(endpoints.orders.customer(orderId), { customer_id: customerId });
  }

  async updateSeller(orderId, salesAgentUserId, customerId) {
    return PutEndpoint(endpoints.orders.seller(orderId), {
      sales_agent_user_id: salesAgentUserId,
      customer_id: customerId,
    });
  }

  async getSalesCommissions(params = {}) {
    return GetEndpoint(endpoints.orders.commissions, { params });
  }

  async getDailySettlement(params = {}) {
    return GetEndpoint(endpoints.orders.dailySettlement, { params });
  }

  async getSalesGifts(params = {}) {
    return GetEndpoint(endpoints.orders.gifts, { params });
  }

  async createSalesGift(payload) {
    return PostEndpoint(endpoints.orders.gifts, payload);
  }

  async getCustomerCredit(customerId) {
    return GetEndpoint(endpoints.orders.customerCredit(customerId));
  }

  async getSellerCustomerAssignments() {
    return GetEndpoint(endpoints.orders.sellerCustomerAssignments);
  }

  async assignCustomerToSeller(customerId, salesAgentUserId) {
    return PutEndpoint(endpoints.orders.sellerCustomerAssignment(customerId), {
      sales_agent_user_id: salesAgentUserId,
    });
  }

  async syncSellerCustomers(sellerId, customerIds) {
    return PutEndpoint(endpoints.orders.sellerCustomerPortfolio(sellerId), {
      customer_ids: customerIds,
    });
  }

  async unassignCustomerFromSeller(customerId) {
    return DeleteEndpoint(endpoints.orders.sellerCustomerAssignment(customerId));
  }

  async getSalesReturns(params = {}) {
    return GetEndpoint(endpoints.orders.returns, { params });
  }

  async getSalesReturnOptions() {
    return GetEndpoint(endpoints.orders.returnOptions);
  }

  async createSalesReturn(payload) {
    return PostEndpoint(endpoints.orders.returns, payload);
  }

  async authorizeSalesReturn(salesReturnId) {
    return PostEndpoint(endpoints.orders.authorizeReturn(salesReturnId), {});
  }

  async rejectSalesReturn(salesReturnId, reason) {
    return PostEndpoint(endpoints.orders.rejectReturn(salesReturnId), { reason });
  }

  async createProduction(orderId, payload = {}) {
    return PostEndpoint(endpoints.orders.createProduction(orderId), payload);
  }

  async getProductionReservations(orderId) {
    return GetEndpoint(endpoints.orders.productionReservations(orderId));
  }

  async getProductionReservationOptions(orderId) {
    return GetEndpoint(endpoints.orders.productionReservationOptions(orderId));
  }

  async createProductionReservation(orderId, payload) {
    return PostEndpoint(endpoints.orders.productionReservations(orderId), payload);
  }

  async deliverProductionReservation(reservationId) {
    return PostEndpoint(endpoints.orders.deliverProductionReservation(reservationId), {});
  }

  async releaseProductionReservation(reservationId) {
    return PostEndpoint(endpoints.orders.releaseProductionReservation(reservationId), {});
  }

  async receivePurchaseOrder(purchaseOrderId) {
    return PostEndpoint(endpoints.orders.receivePurchaseOrder(purchaseOrderId), {});
  }

  async getPendingPurchaseOrders(params = {}) {
    return GetEndpoint(endpoints.orders.pendingPurchaseOrders, { params });
  }

  async getPurchaseOrderHistory(params = {}) {
    return GetEndpoint(endpoints.orders.purchaseOrderHistory, { params });
  }

  async getPurchaseOrderDetail(purchaseOrderId) {
    return GetEndpoint(endpoints.orders.purchaseOrderDetail(purchaseOrderId));
  }

  async createPurchaseOrder(payload = {}) {
    return PostEndpoint(endpoints.orders.purchaseOrders, payload);
  }
}

const ordersService = new OrdersService();

export default ordersService;




