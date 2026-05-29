import { GetEndpoint, PatchEndpoint, PostEndpoint, PutEndpoint } from "services/api/api-base";
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

  async createRawMaterial(payload = {}) {
    return PostEndpoint(endpoints.catalog.rawMaterials, payload);
  }

  async getTaxRates(params = {}) {
    return GetEndpoint(endpoints.catalog.taxRates, { params });
  }

  async getProductCategories(params = {}) {
    return GetEndpoint(endpoints.catalog.productCategories, { params });
  }

  async getRawMaterialCategories(params = {}) {
    return GetEndpoint(endpoints.catalog.rawMaterialCategories, { params });
  }

  async getSuppliers(params = {}) {
    return GetEndpoint(endpoints.catalog.suppliers, { params });
  }

  async createProduct(payload = {}) {
    return PostEndpoint(endpoints.catalog.products, payload);
  }

  async createTaxRate(payload = {}) {
    return PostEndpoint(endpoints.catalog.taxRates, payload);
  }

  async createProductCategory(payload = {}) {
    return PostEndpoint(endpoints.catalog.productCategories, payload);
  }

  async createRawMaterialCategory(payload = {}) {
    return PostEndpoint(endpoints.catalog.rawMaterialCategories, payload);
  }

  async createSupplier(payload = {}) {
    return PostEndpoint(endpoints.catalog.suppliers, payload);
  }

  async createCustomer(payload = {}) {
    return PostEndpoint(endpoints.commercial.customers, payload);
  }

  async updateCustomer(id, payload = {}) {
    return PutEndpoint(endpoints.commercial.customerById(id), payload);
  }

  async setCustomerStatus(id, payload = {}) {
    return PatchEndpoint(endpoints.commercial.customerStatus(id), payload);
  }

  async createRoute(payload = {}) {
    return PostEndpoint(endpoints.commercial.routes, payload);
  }

  async updateRoute(id, payload = {}) {
    return PutEndpoint(endpoints.commercial.routeById(id), payload);
  }

  async setRouteStatus(id, payload = {}) {
    return PatchEndpoint(endpoints.commercial.routeStatus(id), payload);
  }

  async assignRouteDriver(routeId, payload = {}) {
    return PostEndpoint(endpoints.commercial.assignRouteDriver(routeId), payload);
  }
}

const catalogService = new CatalogService();

export default catalogService;
