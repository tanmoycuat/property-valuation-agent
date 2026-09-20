/** Typed client for the FastAPI backend. Field names mirror the server. */

export type Condition = "needs-work" | "fair" | "good" | "excellent";

export const PROPERTY_TYPES = [
  "Detached house",
  "Semi-detached house",
  "Terraced house",
  "Apartment",
  "Site / land",
] as const;

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "needs-work", label: "Needs work" },
];

export interface PropertyLookup {
  displayName: string;
  latitude: number;
  longitude: number;
  source: string;
  context: { city?: string | null; country?: string | null };
}

export interface ValuationRequest {
  propertyType: string;
  areaSqm: number;
  bedrooms: number;
  condition: Condition;
  locationScore: number;
  latitude?: number;
  longitude?: number;
}

export interface BreakdownItem {
  label: string;
  value: number;
  detail: string;
}

export interface Valuation {
  estimatedValue: number;
  lowValue: number;
  highValue: number;
  currency: string;
  pricePerSqm: number;
  confidence: number;
  breakdown: BreakdownItem[];
  methodology: string[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  instruction: string;
  enabled: boolean;
  category: string;
}

export type SkillDraft = Omit<Skill, "id">;

export interface AssistantReply {
  message: string;
  configured: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(String(response.status));
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  lookupProperty: (query: string) =>
    request<PropertyLookup>(`/api/properties/lookup?query=${encodeURIComponent(query)}`),
  createValuation: (body: ValuationRequest) =>
    request<Valuation>("/api/valuations", { method: "POST", body: JSON.stringify(body) }),
  listSkills: () => request<Skill[]>("/api/skills"),
  createSkill: (body: SkillDraft) =>
    request<Skill>("/api/skills", { method: "POST", body: JSON.stringify(body) }),
  updateSkill: (id: string, body: Partial<SkillDraft>) =>
    request<Skill>(`/api/skills/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSkill: (id: string) => request<void>(`/api/skills/${id}`, { method: "DELETE" }),
  askAssistant: (body: { prompt: string; context: string | null }) =>
    request<AssistantReply>("/api/assistant/respond", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

/** The server prices in SEK; format with the currency it actually returned. */
export function formatCurrency(value: number, currency = "SEK") {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
