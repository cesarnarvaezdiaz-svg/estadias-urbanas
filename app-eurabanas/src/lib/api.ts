import { AccountSummary, ApiErrorShape, AuthResponse, BookingInput, Property, Reservation, UserProfile } from "@/types";

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://www.estadiasurbanas.com").replace(/\/$/, "");

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

type RequestOptions = RequestInit & { token?: string | null };

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, "")}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError("El servidor respondió en un formato inesperado.", response.status);
  }

  if (!response.ok) {
    const error = (payload ?? {}) as ApiErrorShape;
    throw new ApiError(error.message || "No se pudo completar la solicitud.", response.status);
  }

  return payload as T;
}

export const api = {
  login(email: string, password: string) {
    return apiRequest<AuthResponse>("mobile_auth.php", {
      method: "POST",
      body: JSON.stringify({ action: "login", email, password, device_name: "Estadías Urbanas App" }),
    });
  },

  register(name: string, email: string, password: string, phone: string) {
    return apiRequest<AuthResponse>("mobile_auth.php", {
      method: "POST",
      body: JSON.stringify({ action: "register", name, email, password, phone, device_name: "Estadías Urbanas App" }),
    });
  },

  oauth(provider: "google" | "apple", data: Record<string, string>) {
    return apiRequest<AuthResponse>("mobile_auth.php", {
      method: "POST",
      body: JSON.stringify({ action: `oauth_${provider}`, ...data, device_name: "Estadías Urbanas App" }),
    });
  },

  me(token: string) {
    return apiRequest<{ status: "success"; user: AuthResponse["user"] }>("mobile_auth.php?action=me", { token });
  },

  logout(token: string) {
    return apiRequest<{ status: "success" }>("mobile_auth.php", {
      method: "POST",
      token,
      body: JSON.stringify({ action: "logout" }),
    });
  },

  async properties(): Promise<Property[]> {
    const result = await apiRequest<{ status: "success"; properties: Property[] }>("mobile_catalog.php");
    return result.properties;
  },

  account(token: string): Promise<AccountSummary> {
    return apiRequest<{ status: "success" } & AccountSummary>("mobile_account.php", { token });
  },

  async reservations(token: string): Promise<Reservation[]> {
    const result = await apiRequest<{ status: "success"; reservations: Reservation[] }>("mobile_reservations.php", { token });
    return result.reservations;
  },

  profile(token: string, profile: UserProfile) {
    return apiRequest<{ status: "success"; profile: UserProfile }>("mobile_profile.php", {
      method: "POST",
      token,
      body: JSON.stringify(profile),
    });
  },

  availability(input: Pick<BookingInput, "property" | "check_in" | "check_out" | "guests">) {
    return apiRequest<{ status: "success"; available: boolean; message: string }>("disponibilidad.php", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  createReservation(input: BookingInput) {
    return apiRequest<{ status: "success"; message: string; reservation_id: number; reservation_folio: string; hold_token: string }>(
      "procesar_reserva.php",
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  createPayment(input: BookingInput) {
    return apiRequest<{
      status: "success";
      id: string;
      hold_token: string;
      hold_expires_at: string;
      init_point: string;
      sandbox_init_point?: string | null;
    }>("mercadopago_preference.php", { method: "POST", body: JSON.stringify(input) });
  },
};
