import { BACKEND_URL } from "./backend";

export type Location = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string | null;
  isTest: boolean;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

export type ListLocationsParams = {
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
  createdByUserId: string | null;
  isTest: boolean;
  primaryPhotoUrl: string | null;
  microchipNumber: string | null;
  updatedAt: string;
  tags: CatTag[];
};

export type CatTag = {
  id: string;
  name: string;
  color: string;
};

export type CatWeight = {
  id: string;
  catId: string;
  weightKg: number;
  measuredAt: string;
  createdAt: string;
};

export type CatPhoto = {
  id: string;
  catId: string;
  url: string | null;
  isPrimary: boolean;
  createdAt: string;
};

export type CatHistoryEvent = {
  id: string;
  catId: string;
  eventType: string;
  occurredAt: string;
  actor: {
    id: string;
    displayName: string;
    email: string;
  };
  oldValue: string | null;
  newValue: string | null;
  photo: {
    id: string;
    link: string | null;
    status: "ACTIVE" | "DELETED";
  } | null;
};

export type CatHistoryResponse = {
  data: CatHistoryEvent[];
  total: number;
  skip: number;
  limit: number;
};

export type ListCatsParams = {
  locationId?: string;
  status?: CatStatus;
  search?: string;
  tagId?: string;
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

export type UpdateCatDto = Partial<CreateCatDto> & {
  status?: CatStatus;
};

export type CreateLocationDto = {
  name: string;
  description?: string;
  ownerId?: string;
};

export type UpdateLocationDto = {
  name?: string;
  description?: string | null;
  ownerId?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
};

export type ApiError = {
  message: string;
  statusCode: number;
  error?: string;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && typeof window !== "undefined") {
      const nextPath = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?next=${encodeURIComponent(nextPath)}`);
    }

    const error = (await response.json()) as ApiError;
    throw {
      message: error.message || "An error occurred",
      statusCode: response.status,
      error: error.error,
    } as ApiError;
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const locationsApi = {
  async listLocations(params?: ListLocationsParams): Promise<ListLocationsResponse> {
    const query = new URLSearchParams();
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

  async archiveLocation(id: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<void>(response);
  },
};

export const catsApi = {
  async listCats(params?: ListCatsParams): Promise<ListCatsResponse> {
    const query = new URLSearchParams();
    if (params?.locationId) query.append("locationId", params.locationId);
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    if (params?.tagId) query.append("tagId", params.tagId);
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

  async listHistory(id: string): Promise<CatHistoryResponse> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/history`, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<CatHistoryResponse>(response);
  },

  async listTags(): Promise<CatTag[]> {
    const response = await fetch(`${BACKEND_URL}/api/cats/tags`, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<CatTag[]>(response);
  },

  async createTag(name: string, color?: string): Promise<CatTag> {
    const response = await fetch(`${BACKEND_URL}/api/cats/tags`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, color }),
    });
    return handleResponse<CatTag>(response);
  },

  async updateTag(id: string, data: { name?: string; color?: string }): Promise<CatTag> {
    const response = await fetch(`${BACKEND_URL}/api/cats/tags/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CatTag>(response);
  },

  async deleteTag(id: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/cats/tags/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<void>(response);
  },

  async addTag(id: string, tagId: string): Promise<CatCard> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/tags/${tagId}`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse<CatCard>(response);
  },

  async removeTag(id: string, tagId: string): Promise<CatCard> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/tags/${tagId}`, {
      method: "DELETE",
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

  async updateCat(id: string, data: UpdateCatDto): Promise<CatCard> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CatCard>(response);
  },

  async updatePrimaryPhoto(id: string, photo: File): Promise<CatCard> {
    const formData = new FormData();
    formData.append("photo", photo);

    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/primary-photo`, {
      method: "PUT",
      credentials: "include",
      body: formData,
    });
    return handleResponse<CatCard>(response);
  },

  async listPhotos(id: string): Promise<CatPhoto[]> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/photos`, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<CatPhoto[]>(response);
  },

  async addPhoto(id: string, photo: File): Promise<CatPhoto> {
    const formData = new FormData();
    formData.append("photo", photo);

    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/photos`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    return handleResponse<CatPhoto>(response);
  },

  async setPrimaryPhoto(id: string, photoId: string): Promise<CatCard> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/photos/${photoId}/primary`, {
      method: "PUT",
      credentials: "include",
    });
    return handleResponse<CatCard>(response);
  },

  async deletePhoto(id: string, photoId: string): Promise<CatCard> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/photos/${photoId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<CatCard>(response);
  },

  async listWeights(id: string): Promise<CatWeight[]> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/weights`, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<CatWeight[]>(response);
  },

  async addWeight(id: string, data: { weightKg: number; measuredAt: string }): Promise<CatWeight> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/weights`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CatWeight>(response);
  },

  async removeWeight(id: string, weightId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/weights/${weightId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      await handleResponse<never>(response);
    }
  },
};
