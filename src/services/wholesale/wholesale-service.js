import { GetEndpoint, PostEndpoint, PutEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class WholesaleService {
  getConfiguration() {
    return GetEndpoint(endpoints.wholesale.configuration);
  }

  getHistory(params = {}) {
    return GetEndpoint(endpoints.wholesale.history, { params });
  }

  createPriceList(payload) {
    return PostEndpoint(endpoints.wholesale.priceLists, payload);
  }

  updatePriceList(id, payload) {
    return PutEndpoint(endpoints.wholesale.priceList(id), payload);
  }

  setCustomer(id, payload) {
    return PutEndpoint(endpoints.wholesale.customer(id), payload);
  }

  createPrice(payload) {
    return PostEndpoint(endpoints.wholesale.prices, payload);
  }

  updatePrice(id, payload) {
    return PutEndpoint(endpoints.wholesale.price(id), payload);
  }

  deactivatePrice(id, reason) {
    return PostEndpoint(endpoints.wholesale.deactivatePrice(id), { reason });
  }

  getDuplicateProductsAudit() {
    return GetEndpoint(endpoints.wholesale.duplicateProductsAudit);
  }

  approveProductEquivalence(payload) {
    return PostEndpoint(endpoints.wholesale.approveProductEquivalence, payload);
  }
}

const wholesaleService = new WholesaleService();

export default wholesaleService;
