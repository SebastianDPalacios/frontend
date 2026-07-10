import endpoints from "services/api";
import { GetEndpoint, PutEndpoint } from "services/api/api-base";

class SettingsService {
  getPosTicketSettings() {
    return GetEndpoint(endpoints.settings.posTicket);
  }

  updatePosTicketSettings(payload) {
    return PutEndpoint(endpoints.settings.posTicket, payload);
  }
}

const settingsService = new SettingsService();

export default settingsService;
