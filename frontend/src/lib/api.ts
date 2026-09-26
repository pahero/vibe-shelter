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
export type SterilizationStatus = "STERILIZED" | "NOT_STERILIZED" | "UNKNOWN";

export type CatCard = {
  id: string;
  name: string;
  sex: CatSex;
  color: string | null;
  estimatedBirthDate: string | null;
  intakeDate: string | null;
  archivedAt?: string | null;
  archivationReasonId?: string | null;
  archivationReasonName?: string | null;
  sterilizationStatus: SterilizationStatus;
  currentLocationId: string | null;
  currentLocationName: string | null;
  createdByUserId: string | null;
  isTest: boolean;
  primaryPhotoUrl: string | null;
  microchipNumber: string | null;
  rescueSource: string | null;
  updatedAt: string;
  tags: CatTag[];
};

export type CatTag = {
  id: string;
  name: string;
  color: string;
};

export type CatArchivationReason = {
  id: string;
  name: string;
};

export type MutationResult = {
  id: string;
};

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  status: "active" | "inactive";
  isTest: boolean;
};

export type CatTask = {
  id: string;
  catId: string;
  comment: string;
  dueDate: string;
  receiverIds: string[];
  completedAt: string | null;
  completedBy: { id: string; fullName: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  comment: string;
  dueDate: string;
  receiverIds: string[];
};

export type CatTreatment = {
  id: string;
  shortName: string;
  instructions: string | null;
  startDate: string;
  endDate: string | null;
  dosesPerDay: 1 | 2;
  createdAt: string;
  updatedAt: string;
  administrations: {
    date: string;
    doseNumber: number;
    checkedBy: { id: string; fullName: string | null };
  }[];
};

export type TreatmentInput = {
  shortName: string;
  instructions?: string | null;
  startDate: string;
  endDate: string | null;
  dosesPerDay: 1 | 2;
};

export type TaskNotification = {
  id: string;
  taskId: string;
  catId: string;
  comment: string;
  dueDate: string;
  createdAt: string;
};

export type ListNotificationsResponse = {
  data: TaskNotification[];
  total: number;
  skip: number;
  limit: number;
};

export type CatWeight = {
  id: string;
  catId: string | null;
  weightKg: number;
  measuredAt: string;
  createdAt: string;
};

export type CatPhoto = {
  id: string;
  catId: string;
  url: string | null;
  fullUrl: string | null;
  isPrimary: boolean;
  createdAt: string;
};

export type CatDocument = {
  id: string;
  catId: string;
  fileName: string;
  url: string | null;
  downloadUrl: string | null;
  createdAt: string;
};

export type CatHistoryEvent = {
  id: string;
  catId: string;
  catName: string | null;
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
  document: {
    id: string;
    link: string | null;
    fileName: string;
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
  search?: string;
  tagId?: string;
  archived?: boolean;
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

export type UpdateCatDto = Partial<CreateCatDto>;

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

export const usersApi = {
  async listUsers(): Promise<User[]> {
    const response = await fetch(`${BACKEND_URL}/users`, { method: "GET", credentials: "include" });
    return handleResponse<User[]>(response);
  },
};

export const notificationsApi = {
  async list(skip = 0, limit = 20): Promise<ListNotificationsResponse> {
    const query = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    const response = await fetch(`${BACKEND_URL}/api/notifications?${query.toString()}`, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<ListNotificationsResponse>(response);
  },
};

export const catsApi = {
  async listTreatments(catId: string): Promise<CatTreatment[]> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${catId}/treatments`, { method: "GET", credentials: "include" });
    return handleResponse<CatTreatment[]>(response);
  },

  async createTreatment(catId: string, data: TreatmentInput): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${catId}/treatments`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async updateTreatment(treatmentId: string, data: Partial<TreatmentInput>): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/treatments/${treatmentId}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async deleteTreatment(treatmentId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/cats/treatments/${treatmentId}`, {
      method: "DELETE", credentials: "include",
    });
    return handleResponse<void>(response);
  },

  async setTreatmentAdministration(treatmentId: string, date: string, doseNumber: number, checked: boolean): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/treatments/${treatmentId}/administrations`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, doseNumber, checked }),
    });
    return handleResponse<MutationResult>(response);
  },

  async listTasks(catId: string): Promise<CatTask[]> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${catId}/tasks`, { method: "GET", credentials: "include" });
    return handleResponse<CatTask[]>(response);
  },

  async createTask(catId: string, data: TaskInput): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${catId}/tasks`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async updateTask(taskId: string, data: Partial<TaskInput>): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/tasks/${taskId}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async deleteTask(taskId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/cats/tasks/${taskId}`, { method: "DELETE", credentials: "include" });
    return handleResponse<void>(response);
  },

  async completeTask(taskId: string): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/tasks/${taskId}/complete`, { method: "POST", credentials: "include" });
    return handleResponse<MutationResult>(response);
  },

  async listCats(params?: ListCatsParams): Promise<ListCatsResponse> {
    const query = new URLSearchParams();
    if (params?.locationId) query.append("locationId", params.locationId);
    if (params?.search) query.append("search", params.search);
    if (params?.tagId) query.append("tagId", params.tagId);
    if (params?.archived) query.append("archived", "true");
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

  async listAllHistory(params?: {
    user?: string;
    catId?: string;
    from?: string;
    to?: string;
    skip?: number;
    limit?: number;
  }): Promise<CatHistoryResponse> {
    const query = new URLSearchParams();
    if (params?.user) query.append("user", params.user);
    if (params?.catId) query.append("catId", params.catId);
    if (params?.from) query.append("from", params.from);
    if (params?.to) query.append("to", params.to);
    if (params?.skip !== undefined) query.append("skip", params.skip.toString());
    if (params?.limit !== undefined) query.append("limit", params.limit.toString());

    const url = query.toString() ? `/api/cats/history?${query.toString()}` : "/api/cats/history";
    const response = await fetch(`${BACKEND_URL}${url}`, {
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

  async listArchivationReasons(): Promise<CatArchivationReason[]> {
    const response = await fetch(`${BACKEND_URL}/api/cats/archivation-reasons`, { method: "GET", credentials: "include" });
    return handleResponse<CatArchivationReason[]>(response);
  },

  async createArchivationReason(name: string): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/archivation-reasons`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    return handleResponse<MutationResult>(response);
  },

  async updateArchivationReason(id: string, name: string): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/archivation-reasons/${id}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    return handleResponse<MutationResult>(response);
  },

  async deleteArchivationReason(id: string, replacementReasonId?: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/cats/archivation-reasons/${id}`, {
      method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(replacementReasonId ? { replacementReasonId } : {}),
    });
    return handleResponse<void>(response);
  },

  async archiveCat(id: string, reasonId: string): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/archive`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reasonId }),
    });
    return handleResponse<MutationResult>(response);
  },

  async dearchiveCat(id: string): Promise<MutationResult> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/dearchive`, {
      method: "POST", credentials: "include",
    });
    return handleResponse<MutationResult>(response);
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

  async listDocuments(id: string): Promise<CatDocument[]> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/documents`, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse<CatDocument[]>(response);
  },

  async addDocument(id: string, document: File): Promise<CatDocument> {
    const formData = new FormData();
    formData.append("document", document);
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/documents`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    return handleResponse<CatDocument>(response);
  },

  async deleteDocument(id: string, documentId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/cats/${id}/documents/${documentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<void>(response);
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
