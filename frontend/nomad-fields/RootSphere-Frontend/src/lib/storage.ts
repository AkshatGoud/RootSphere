const FARMER_ID_KEY = 'nomad_einstein_farmer_id';
const LAST_FIELD_ID_KEY = 'nomad_einstein_last_field_id';

export const storage = {
  getFarmerId: (): string | null => {
    return localStorage.getItem(FARMER_ID_KEY);
  },

  setFarmerId: (id: string): void => {
    localStorage.setItem(FARMER_ID_KEY, id);
  },

  clearFarmerId: (): void => {
    localStorage.removeItem(FARMER_ID_KEY);
  },

  getLastFieldId: (): string | null => {
    return localStorage.getItem(LAST_FIELD_ID_KEY);
  },

  setLastFieldId: (id: string): void => {
    localStorage.setItem(LAST_FIELD_ID_KEY, id);
  },

  clearLastFieldId: (): void => {
    localStorage.removeItem(LAST_FIELD_ID_KEY);
  },

  clearAll: (): void => {
    localStorage.removeItem(FARMER_ID_KEY);
    localStorage.removeItem(LAST_FIELD_ID_KEY);
    localStorage.removeItem('access_token');
    localStorage.removeItem('farmer_name');
  },
};

/**
 * Centralized session writers. Use these instead of scattered
 * localStorage.setItem calls so the keys stay in one place.
 */
export const auth = {
  setSession({ token, name, id }: { token: string; name: string; id: string }) {
    localStorage.setItem('access_token', token);
    localStorage.setItem('farmer_name', name);
    storage.setFarmerId(id);
  },
  setName(name: string) {
    localStorage.setItem('farmer_name', name);
  },
};
