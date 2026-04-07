import { apiFetch } from '@/lib/api-client';

export interface EngineeringSpec {
  id: string;
  name: string;
  code: string;
  type: string;
  description?: string;
  active: boolean;
  revisionNo?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  changeType?: 'MANUAL' | 'ECO' | 'ECN';
  changeOrderNo?: string;
  siteCode?: string;
  isDefaultSite?: boolean;
  specData?: any;
  drillingData?: any;
  labelingData?: any;
  spokeLengthData?: any;
  hubData?: any;
  nippleData?: any;
  createdAt?: string;
  updatedAt?: string;
  _v: number;
}

export const engineeringSpecService = {
  getSpecs: async (type?: string): Promise<EngineeringSpec[]> => {
    const url = type ? `/engineering/specs?type=${type}` : '/engineering/specs';
    return apiFetch<EngineeringSpec[]>(url);
  },

  getSpec: async (id: string): Promise<EngineeringSpec> => {
    return apiFetch<EngineeringSpec>(`/engineering/specs/${id}`);
  },

  saveSpec: async (spec: EngineeringSpec): Promise<EngineeringSpec> => {
    return apiFetch<EngineeringSpec>('/engineering/specs', {
      method: 'POST',
      body: JSON.stringify(spec),
    });
  },

  patchSpec: async (id: string, delta: any, version: number): Promise<EngineeringSpec> => {
    return apiFetch<EngineeringSpec>(`/engineering/specs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ delta, version }),
    });
  },

  syncSpecs: async (specs: any[]): Promise<any> => {
    return apiFetch<any>('/engineering/specs/sync', {
      method: 'POST',
      body: JSON.stringify(specs),
    });
  },

  deleteSpec: async (id: string): Promise<void> => {
    return apiFetch<void>(`/engineering/specs/${id}`, {
      method: 'DELETE',
    });
  }
};
