import { BACKEND_URL } from "./backend";

export type Location = {
  id: string;
  name: string;
  description: string | null;
  type: "SHELTER" | "CLINIC" | "FOSTER";
  ownerId: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

export type ListLocationsParams = {
  type?: string;
  ownerId?: string;
  status?: string;
  skip?: number;
  limit?: number;
};

export type ListLocationsResponse = {
  data: Location[];
  total: number;
  skip: number;
  limit: number;
};

export type CatSex = "FEMALE" | "MALE" | "UNKNOWN";
export type CatStatus = "ACTIVE" | "ADOPTED" | "DECEASED" | "ARCHIVED";
export type SterilizationStatus = "STERILIZED" | "NOT_STERILIZED" | "UNKNOWN";

export type CatCard = {
  id: string;
  name: string;
  sex: CatSex;
  color: string | null;
  estimatedBirthDate: string | null;
  intakeDate: string | null;
  status: CatStatus;
  sterilizationStatus: SterilizationStatus;
  currentLocationId: string | null;
  currentLocationName: string | null;
  primaryPhotoUrl: string | null;
  microchipNumber: string | null;
  updatedAt: string;
};

export type ListCatsParams = {
  locationId?: string;
  status?: CatStatus;
  search?: string;
  skip?: number;
  limit?: number;
};

export type ListCatsResponse = {
  data: CatCard[];
  total: number;
  skip: number;
  limit: number;
};

export type CreateCatDto = {
  name: string;
  sex: CatSex;
  color?: string | null;
  estimatedBirthDate?: string | null;
  intakeDate?: string | null;
  rescueSource?: string | null;
  microchipNumber?: string | null;
  passportNumber?: string | null;
  sterilizationStatus: SterilizationStatus;
  currentLocationId?: string | null;
};

export type CreateLocationDto = {
  name: string;
  type: "SHELTER" | "CLINIC" | "FOSTER";
  description?: string;
  ownerId?: string;
};

export type UpdateLocationDto = {
  name?: string;
  description?: string | null;
  ownerId?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
};

export type ApiError = {
  message: string;
  statusCode: number;
  error?: string;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json()) as ApiError;
    throw {
      message: error.message || "An error occurred",
      statusCode: response.status,
      error: error.error,
    } as ApiError;
  }
  return (await response.json()) as T;
}

export const locationsApi = {
  async listLocations(params?: ListLocationsParams): Promise<ListLocationsResponse> {
    const query = new URLSearchParams();
    if (params?.type) query.append("type", params.type);
    if (params?.ownerId) query.append("ownerId", params.ownerId);
    if (params?.status) query.append("status", params.status);
    if (params?.skip !== undefined) query.append("skip", params.skip.toString());
    if (params?.limit !== undefined) query.append("limit", params.limit.toString());

    const url = query.toString()
      ? `${BACKEND_URL}/api/locations?${query.toString()}`
      : `${BACKEND_URL}/api/locations`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<ListLocationsResponse>(response);
  },

  async getLocation(id: string): Promise<Location> {
    const response = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<Location>(response);
  },

  async createLocation(data: CreateLocationDto): Promise<Location> {
    const response = await fetch(`${BACKEND_URL}/api/locations`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Location>(response);
  },

  async updateLocation(id: string, data: UpdateLocationDto): Promise<Location> {
    const response = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Location>(response);
  },

  async archiveLocation(id: string): Promise<Location> {
    const response = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<Location>(response);
  },
};

export const catsApi = {
  async listCats(params?: ListCatsParams): Promise<ListCatsResponse> {
    const query = new URLSearchParams();
    if (params?.locationId) query.append("locationId", params.locationId);
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    if (params?.skip !== undefined) query.append("skip", params.skip.toString());
    if (params?.limit !== undefined) query.append("limit", params.limit.toString());

    const url = query.toString()
      ? `${BACKEND_URL}/api/cats?${query.toString()}`
      : `${BACKEND_URL}/api/cats`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<ListCatsResponse>(response);
  },

  async getCatCard(id: string): Promise<CatCard> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/card`, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<CatCard>(response);
  },

  async createCat(data: CreateCatDto): Promise<CatCard> {
    const response = await fetch(`${BACKEND_URL}/api/cats`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CatCard>(response);
  },
};
