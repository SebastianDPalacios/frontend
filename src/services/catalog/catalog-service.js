import { GetEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class CatalogService {
  async getBranches(params = {}) {
    return GetEndpoint(endpoints.catalog.branches, { params });
  }

  async getCustomers(params = {}) {
    return GetEndpoint(endpoints.catalog.customers, { params });
  }

  async getRoutes(params = {}) {
    return GetEndpoint(endpoints.catalog.routes, { params });
  }

  async getProducts(params = {}) {
    return GetEndpoint(endpoints.catalog.products, { params });
  }

  async getRawMaterials(params = {}) {
    return GetEndpoint(endpoints.catalog.rawMaterials, { params });
  }
}

const catalogService = new CatalogService();

export default catalogService;
