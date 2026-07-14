export type User = {
  id: number | string;
  name: string;
  email: string;
};

export type RoomOption = {
  id: string;
  title: string;
  occupancy: string;
  beds: string;
  rooms: string;
  baths: string;
  priceUsd: number;
  highlights: string[];
};

export type Property = {
  id: string;
  title: string;
  city: string;
  country: string;
  location: string;
  description: string;
  type: string;
  priceUsd: number;
  maxGuests: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  image: string;
  gallery: string[];
  amenities: string[];
  options: RoomOption[];
};

export type Reservation = {
  id: number;
  folio: string;
  property: string;
  guest_name: string;
  email: string;
  phone?: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  source?: string;
  created_at?: string;
};

export type Loyalty = {
  points: number;
  tier: string;
  bookings: number;
  nights: number;
  last_booking_at?: string | null;
};

export type UserProfile = {
  billing_name?: string;
  document_id?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postal_code?: string;
  preferred_payment?: string;
  cardholder_name?: string;
  card_last4?: string;
};

export type AccountSummary = {
  loyalty: Loyalty;
  reservations: {
    total: number;
    active: number;
    recent: Reservation[];
  };
  profile: UserProfile | null;
};

export type BookingInput = {
  property: string;
  title: string;
  name: string;
  email: string;
  phone: string;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  source: "app";
};

export type AuthResponse = {
  status: "success";
  token: string;
  expires_at: string;
  user: User;
};

export type ApiErrorShape = {
  status?: string;
  message?: string;
};
