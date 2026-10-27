import { authenticatedFetch, BACKEND_URL } from "./backend";

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
  isFavorite?: boolean;
  id: string;
  name: string;
  nameNumber: number;
  sex: CatSex;
  color: string | null;
  estimatedBirthDate: string | null;
  intakeDate: string | null;
  archivedAt?: string | null;
  archivingReasonId?: string | null;
  archivingReasonName?: string | null;
  sterilizationStatus: SterilizationStatus;
  currentLocationId: string | null;
  currentLocationName: string | null;
  createdByUserId: string | null;
  isTest: boolean;
  primaryPhotoUrl: string | null;
  primaryPhotoPositionY: number | null;
  microchipNumber: string | null;
  passport: boolean;
  sponsorName: string | null;
  adopterName?: string | null;
  adopterAddress?: string | null;
  felvFivTestDone: boolean;
  rescueSource: string | null;
  updatedAt: string;
  tags: CatTag[];
};

export type CatTag = {
  id: string;
  name: string;
  color: string;
};

export type CatArchivingReason = {
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
  canComplete?: boolean;
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

export type FavoriteCatWithActiveTreatment = Pick<CatCard, "id" | "name" | "nameNumber" | "updatedAt">;

export type TreatmentInput = {
  shortName: string;
  instructions?: string | null;
  startDate: string;
  endDate: string | null;
  dosesPerDay: 1 | 2;
};

export type CatMedicalNote = { id: string; date: string; comment: string; createdAt: string; updatedAt: string };
export type MedicalNoteInput = { date: string; comment: string };
export type VaccinationType = "CORE" | "RABIES" | "OTHER";
export type CatVaccination = { id: string; type: VaccinationType; date: string; nextDueDate: string | null; vaccineName: string | null; createdAt: string; updatedAt: string };
export type VaccinationInput = { type: VaccinationType; date: string; nextDueDate?: string | null; vaccineName?: string | null };
export type ParasiteTreatmentType = "FLEAS_TICKS" | "DEWORMING" | "COMBINED" | "OTHER";
export type CatParasiteTreatment = { id: string; type: ParasiteTreatmentType; date: string; nextDueDate: string | null; productName: string; createdAt: string; updatedAt: string };
export type ParasiteTreatmentInput = { type: ParasiteTreatmentType; date: string; nextDueDate?: string | null; productName: string };
export type CatNote = { id: string; date: string; comment: string; createdAt: string; updatedAt: string };
export type NoteInput = { date: string; comment: string };

export type TaskNotification = {
  id: string;
  type: "task";
  taskId: string;
  catId: string;
  comment: string;
  dueDate: string;
  createdAt: string;
};

export type TreatmentNotification = {
  id: string;
  type: "treatment";
  treatmentId: string;
  catId: string;
  catName: string;
  catNameNumber: number;
  comment: string;
  dueDate: string;
  createdAt: string;
};

export type UserNotification = TaskNotification | TreatmentNotification;

export type ListNotificationsResponse = {
  data: UserNotification[];
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
  catId: string | null;
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
  treatmentAdministrationDate: string | null;
  treatment: { id: string; shortName: string; isDeleted: boolean } | null;
  tag?: { id: string; name: string; isDeleted: boolean } | null;
  weight?: { id: string; measuredAt: string; weightKg: number; isDeleted: boolean } | null;
  task?: { id: string; comment: string; dueDate: string; isDeleted: boolean } | null;
  medicalNote?: { id: string; date: string; comment: string; author: string | null; isDeleted: boolean } | null;
  vaccination?: { id: string; date: string; nextDueDate: string | null; vaccineName: string | null; type: string; isDeleted: boolean } | null;
  parasiteTreatment?: { id: string; date: string; nextDueDate: string | null; productName: string; type: string; isDeleted: boolean } | null;
   note?: { id: string; date: string; comment: string; author: string | null; isDeleted: boolean } | null;
  archivingReason?: { id: string; name: string; isDeleted: boolean } | null;
  location?: { id: string; name: string; isDeleted: boolean } | null;
  relatedUser?: { id: string; displayName: string; isDeleted: boolean } | null;
  photo: {
    id: string;
    createdAt?: string;
    link: string | null;
    status: "ACTIVE" | "DELETED";
  } | null;
  document: {
    id: string;
    link: string | null;
    fileName: string;
    status: "ACTIVE" | "DELETED";
  } | null;
  flight?: {
    id: string;
    flightNumber: string;
    airport: string;
    date: string;
    isDeleted: boolean;
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
  passport?: boolean;
  sponsorName?: string | null;
  adopterName?: string | null;
  adopterAddress?: string | null;
  sterilizationStatus: SterilizationStatus;
  currentLocationId?: string | null;
};

export type UpdateCatDto = Partial<CreateCatDto> & { felvFivTestDone?: boolean };

export type FlightListItem = {
  id: string;
  date: string;
  airport: string;
  flightNumber: string;
  flightParent: string;
  deletedAt: string | null;
  catCount: number;
};

export type FlightCatAssignment = {
  assignmentId: string;
  cat: {
    id: string;
    name: string;
    archivedAt: string | null;
    microchipNumber: string | null;
    passport: boolean;
  };
  f2fDone: boolean;
  tracesDone: boolean;
};

export type FlightDetails = {
  id: string;
  date: string;
  airport: string;
  flightNumber: string;
  flightParent: string;
  updatedAt: string;
  cats: FlightCatAssignment[];
};

export type FlightAuditEvent = {
  id: string;
  flightId: string;
  eventType: string;
  createdAt: string;
  actor: { id: string; displayName: string; email: string };
  oldValue: string | null;
  newValue: string | null;
  cat: { id: string; name: string; archivedAt: string | null } | null;
  flight: { id: string; flightNumber: string; airport: string; date: string; isDeleted: boolean };
  assignment: { id: string; f2fDone: boolean; tracesDone: boolean; isDeleted: boolean } | null;
};

export type FlightInput = {
  date: string;
  airport: string;
  flightNumber: string;
  flightParent: string;
};

export type FlightCatAssignmentUpdate = {
  f2fDone?: boolean;
  tracesDone?: boolean;
};

export type FlightCandidateRequirements = {
  firstVaccine: boolean;
  secondVaccine: boolean;
  rabies: boolean;
  passport: boolean;
  chipped: boolean;
  adopter: boolean;
  felvFivTestDone: boolean;
};

export type FlightCandidate = {
  id: string;
  name: string;
  primaryPhotoUrl: string | null;
  currentLocationName: string | null;
  archivedAt: string | null;
  microchipNumber: string | null;
  passport: boolean;
  sponsorName: string | null;
  adopterName: string | null;
  adopterAddress: string | null;
  flights: Array<{ id: string; flightNumber: string }>;
  requirements: FlightCandidateRequirements;
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

const UPLOAD_MAX_ATTEMPTS = 5;
const UPLOAD_RETRY_BASE_DELAY_MS = 500;
const UPLOAD_RETRY_MAX_DELAY_MS = 5_000;

function isRetryableUploadStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function waitForUploadRetry(attempt: number): Promise<void> {
  const exponentialDelay = Math.min(UPLOAD_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), UPLOAD_RETRY_MAX_DELAY_MS);
  const jitteredDelay = exponentialDelay * (0.8 + Math.random() * 0.4);
  return new Promise((resolve) => setTimeout(resolve, jitteredDelay));
}

async function uploadWithRetry<T>(url: string, method: "POST" | "PUT", createBody: () => FormData): Promise<T> {
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await authenticatedFetch(url, { method, body: createBody() });
    } catch (error) {
      if (attempt === UPLOAD_MAX_ATTEMPTS) throw error;
      await waitForUploadRetry(attempt);
      continue;
    }

    if (attempt < UPLOAD_MAX_ATTEMPTS && isRetryableUploadStatus(response.status)) {
      await waitForUploadRetry(attempt);
      continue;
    }
    return handleResponse<T>(response);
  }

  throw new Error("Upload failed after retries");
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

    const response = await authenticatedFetch(url, {
      method: "GET",
      
    });
    return handleResponse<ListLocationsResponse>(response);
  },

  async getLocation(id: string): Promise<Location> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/locations/${id}`, {
      method: "GET",
      
    });
    return handleResponse<Location>(response);
  },

  async createLocation(data: CreateLocationDto): Promise<Location> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/locations`, {
      method: "POST",
      
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Location>(response);
  },

  async updateLocation(id: string, data: UpdateLocationDto): Promise<Location> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/locations/${id}`, {
      method: "PATCH",
      
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Location>(response);
  },

  async archiveLocation(id: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/locations/${id}`, {
      method: "DELETE",
      
    });
    return handleResponse<void>(response);
  },
};

export const usersApi = {
  async listUsers(): Promise<User[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/users`, { method: "GET", });
    return handleResponse<User[]>(response);
  },
};

export const notificationsApi = {
  async list(skip = 0, limit = 20): Promise<ListNotificationsResponse> {
    const query = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    const response = await authenticatedFetch(`${BACKEND_URL}/api/notifications?${query.toString()}`, {
      method: "GET",
      
    });
    return handleResponse<ListNotificationsResponse>(response);
  },
  async dismiss(notificationId: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/notifications/${notificationId}`, {
      method: "DELETE",
      
    });
    return handleResponse<void>(response);
  },
};

export const catsApi = {
  async listFavoriteCatsWithActiveTreatments(): Promise<FavoriteCatWithActiveTreatment[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/favorites/active-treatments`, { method: "GET" });
    return handleResponse<FavoriteCatWithActiveTreatment[]>(response);
  },
  async listFlightCandidates(): Promise<FlightCandidate[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/flight-candidates`, { method: "GET", });
    return handleResponse<FlightCandidate[]>(response);
  },
  async listNotes(catId: string): Promise<CatNote[]> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/notes`, { method: "GET", }); return handleResponse<CatNote[]>(response); },
  async createNote(catId: string, data: NoteInput): Promise<MutationResult> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/notes`, { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); return handleResponse<MutationResult>(response); },
  async updateNote(id: string, data: Partial<NoteInput>): Promise<MutationResult> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/notes/${id}`, { method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); return handleResponse<MutationResult>(response); },
  async deleteNote(id: string): Promise<void> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/notes/${id}`, { method: "DELETE", }); return handleResponse<void>(response); },
  async listVaccinations(catId: string): Promise<CatVaccination[]> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/vaccinations`, { method: "GET", }); return handleResponse<CatVaccination[]>(response); },
  async createVaccination(catId: string, data: VaccinationInput): Promise<MutationResult> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/vaccinations`, { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); return handleResponse<MutationResult>(response); },
  async updateVaccination(id: string, data: Partial<VaccinationInput>): Promise<MutationResult> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/vaccinations/${id}`, { method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); return handleResponse<MutationResult>(response); },
  async deleteVaccination(id: string): Promise<void> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/vaccinations/${id}`, { method: "DELETE", }); return handleResponse<void>(response); },
  async listParasiteTreatments(catId: string): Promise<CatParasiteTreatment[]> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/parasite-treatments`, { method: "GET", }); return handleResponse<CatParasiteTreatment[]>(response); },
  async createParasiteTreatment(catId: string, data: ParasiteTreatmentInput): Promise<MutationResult> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/parasite-treatments`, { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); return handleResponse<MutationResult>(response); },
  async updateParasiteTreatment(id: string, data: Partial<ParasiteTreatmentInput>): Promise<MutationResult> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/parasite-treatments/${id}`, { method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); return handleResponse<MutationResult>(response); },
  async deleteParasiteTreatment(id: string): Promise<void> { const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/parasite-treatments/${id}`, { method: "DELETE", }); return handleResponse<void>(response); },
  async listMedicalNotes(catId: string): Promise<CatMedicalNote[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/medical-notes`, { method: "GET", });
    return handleResponse<CatMedicalNote[]>(response);
  },
  async createMedicalNote(catId: string, data: MedicalNoteInput): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/medical-notes`, { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return handleResponse<MutationResult>(response);
  },
  async updateMedicalNote(noteId: string, data: Partial<MedicalNoteInput>): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/medical-notes/${noteId}`, { method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return handleResponse<MutationResult>(response);
  },
  async deleteMedicalNote(noteId: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/medical-notes/${noteId}`, { method: "DELETE", });
    return handleResponse<void>(response);
  },
  async listTreatments(catId: string): Promise<CatTreatment[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/treatments`, { method: "GET", });
    return handleResponse<CatTreatment[]>(response);
  },

  async createTreatment(catId: string, data: TreatmentInput): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/treatments`, {
      method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async updateTreatment(treatmentId: string, data: Partial<TreatmentInput>): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/treatments/${treatmentId}`, {
      method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async deleteTreatment(treatmentId: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/treatments/${treatmentId}`, {
      method: "DELETE", 
    });
    return handleResponse<void>(response);
  },

  async restoreTreatment(treatmentId: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/treatments/${treatmentId}/restore`, {
      method: "POST", 
    });
    return handleResponse<MutationResult>(response);
  },

  async setTreatmentAdministration(treatmentId: string, date: string, doseNumber: number, checked: boolean): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/treatments/${treatmentId}/administrations`, {
      method: "PUT",  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, doseNumber, checked }),
    });
    return handleResponse<MutationResult>(response);
  },

  async listTasks(catId: string): Promise<CatTask[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/tasks`, { method: "GET", });
    return handleResponse<CatTask[]>(response);
  },

  async createTask(catId: string, data: TaskInput): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${catId}/tasks`, {
      method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async updateTask(taskId: string, data: Partial<TaskInput>): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/tasks/${taskId}`, {
      method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async deleteTask(taskId: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/tasks/${taskId}`, { method: "DELETE", });
    return handleResponse<void>(response);
  },

  async completeTask(taskId: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/tasks/${taskId}/complete`, { method: "POST", });
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

    const response = await authenticatedFetch(url, {
      method: "GET",
      
    });
    return handleResponse<ListCatsResponse>(response);
  },

  async getCatCard(id: string): Promise<CatCard> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/card`, {
      method: "GET",
      
    });
    return handleResponse<CatCard>(response);
  },

  async toggleCatFavorite(id: string): Promise<{ favorite: boolean }> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/favorite`, { method: "POST" });
    return handleResponse<{ favorite: boolean }>(response);
  },


  async listHistory(id: string, params?: { skip?: number; limit?: number }): Promise<CatHistoryResponse> {
    const query = new URLSearchParams();
    if (params?.skip !== undefined) query.set("skip", params.skip.toString());
    if (params?.limit !== undefined) query.set("limit", params.limit.toString());
    const suffix = query.size ? `?${query.toString()}` : "";
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/history${suffix}`, {
      method: "GET",
      
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
    const response = await authenticatedFetch(`${BACKEND_URL}${url}`, {
      method: "GET",
      
    });
    return handleResponse<CatHistoryResponse>(response);
  },

  async listTags(): Promise<CatTag[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/tags`, {
      method: "GET",
      
    });
    return handleResponse<CatTag[]>(response);
  },

  async listArchivingReasons(): Promise<CatArchivingReason[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/archiving-reasons`, { method: "GET", });
    return handleResponse<CatArchivingReason[]>(response);
  },

  async createArchivingReason(name: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/archiving-reasons`, {
      method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    return handleResponse<MutationResult>(response);
  },

  async updateArchivingReason(id: string, name: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/archiving-reasons/${id}`, {
      method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    return handleResponse<MutationResult>(response);
  },

  async deleteArchivingReason(id: string, replacementReasonId?: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/archiving-reasons/${id}`, {
      method: "DELETE",  headers: { "Content-Type": "application/json" },
      body: JSON.stringify(replacementReasonId ? { replacementReasonId } : {}),
    });
    return handleResponse<void>(response);
  },

  async archiveCat(id: string, reasonId: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/archive`, {
      method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reasonId }),
    });
    return handleResponse<MutationResult>(response);
  },

  async dearchiveCat(id: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/dearchive`, {
      method: "POST", 
    });
    return handleResponse<MutationResult>(response);
  },

  async markFlightCandidate(id: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/flight-candidate`, {
      method: "PUT", 
    });
    return handleResponse<MutationResult>(response);
  },

  async unmarkFlightCandidate(id: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/flight-candidate`, {
      method: "DELETE", 
    });
    return handleResponse<MutationResult>(response);
  },

  async listFlightCandidateIds(): Promise<Array<{ id: string }>> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/flight-candidates`, {
      
    });
    return handleResponse<Array<{ id: string }>>(response);
  },

  async createTag(name: string, color?: string): Promise<CatTag> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/tags`, {
      method: "POST",
      
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, color }),
    });
    return handleResponse<CatTag>(response);
  },

  async updateTag(id: string, data: { name?: string; color?: string }): Promise<CatTag> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/tags/${id}`, {
      method: "PATCH",
      
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CatTag>(response);
  },

  async deleteTag(id: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/tags/${id}`, {
      method: "DELETE",
      
    });
    return handleResponse<void>(response);
  },

  async addTag(id: string, tagId: string): Promise<CatCard> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/tags/${tagId}`, {
      method: "POST",
      
    });
    return handleResponse<CatCard>(response);
  },

  async removeTag(id: string, tagId: string): Promise<CatCard> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/tags/${tagId}`, {
      method: "DELETE",
      
    });
    return handleResponse<CatCard>(response);
  },

  async createCat(data: CreateCatDto): Promise<CatCard> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats`, {
      method: "POST",
      
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CatCard>(response);
  },

  async updateCat(id: string, data: UpdateCatDto): Promise<CatCard> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}`, {
      method: "PATCH",
      
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CatCard>(response);
  },

  async updateCatNameNumber(id: string, nameNumber: number): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/name-number`, {
      method: "PATCH",
      
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameNumber }),
    });
    return handleResponse<MutationResult>(response);
  },

  async updatePrimaryPhoto(id: string, photo: File): Promise<CatCard> {
    return uploadWithRetry(`${BACKEND_URL}/api/cats/${id}/primary-photo`, "PUT", () => {
      const formData = new FormData();
      formData.append("photo", photo);
      return formData;
    });
  },

  async listPhotos(id: string): Promise<CatPhoto[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/photos`, {
      method: "GET",
      
    });
    return handleResponse<CatPhoto[]>(response);
  },

  async listDocuments(id: string): Promise<CatDocument[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/documents`, {
      method: "GET",
      
    });
    return handleResponse<CatDocument[]>(response);
  },

  async addDocument(id: string, document: File): Promise<CatDocument> {
    return uploadWithRetry(`${BACKEND_URL}/api/cats/${id}/documents`, "POST", () => {
      const formData = new FormData();
      formData.append("document", document);
      return formData;
    });
  },

  async deleteDocument(id: string, documentId: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/documents/${documentId}`, {
      method: "DELETE",
      
    });
    return handleResponse<void>(response);
  },

  async addPhoto(id: string, photo: File): Promise<CatPhoto> {
    return uploadWithRetry(`${BACKEND_URL}/api/cats/${id}/photos`, "POST", () => {
      const formData = new FormData();
      formData.append("photo", photo);
      return formData;
    });
  },

  async setPrimaryPhoto(id: string, photoId: string, positionY?: number | null): Promise<CatCard> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/photos/${photoId}/primary`, {
      method: "PUT",
      
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(positionY === undefined ? {} : { positionY }),
    });
    return handleResponse<CatCard>(response);
  },

  async deletePhoto(id: string, photoId: string): Promise<CatCard> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/photos/${photoId}`, {
      method: "DELETE",
      
    });
    return handleResponse<CatCard>(response);
  },

  async listWeights(id: string): Promise<CatWeight[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/weights`, {
      method: "GET",
      
    });
    return handleResponse<CatWeight[]>(response);
  },

  async addWeight(id: string, data: { weightKg: number; measuredAt: string }): Promise<CatWeight> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/weights`, {
      method: "POST",
      
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CatWeight>(response);
  },

  async removeWeight(id: string, weightId: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/cats/${id}/weights/${weightId}`, {
      method: "DELETE",
      
    });
    if (!response.ok) {
      await handleResponse<never>(response);
    }
  },
};

export const flightsApi = {
  async list(includeDeleted = false): Promise<FlightListItem[]> {
    const path = includeDeleted ? "/api/flights/deleted" : "/api/flights";
    const response = await authenticatedFetch(`${BACKEND_URL}${path}`, { method: "GET", });
    return handleResponse<FlightListItem[]>(response);
  },

  async get(flightId: string): Promise<FlightDetails> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights/${flightId}`, { method: "GET", });
    return handleResponse<FlightDetails>(response);
  },

  async history(flightId: string): Promise<FlightAuditEvent[]> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights/${flightId}/history`, { method: "GET", });
    return handleResponse<FlightAuditEvent[]>(response);
  },

  async create(data: FlightInput): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights`, {
      method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async update(flightId: string, data: Partial<FlightInput>): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights/${flightId}`, {
      method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async delete(flightId: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights/${flightId}`, { method: "DELETE", });
    return handleResponse<void>(response);
  },

  async restore(flightId: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights/${flightId}/restore`, { method: "POST", });
    return handleResponse<MutationResult>(response);
  },

  async assignCat(flightId: string, catId: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights/${flightId}/cats`, {
      method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ catId }),
    });
    return handleResponse<MutationResult>(response);
  },

  async updateAssignment(assignmentId: string, data: FlightCatAssignmentUpdate): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights/assignments/${assignmentId}`, {
      method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return handleResponse<MutationResult>(response);
  },

  async deleteAssignment(assignmentId: string): Promise<void> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights/assignments/${assignmentId}`, { method: "DELETE", });
    return handleResponse<void>(response);
  },

  async restoreAssignment(assignmentId: string): Promise<MutationResult> {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/flights/assignments/${assignmentId}/restore`, { method: "POST", });
    return handleResponse<MutationResult>(response);
  },
};
