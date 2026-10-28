"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { faArrowLeft, faBoxArchive, faBugs, faCat, faClockRotateLeft, faEllipsis, faImages, faListCheck, faNotesMedical, faPen, faPills, faPlane, faPlus, faRotateLeft, faSyringe, faTrash, faWeightScale } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useParams } from "next/navigation";
import { CatCard } from "@/components/cat-card";
import { TagColorStrip } from "@/components/tag-color-strip";
import { CatProfileSectionHeader } from "@/components/cat-profile-section-header";
import { CatColorDatalist } from "@/components/cat-color-options";
import { CatHistory } from "@/components/cat-history";
import { CatTasks } from "@/components/cat-tasks";
import { CatTreatments } from "@/components/cat-treatments";
import { CatMedicalNotes } from "@/components/cat-medical-notes";
import { CatVaccinations } from "@/components/cat-vaccinations";
import { CatParasiteTreatments } from "@/components/cat-parasite-treatments";
import { CatArchivingReason, CatCard as CatCardType, CatDocument, CatHistoryEvent, CatPhoto, CatSex, CatTag, CatWeight, IntakeSource, INTAKE_SOURCE_LABELS, Location, SterilizationStatus, catsApi, flightsApi, locationsApi } from "@/lib/api";
import { TAG_COLOR_OPTIONS, tagChipStyle } from "@/lib/tag-colors";
import { ApiErrorHandler, formatDate, formatDateShort } from "@/lib/utils";
import { isSupportedGalleryUpload } from "@/lib/gallery-media";

type CatEditForm = {
  name: string;
  nameNumber: number;
  sex: CatSex;
  color: string;
  estimatedBirthDate: string;
  intakeDate: string;
  microchipNumber: string;
  passport: boolean;
  sponsorName: string;
  adopterName: string;
  adopterAddress: string;
  felvFivTestDone: boolean;
  intakeDetails: string;
  intakeSource: IntakeSource | "";
  sterilizationStatus: SterilizationStatus;
  currentLocationId: string;
};

const sexLabels: Record<CatSex, string> = {
  FEMALE: "Female",
  MALE: "Male",
  UNKNOWN: "Unknown",
};

const sterilizationLabels: Record<SterilizationStatus, string> = {
  STERILIZED: "Neutered",
  NOT_STERILIZED: "Not neutered",
  UNKNOWN: "Unknown",
};

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

function dateInputValue(date: string | null): string {
  return date ? date.slice(0, 10) : "";
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function catToEditForm(cat: CatCardType): CatEditForm {
  return {
    name: cat.name,
    nameNumber: cat.nameNumber,
    sex: cat.sex,
    color: cat.color ?? "",
    estimatedBirthDate: dateInputValue(cat.estimatedBirthDate),
    intakeDate: dateInputValue(cat.intakeDate),
    microchipNumber: cat.microchipNumber ?? "",
    passport: cat.passport,
    sponsorName: cat.sponsorName ?? "",
    adopterName: cat.adopterName ?? "",
    adopterAddress: cat.adopterAddress ?? "",
    felvFivTestDone: cat.felvFivTestDone,
    intakeDetails: cat.intakeDetails ?? "",
    intakeSource: cat.intakeSource ?? "",
    sterilizationStatus: cat.sterilizationStatus,
    currentLocationId: cat.currentLocationId ?? "",
  };
}

function randomTagColor(): string {
  return TAG_COLOR_OPTIONS[Math.floor(Math.random() * TAG_COLOR_OPTIONS.length)];
}

export default function CatProfilePage() {
  const params = useParams();
  const catId = params?.id as string;
  const [cat, setCat] = useState<CatCardType | null>(null);
  const [favoriteOverride, setFavoriteOverride] = useState<{ catId: string; value: boolean } | null>(null);
  const [photoPositionY, setPhotoPositionY] = useState(50);
  const [photoNaturalSize, setPhotoNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [photoViewportSize, setPhotoViewportSize] = useState<{ width: number; height: number } | null>(null);
  const [isSavingPhotoPosition, setIsSavingPhotoPosition] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null);
  const [isCatProfileExpanded, setIsCatProfileExpanded] = useState(true);
  const [editForm, setEditForm] = useState<CatEditForm | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [weights, setWeights] = useState<CatWeight[]>([]);
  const [isLoadingWeights, setIsLoadingWeights] = useState(true);
  const [isAddingWeight, setIsAddingWeight] = useState(false);
  const [isWeightExpanded, setIsWeightExpanded] = useState(true);
  const [isWeightFormOpen, setIsWeightFormOpen] = useState(false);
  const [removingWeightId, setRemovingWeightId] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [weightDate, setWeightDate] = useState(() => todayInputValue());
  const [weightError, setWeightError] = useState<string | null>(null);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isPhotoPositionSelectorOpen, setIsPhotoPositionSelectorOpen] = useState(false);
  const [photos, setPhotos] = useState<CatPhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [documents, setDocuments] = useState<CatDocument[]>([]);
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [historyEvents, setHistoryEvents] = useState<CatHistoryEvent[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySkip, setHistorySkip] = useState(0);
  const [treatmentRefreshVersion, setTreatmentRefreshVersion] = useState(0);
  const historyLimit = 50;
  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const syncProfileVisibility = () => setIsCatProfileExpanded(true);
    syncProfileVisibility();
    desktopQuery.addEventListener("change", syncProfileVisibility);
    return () => desktopQuery.removeEventListener("change", syncProfileVisibility);
  }, []);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const [settingPrimaryPhotoId, setSettingPrimaryPhotoId] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<CatTag[]>([]);
  const [tagName, setTagName] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [removingTagId, setRemovingTagId] = useState<string | null>(null);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [isArchiveFormOpen, setIsArchiveFormOpen] = useState(false);
  const [archivingReasons, setArchivingReasons] = useState<CatArchivingReason[]>([]);
  const [archivingReasonId, setArchivingReasonId] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isMarkingFlightCandidate, setIsMarkingFlightCandidate] = useState(false);
  const [flightCandidateError, setFlightCandidateError] = useState<string | null>(null);
  const [isFlightCandidate, setIsFlightCandidate] = useState(false);
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("profile");

  useEffect(() => {
    const sectionIds = ["profile", "media", "treatments", "weight-history", "vaccinations", "parasite-treatments", "medical-notes", "tasks", "history"];
    const hashSection = window.location.hash.slice(1);
    if (sectionIds.includes(hashSection)) {
      setSelectedSection(hashSection);
    } else {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#profile`);
    }
  }, []);

  const goToSection = (sectionId: string) => {
    setSelectedSection(sectionId);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${sectionId}`);
    setIsSectionMenuOpen(false);
  };

  useEffect(() => {
    if (!catId) return;

    const fetchCat = async () => {
      setIsLoading(true);
      setError(null);
      try {
        setCat(await catsApi.getCatCard(catId));
      } catch (err) {
        if (ApiErrorHandler.isNotFoundError(err)) {
          setError("Cat not found");
        } else {
          setError(ApiErrorHandler.handle(err));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCat();
  }, [catId]);

  useEffect(() => {
    if (!catId) return;
    let cancelled = false;
    catsApi.listFlightCandidateIds().then((candidates) => {
      if (!cancelled) setIsFlightCandidate(candidates.some((candidate) => candidate.id === catId));
    }).catch(() => {
      if (!cancelled) setIsFlightCandidate(false);
    });
    return () => { cancelled = true; };
  }, [catId]);

  useEffect(() => {
    setPhotoPositionY(cat?.primaryPhotoPositionY ?? 50);
  }, [cat?.primaryPhotoUrl, cat?.primaryPhotoPositionY]);

  useEffect(() => {
    if (!catId) return;
    let cancelled = false;

    const fetchDocuments = async () => {
      setIsLoadingDocuments(true);
      setDocumentError(null);
      try {
        const data = await catsApi.listDocuments(catId);
        if (!cancelled) setDocuments(data);
      } catch (err) {
        if (!cancelled) {
          setDocumentError(ApiErrorHandler.handle(err));
          setDocuments([]);
        }
      } finally {
        if (!cancelled) setIsLoadingDocuments(false);
      }
    };

    fetchDocuments();
    return () => { cancelled = true; };
  }, [catId]);

  const refreshHistory = async () => {
    if (!catId) return;
    setHistoryError(null);
    setHistorySkip(0);
    const response = await catsApi.listHistory(catId, { skip: 0, limit: historyLimit });
    setHistoryEvents(response.data);
    setHistoryTotal(response.total);
  };

  const restoreTreatment = async (treatmentId: string) => {
    await catsApi.restoreTreatment(treatmentId);
    setTreatmentRefreshVersion((version) => version + 1);
    await refreshHistory();
  };

  const restoreFlight = async (flightId: string) => {
    await flightsApi.restore(flightId);
    await refreshHistory();
  };

  useEffect(() => {
    if (!catId) return;
    let cancelled = false;

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const response = await catsApi.listHistory(catId, { skip: historySkip, limit: historyLimit });
        if (!cancelled) {
          setHistoryEvents(response.data);
          setHistoryTotal(response.total);
        }
      } catch (err) {
        if (!cancelled) {
          setHistoryError(ApiErrorHandler.handle(err));
          setHistoryEvents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [catId, historySkip]);

  useEffect(() => {
    let cancelled = false;

    const fetchLocations = async () => {
      setIsLoadingLocations(true);
      setLocationsError(null);
      try {
        const response = await locationsApi.listLocations({ status: "ACTIVE", limit: 100 });
        if (!cancelled) {
          setLocations(response.data);
          setEditForm((prev) => {
            if (!prev || response.data.some((location) => location.id === prev.currentLocationId)) return prev;
            return { ...prev, currentLocationId: response.data[0]?.id ?? "" };
          });
        }
      } catch (err) {
        if (!cancelled) {
          setLocationsError(ApiErrorHandler.handle(err));
          setLocations([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLocations(false);
        }
      }
    };

    fetchLocations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!catId) return;
    let cancelled = false;

    const fetchPhotos = async () => {
      setIsLoadingPhotos(true);
      setPhotoError(null);
      try {
        const data = await catsApi.listPhotos(catId);
        if (!cancelled) {
          setPhotos(data);
        }
      } catch (err) {
        if (!cancelled) {
          setPhotoError(ApiErrorHandler.handle(err));
          setPhotos([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPhotos(false);
        }
      }
    };

    fetchPhotos();

    return () => {
      cancelled = true;
    };
  }, [catId]);

  useEffect(() => {
    if (!catId) return;
    let cancelled = false;

    const fetchWeights = async () => {
      setIsLoadingWeights(true);
      setWeightError(null);
      try {
        const data = await catsApi.listWeights(catId);
        if (!cancelled) {
          setWeights(data);
        }
      } catch (err) {
        if (!cancelled) {
          setWeightError(ApiErrorHandler.handle(err));
          setWeights([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWeights(false);
        }
      }
    };

    fetchWeights();

    return () => {
      cancelled = true;
    };
  }, [catId]);

  useEffect(() => {
    let cancelled = false;

    const fetchTags = async () => {
      setTagError(null);
      try {
        const tags = await catsApi.listTags();
        if (!cancelled) {
          setAvailableTags(tags);
        }
      } catch (err) {
        if (!cancelled) {
          setTagError(ApiErrorHandler.handle(err));
        }
      }
    };

    fetchTags();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0 || !cat) return;

    if (files.some((file) => !isSupportedGalleryUpload(file))) {
      setPhotoError("Choose image files or MP4/WebM videos to add to the gallery.");
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError(null);

    try {
      const uploads = await Promise.allSettled(files.map((file) => catsApi.addPhoto(cat.id, file)));
      const [updatedCat, updatedPhotos] = await Promise.all([catsApi.getCatCard(cat.id), catsApi.listPhotos(cat.id), refreshHistory()]);
      setCat(updatedCat);
      setPhotos(updatedPhotos);
      if (uploads.some((upload) => upload.status === "rejected")) {
        setPhotoError("Some photos could not be uploaded. Please try again for those photos.");
      }
    } catch (err) {
      setPhotoError(ApiErrorHandler.handle(err));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDocumentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !cat) return;
    const extension = file.name.toLowerCase().split(".").pop();
    const isPdf = file.type === "application/pdf" || extension === "pdf";
    const isImage = (["image/jpeg", "image/png"].includes(file.type) || ["jpg", "jpeg", "png"].includes(extension ?? ""));
    if (!isPdf && !isImage) {
      setDocumentError("Choose a PDF, JPEG, or PNG file.");
      return;
    }

    setIsUploadingDocument(true);
    setDocumentError(null);
    try {
      await catsApi.addDocument(cat.id, file);
      const [updatedDocuments] = await Promise.all([catsApi.listDocuments(cat.id), refreshHistory()]);
      setDocuments(updatedDocuments);
    } catch (err) {
      setDocumentError(ApiErrorHandler.handle(err));
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!cat) return;
    setRemovingDocumentId(documentId);
    setDocumentError(null);
    try {
      await catsApi.deleteDocument(cat.id, documentId);
      const [updatedDocuments] = await Promise.all([catsApi.listDocuments(cat.id), refreshHistory()]);
      setDocuments(updatedDocuments);
      if (expandedDocumentId === documentId) setExpandedDocumentId(null);
    } catch (err) {
      setDocumentError(ApiErrorHandler.handle(err));
    } finally {
      setRemovingDocumentId(null);
    }
  };

  const handleSetPrimaryPhoto = async (photoId: string) => {
    if (!cat) return;
    setSettingPrimaryPhotoId(photoId);
    setPhotoError(null);
    try {
      const updatedCat = await catsApi.setPrimaryPhoto(cat.id, photoId);
      const updatedPhotos = await catsApi.listPhotos(cat.id);
      setCat(updatedCat);
      setPhotos(updatedPhotos);
      setIsPhotoMenuOpen(false);
    } catch (err) {
      setPhotoError(ApiErrorHandler.handle(err));
    } finally {
      setSettingPrimaryPhotoId(null);
    }
  };

  const savePhotoPosition = async (photoId = primaryPhoto?.id) => {
    if (!cat || !photoId) return;
    setIsSavingPhotoPosition(true);
    setPhotoError(null);
    try {
      setCat(await catsApi.setPrimaryPhoto(cat.id, photoId, photoPositionY));
      setIsPhotoPositionSelectorOpen(false);
    } catch (err) {
      setPhotoError(ApiErrorHandler.handle(err));
    } finally {
      setIsSavingPhotoPosition(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!cat) return;
    const nextExpandedPhotoId = expandedPhotoId === photoId ? photos.find((photo) => photo.id !== photoId)?.id ?? null : expandedPhotoId;
    setRemovingPhotoId(photoId);
    setPhotoError(null);
    try {
      const updatedCat = await catsApi.deletePhoto(cat.id, photoId);
      const [updatedPhotos] = await Promise.all([catsApi.listPhotos(cat.id), refreshHistory()]);
      setCat(updatedCat);
      setPhotos(updatedPhotos);
      setExpandedPhotoId(nextExpandedPhotoId && updatedPhotos.some((photo) => photo.id === nextExpandedPhotoId) ? nextExpandedPhotoId : null);
      setIsPhotoMenuOpen(false);
    } catch (err) {
      setPhotoError(ApiErrorHandler.handle(err));
    } finally {
      setRemovingPhotoId(null);
    }
  };

  const openPhoto = (photoId: string) => {
    setExpandedPhotoId(photoId);
    setPhotoNaturalSize(null);
    setIsPhotoMenuOpen(false);
    setIsPhotoPositionSelectorOpen(false);
  };

  const closePhoto = () => {
    setExpandedPhotoId(null);
    setPhotoNaturalSize(null);
    setIsPhotoMenuOpen(false);
    setIsPhotoPositionSelectorOpen(false);
  };

  const startEditingDetails = () => {
    if (!cat) return;
    setEditForm(catToEditForm(cat));
    setDetailsError(null);
    setDetailsSuccess(null);
    setIsEditingDetails(true);
  };

  const cancelEditingDetails = () => {
    setIsEditingDetails(false);
    setEditForm(null);
    setDetailsError(null);
  };

  const openArchiveForm = async () => {
    setArchiveError(null);
    try {
      const reasons = await catsApi.listArchivingReasons();
      setArchivingReasons(reasons);
      setArchivingReasonId(reasons[0]?.id ?? "");
      setIsArchiveFormOpen(true);
    } catch (err) {
      setArchiveError(ApiErrorHandler.handle(err));
    }
  };

  const archiveCat = async () => {
    if (!cat || !archivingReasonId) {
      setArchiveError("Choose an archiving reason.");
      return;
    }
    setIsArchiving(true);
    setArchiveError(null);
    try {
      await catsApi.archiveCat(cat.id, archivingReasonId);
      const updated = await catsApi.getCatCard(cat.id);
      setCat(updated);
      setIsArchiveFormOpen(false);
      await refreshHistory();
    } catch (err) {
      setArchiveError(ApiErrorHandler.handle(err));
    } finally {
      setIsArchiving(false);
    }
  };

  const dearchiveCat = async () => {
    if (!cat) return;
    setIsArchiving(true);
    setArchiveError(null);
    try {
      await catsApi.dearchiveCat(cat.id);
      setCat(await catsApi.getCatCard(cat.id));
      await refreshHistory();
    } catch (err) {
      setArchiveError(ApiErrorHandler.handle(err));
    } finally {
      setIsArchiving(false);
    }
  };

  const toggleFlightCandidate = async () => {
    if (!cat) return;
    setIsMarkingFlightCandidate(true);
    setFlightCandidateError(null);
    try {
      if (isFlightCandidate) await catsApi.unmarkFlightCandidate(cat.id);
      else await catsApi.markFlightCandidate(cat.id);
      setIsFlightCandidate(!isFlightCandidate);
      await refreshHistory();
    } catch (err) {
      setFlightCandidateError(ApiErrorHandler.handle(err));
    } finally {
      setIsMarkingFlightCandidate(false);
    }
  };

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cat || !editForm) return;

    const name = editForm.name.trim();
    if (!name) {
      setDetailsError("Cat name is required.");
      return;
    }
    if (!Number.isInteger(editForm.nameNumber) || editForm.nameNumber < 1) {
      setDetailsError("Number must be a positive integer.");
      return;
    }
    if (!locations.some((location) => location.id === editForm.currentLocationId)) {
      setDetailsError("Choose an active location for this cat.");
      return;
    }

    setIsSavingDetails(true);
    setDetailsError(null);
    setDetailsSuccess(null);

    try {
      if (editForm.nameNumber !== cat.nameNumber) {
        await catsApi.updateCatNameNumber(cat.id, editForm.nameNumber);
      }
      const updated = await catsApi.updateCat(cat.id, {
        name,
        sex: editForm.sex,
        color: editForm.color.trim() || null,
        estimatedBirthDate: editForm.estimatedBirthDate || null,
        intakeDate: editForm.intakeDate || null,
        microchipNumber: editForm.microchipNumber.trim() || null,
        passport: editForm.passport,
        sponsorName: editForm.sponsorName.trim() || null,
        adopterName: editForm.adopterName.trim() || null,
        adopterAddress: editForm.adopterAddress.trim() || null,
        felvFivTestDone: editForm.felvFivTestDone,
        intakeDetails: editForm.intakeDetails.trim() || null,
        intakeSource: editForm.intakeSource || null,
        sterilizationStatus: editForm.sterilizationStatus,
        currentLocationId: editForm.currentLocationId || null,
      });
      setCat(updated);
      setEditForm(catToEditForm(updated));
      await refreshHistory();
      setIsEditingDetails(false);
      setDetailsSuccess("Cat details were updated.");
    } catch (err) {
      setDetailsError(ApiErrorHandler.handle(err));
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleWeightSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cat) return;

    const parsedWeight = Number(weightKg);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setWeightError("Weight must be a positive number.");
      return;
    }
    if (!weightDate) {
      setWeightError("Weight date is required.");
      return;
    }

    setIsAddingWeight(true);
    setWeightError(null);
    try {
      const created = await catsApi.addWeight(cat.id, { weightKg: parsedWeight, measuredAt: weightDate });
      setWeights((prev) => [created, ...prev].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)));
       setWeightKg("");
       setWeightDate(todayInputValue());
       setIsWeightFormOpen(false);
      await refreshHistory();
    } catch (err) {
      setWeightError(ApiErrorHandler.handle(err));
    } finally {
      setIsAddingWeight(false);
    }
  };

  const handleRemoveWeight = async (weightId: string) => {
    if (!cat) return;

    setRemovingWeightId(weightId);
    setWeightError(null);
    try {
      await catsApi.removeWeight(cat.id, weightId);
      setWeights((prev) => prev.filter((weight) => weight.id !== weightId));
      await refreshHistory();
    } catch (err) {
      setWeightError(ApiErrorHandler.handle(err));
    } finally {
      setRemovingWeightId(null);
    }
  };

  const addTagByName = async (name: string) => {
    if (!cat) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setTagError("Tag name is required.");
      return;
    }

    setIsSavingTag(true);
    setTagError(null);
    try {
      const existing = availableTags.find((tag) => tag.name.toLowerCase() === trimmedName.toLowerCase());
      const tag = existing ?? (await catsApi.createTag(trimmedName, randomTagColor()));
      const updated = await catsApi.addTag(cat.id, tag.id);
      setCat(updated);
      setAvailableTags((prev) => (prev.some((item) => item.id === tag.id) ? prev : [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))));
      await refreshHistory();
      setTagName("");
      setIsTagPickerOpen(false);
    } catch (err) {
      setTagError(ApiErrorHandler.handle(err));
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleAddTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await addTagByName(tagName);
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!cat) return;

    setRemovingTagId(tagId);
    setTagError(null);
    try {
      setCat(await catsApi.removeTag(cat.id, tagId));
      await refreshHistory();
    } catch (err) {
      setTagError(ApiErrorHandler.handle(err));
    } finally {
      setRemovingTagId(null);
    }
  };

   const graphWeights = [...weights].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const currentTagIds = new Set(cat?.tags.map((tag) => tag.id) ?? []);
  const tagsToAdd = availableTags.filter((tag) => !currentTagIds.has(tag.id));
  const sortedPhotos = [...photos].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.createdAt.localeCompare(a.createdAt));
  const sortedDocuments = [...documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const primaryPhoto = sortedPhotos[0] ?? null;
  const expandedDocument = expandedDocumentId ? sortedDocuments.find((document) => document.id === expandedDocumentId) ?? null : null;
  const expandedDocumentIndex = expandedDocumentId ? sortedDocuments.findIndex((document) => document.id === expandedDocumentId) : -1;
  const hasMultipleDocuments = sortedDocuments.length > 1;
  const expandedPhotoIndex = expandedPhotoId ? sortedPhotos.findIndex((photo) => photo.id === expandedPhotoId) : -1;
  const expandedPhoto = expandedPhotoIndex >= 0 ? sortedPhotos[expandedPhotoIndex] : null;
  const expandedPhotoIdForEffect = expandedPhoto?.id;
  const photoFrameGeometry = photoNaturalSize && photoViewportSize
    ? (() => {
        const scale = Math.min(
          photoViewportSize.width / photoNaturalSize.width,
          photoViewportSize.height / photoNaturalSize.height,
        );
        const width = photoNaturalSize.width * scale;
        const height = photoNaturalSize.height * scale;
        const frameWidth = Math.min(width, height * (16 / 9));
        const frameHeight = frameWidth * (9 / 16);
        const imageTop = (photoViewportSize.height - height) / 2;
        const imageLeft = (photoViewportSize.width - width) / 2;
        const top = imageTop + (height - frameHeight) * (photoPositionY / 100);
        return {
          width: frameWidth,
          height: frameHeight,
          top,
          left: imageLeft,
          imageTop,
          imageHeight: height,
        };
      })()
    : null;
  useEffect(() => {
    if (!expandedPhotoIdForEffect) {
      setPhotoViewportSize(null);
      return;
    }
    const viewport = document.getElementById("expanded-photo-viewport");
    if (!viewport) return;
    const measure = () => {
      const { width, height } = viewport.getBoundingClientRect();
      setPhotoViewportSize({ width, height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    measure();
    return () => observer.disconnect();
  }, [expandedPhotoIdForEffect]);
  const hasMultiplePhotos = sortedPhotos.length > 1;
  const visibleGalleryPhotos = sortedPhotos;
  const showPreviousPhoto = () => {
    if (!hasMultiplePhotos || expandedPhotoIndex < 0) return;
    openPhoto(sortedPhotos[(expandedPhotoIndex - 1 + sortedPhotos.length) % sortedPhotos.length].id);
  };
  const showNextPhoto = () => {
    if (!hasMultiplePhotos || expandedPhotoIndex < 0) return;
    openPhoto(sortedPhotos[(expandedPhotoIndex + 1) % sortedPhotos.length].id);
  };
  const showPreviousDocument = () => {
    if (!hasMultipleDocuments || expandedDocumentIndex < 0) return;
    setExpandedDocumentId(sortedDocuments[(expandedDocumentIndex - 1 + sortedDocuments.length) % sortedDocuments.length].id);
  };
  const showNextDocument = () => {
    if (!hasMultipleDocuments || expandedDocumentIndex < 0) return;
    setExpandedDocumentId(sortedDocuments[(expandedDocumentIndex + 1) % sortedDocuments.length].id);
  };

  return (
    <main className="relative min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6 pb-32">
      <Link
        href="/"
        aria-label="Back to home"
        title="Back to home"
        className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"
      >
        <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
      </Link>
      <div className="mx-auto max-w-xl">
        {isLoading && <p className="mt-2 text-center text-sm text-[#6d6a66]">Loading cat profile...</p>}

        {!isLoading && error && (
          <div className="mt-2 rounded-lg border border-red-300 bg-red-50 p-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!isLoading && cat && (
          <div className={selectedSection ? "mt-2 flex flex-col gap-6" : "mt-2 grid gap-6 md:grid-cols-[minmax(0,360px)_1fr]"}>
            <div className={`space-y-4 ${selectedSection ? "md:col-span-1" : ""}`}>
              {selectedSection ? (
                <header className="mx-auto w-full text-center">
                  <div className="relative overflow-hidden rounded-2xl border border-[#d4c7b4] bg-gradient-to-br from-[#f1d8c7] to-[#d05a2c]/20 shadow-sm">
                    <button type="button" onClick={async () => { const result = await catsApi.toggleCatFavorite(cat.id); setFavoriteOverride({ catId: cat.id, value: result.favorite }); }} aria-label={(favoriteOverride?.catId === cat.id ? favoriteOverride.value : !!cat.isFavorite) ? `Remove ${cat.name} from favorites` : `Add ${cat.name} to favorites`} title={(favoriteOverride?.catId === cat.id ? favoriteOverride.value : !!cat.isFavorite) ? "Remove from favorites" : "Add to favorites"} className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white ${(favoriteOverride?.catId === cat.id ? favoriteOverride.value : !!cat.isFavorite) ? "text-rose-600" : "text-gray-500"}`}>
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill={(favoriteOverride?.catId === cat.id ? favoriteOverride.value : !!cat.isFavorite) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
                    </button>
                    {cat.primaryPhotoUrl ? (
                      <button type="button" onClick={() => primaryPhoto && openPhoto(primaryPhoto.id)} aria-label={`Expand ${primaryPhoto?.mediaType ?? "photo"} of ${cat.name}`} className={`relative block aspect-video w-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#d05a2c] ${primaryPhoto?.mediaType === "video" ? "bg-black" : "bg-cover bg-center"}`} style={primaryPhoto?.mediaType === "video" ? undefined : { backgroundImage: `url(${cat.primaryPhotoUrl})`, backgroundPositionY: `${photoPositionY}%` }}>
                        {primaryPhoto?.mediaType === "video" && <><video src={primaryPhoto.fullUrl ?? primaryPhoto.url ?? undefined} muted playsInline preload="metadata" className="h-full w-full object-contain" aria-hidden="true" /><span className="absolute inset-0 flex items-center justify-center text-5xl text-white drop-shadow" aria-hidden="true">▶</span></>}
                      </button>
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center text-5xl" aria-label={`No photo for ${cat.name}`}>🐾</div>
                    )}
                    <TagColorStrip tags={cat.tags} overlay />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3 text-left">
                    <h1 className="min-w-0 truncate text-3xl font-semibold text-gray-900">{cat.name} <span className="text-[#6d6a66]">#{cat.nameNumber}</span></h1>
                    <span className="shrink-0 text-sm font-medium text-[#6d6a66]">{cat.currentLocationName || "Not assigned"}</span>
                  </div>
                </header>
              ) : (
                <CatCard cat={cat} showProfileLink={false} showTags={false} showFavorite onPhotoClick={primaryPhoto ? () => openPhoto(primaryPhoto.id) : undefined} />
              )}
              {selectedSection === "media" && <>
               <section id="gallery" className="scroll-mt-6 w-full">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Gallery</p>

                {isLoadingPhotos && <p className="mt-4 text-sm text-[#6d6a66]">Loading photos...</p>}

                {!isLoadingPhotos && (
                  <div className="mt-3 grid w-fit grid-cols-4 gap-2">
                    {visibleGalleryPhotos.map((photo) => (
                      <div key={photo.id} className="relative overflow-hidden rounded-lg border border-[#d4c7b4] bg-[#fff8ee]">
                        <button
                          type="button"
                          onClick={() => openPhoto(photo.id)}
                          className={`block h-16 w-16 bg-[#eadfce] bg-cover bg-center transition brightness-95 hover:brightness-105 ${photo.mediaType === "video" ? "flex items-center justify-center bg-black text-2xl text-white" : ""}`}
                          style={photo.mediaType !== "video" && photo.url ? { backgroundImage: `url(${photo.url})` } : undefined}
                          aria-label={`Open ${photo.mediaType} of ${cat.name}`}
                        >{photo.mediaType === "video" && <span aria-hidden="true">▶</span>}</button>
                      </div>
                    ))}
                    <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#d05a2c]/45 bg-[#d05a2c]/10 text-2xl font-semibold text-[#b24a20] transition hover:bg-[#d05a2c]/20 has-disabled:cursor-not-allowed has-disabled:opacity-60" aria-label="Add photo or video" title="Add photo or video">
                      {isUploadingPhoto ? "..." : "+"}
                      <input type="file" accept="image/*,video/mp4,video/webm,.mp4,.webm" multiple disabled={isUploadingPhoto} onChange={handlePhotoChange} className="sr-only" />
                    </label>
                  </div>
                )}

               {photoError && <p className="mt-3 text-sm font-medium text-red-700">{photoError}</p>}
              </section>
              </>}
              {selectedSection === "media" && <>
              <section id="documents" className="scroll-mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Documents</p>
                    <p className="mt-1 text-xs text-[#6d6a66]">PDF, JPEG, or PNG files</p>
                  </div>
                  <label aria-label="Upload document or image" title="Upload document or image" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#b24a20] bg-[#d05a2c] text-xl font-semibold leading-none text-white transition hover:bg-[#b24a20] has-disabled:cursor-not-allowed has-disabled:opacity-60">
                    {isUploadingDocument ? "…" : <FontAwesomeIcon icon={faPlus} className="text-sm" />}
                    <input type="file" accept="application/pdf,.pdf,image/jpeg,image/png,.jpg,.jpeg,.png" disabled={isUploadingDocument} onChange={handleDocumentChange} className="sr-only" />
                  </label>
                </div>
                {isLoadingDocuments && <p className="mt-4 text-sm text-[#6d6a66]">Loading documents...</p>}
                {!isLoadingDocuments && documents.length === 0 && <p className="mt-4 text-sm text-[#6d6a66]">No documents have been uploaded.</p>}
                {!isLoadingDocuments && documents.length > 0 && (
                  <ul className="mt-3 divide-y divide-[#d4c7b4] border-y border-[#d4c7b4]">
                    {sortedDocuments.map((document) => (
                      <li key={document.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => setExpandedDocumentId(document.id)} disabled={!document.url} className="block max-w-full truncate text-left text-sm font-semibold text-[#b24a20] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-gray-800 disabled:no-underline" title={document.fileName}>
                            {document.fileName}
                          </button>
                          <p className="mt-0.5 text-xs text-[#6d6a66]">Added {formatDate(document.createdAt)}</p>
                        </div>
                        <button type="button" onClick={() => handleDeleteDocument(document.id)} disabled={removingDocumentId === document.id} aria-label="Delete document" title="Delete document" className="shrink-0 rounded-lg p-2 text-red-700 transition hover:bg-red-100 disabled:opacity-50">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {documentError && <p className="mt-3 text-sm font-medium text-red-700">{documentError}</p>}
              </section>
              </>}
            </div>
            {selectedSection === "profile" && <>
            <section id="profile" className="md:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Cat profile</h2>
                {!isEditingDetails && <div className="flex items-center gap-2">
                  {cat.archivingReasonId ? (
                    <button type="button" onClick={dearchiveCat} disabled={isArchiving} aria-label="Restore cat" title="Restore cat" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#31734b] text-[#31734b] transition hover:bg-green-50 disabled:opacity-50"><FontAwesomeIcon icon={faRotateLeft} /></button>
                  ) : (
                    <button type="button" onClick={openArchiveForm} aria-label="Archive cat" title="Archive cat" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-700 text-red-700 transition hover:bg-red-50"><FontAwesomeIcon icon={faBoxArchive} /></button>
                  )}
                  {!cat.archivingReasonId && <button type="button" onClick={toggleFlightCandidate} disabled={isMarkingFlightCandidate} aria-label={isFlightCandidate ? "Unmark flight candidate" : "Mark as flight candidate"} title={isFlightCandidate ? "Unmark flight candidate" : "Mark as flight candidate"} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:opacity-50 ${isFlightCandidate ? "border-amber-700 text-amber-700 hover:bg-amber-50" : "border-[#31734b] text-[#31734b] hover:bg-green-50"}`}><FontAwesomeIcon icon={faPlane} /></button>}
                  {!cat.archivingReasonId && <button type="button" onClick={startEditingDetails} aria-label="Edit cat profile" title="Edit cat profile" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#b24a20] bg-[#d05a2c] text-white transition hover:bg-[#b24a20]"><FontAwesomeIcon icon={faPen} /></button>}
                </div>}
              </div>
              <div className={`${isCatProfileExpanded ? "block" : "hidden"} md:block`}>

              {!isArchiveFormOpen && archiveError && <p className="mt-3 text-sm text-red-700">{archiveError}</p>}
              {flightCandidateError && <p className="mt-3 text-sm text-red-700">{flightCandidateError}</p>}

              {isArchiveFormOpen && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <label className="grid gap-1 text-sm font-medium text-gray-800">Archiving reason
                    <select value={archivingReasonId} onChange={(event) => setArchivingReasonId(event.target.value)} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2">
                      {archivingReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
                    </select>
                  </label>
                  {archivingReasons.length === 0 && <p className="mt-2 text-sm text-red-700">Create an archiving reason in shelter settings first.</p>}
                  {archiveError && <p className="mt-2 text-sm text-red-700">{archiveError}</p>}
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={archiveCat} disabled={isArchiving || !archivingReasonId} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isArchiving ? "Archiving..." : "Confirm archive"}</button>
                    <button type="button" onClick={() => setIsArchiveFormOpen(false)} className="rounded-lg border border-[#d4c7b4] px-4 py-2 text-sm font-semibold">Cancel</button>
                  </div>
                </div>
              )}

              <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
                {cat.tags.map((tag) => (
                  <span key={tag.id} style={tagChipStyle(tag)} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold text-gray-900">
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      disabled={removingTagId === tag.id}
                      className="text-gray-700 transition hover:text-red-700 disabled:opacity-50"
                      aria-label={`Remove ${tag.name} tag`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsTagPickerOpen((isOpen) => !isOpen);
                    setTagError(null);
                  }}
                  aria-label="Add tag"
                  title="Add tag"
                  className="inline-flex items-center justify-center rounded-full border border-dashed border-[#d05a2c]/45 bg-[#d05a2c]/10 px-2.5 py-1 text-xs font-semibold text-[#b24a20] transition hover:bg-[#d05a2c]/20"
                >
                  + tag
                </button>
                {isTagPickerOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-[#d4c7b4] bg-[#fff8ee] p-3 shadow-lg">
                    {tagsToAdd.length > 0 && (
                      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-auto">
                        {tagsToAdd.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => addTagByName(tag.name)}
                            disabled={isSavingTag}
                            style={tagChipStyle(tag)}
                            className="rounded-full border px-2.5 py-1 text-xs font-semibold text-gray-900 transition brightness-100 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <form onSubmit={handleAddTag} className="mt-2 flex gap-2">
                      <input
                        value={tagName}
                        onChange={(event) => setTagName(event.target.value)}
                        list="cat-tag-options"
                        className="min-w-0 flex-1 rounded-lg border border-[#d4c7b4] bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                        placeholder="New label"
                      />
                      <datalist id="cat-tag-options">
                        {availableTags.map((tag) => (
                          <option key={tag.id} value={tag.name} />
                        ))}
                      </datalist>
                      <button
                        type="submit"
                        disabled={isSavingTag}
                        className="rounded-lg border border-[#b24a20] bg-[#d05a2c] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingTag ? "..." : "Add"}
                      </button>
                    </form>
                    {tagError && <p className="mt-2 text-xs font-medium text-red-700">{tagError}</p>}
                  </div>
                )}
              </div>

              {(detailsError || detailsSuccess) && (
                <div className={`mt-5 rounded-lg border p-4 ${detailsError ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
                  <p className={`text-sm font-medium ${detailsError ? "text-red-800" : "text-green-800"}`}>
                    {detailsError || detailsSuccess}
                  </p>
                </div>
              )}

              {isEditingDetails && editForm ? (
                <form id="cat-details-form" onSubmit={handleDetailsSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Cat name
                      <input
                        value={editForm.name}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, name: event.target.value })}
                        disabled={isSavingDetails}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Cat number
                      <input
                        aria-label="Cat number"
                        type="number"
                        min={1}
                        step={1}
                        value={editForm.nameNumber}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, nameNumber: Number(event.target.value) })}
                        disabled={isSavingDetails}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Current location
                      <select
                        value={editForm.currentLocationId}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, currentLocationId: event.target.value })}
                        disabled={isLoadingLocations}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cat.currentLocationId && !locations.some((location) => location.id === cat.currentLocationId) && (
                          <option value={cat.currentLocationId}>{cat.currentLocationName || "Current location"}</option>
                        )}
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                      {locationsError && <span className="text-xs font-medium text-red-700">Locations could not be loaded: {locationsError}</span>}
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Sex
                      <select
                        value={editForm.sex}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, sex: event.target.value as CatSex })}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      >
                        <option value="UNKNOWN">Unknown</option>
                        <option value="FEMALE">Female</option>
                        <option value="MALE">Male</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Neutering status
                      <select
                        value={editForm.sterilizationStatus}
                        onChange={(event) =>
                          setEditForm((prev) => prev && { ...prev, sterilizationStatus: event.target.value as SterilizationStatus })
                        }
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      >
                        <option value="UNKNOWN">Unknown</option>
                        <option value="STERILIZED">Neutered</option>
                        <option value="NOT_STERILIZED">Not neutered</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Color
                      <input
                        value={editForm.color}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, color: event.target.value })}
                        list="cat-color-options"
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      />
                      <CatColorDatalist />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Birth date
                      <input type="date" value={editForm.estimatedBirthDate} onChange={(event) => setEditForm((prev) => prev && { ...prev, estimatedBirthDate: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Intake date
                      <input type="date" value={editForm.intakeDate} onChange={(event) => setEditForm((prev) => prev && { ...prev, intakeDate: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Microchip number
                      <input value={editForm.microchipNumber} onChange={(event) => setEditForm((prev) => prev && { ...prev, microchipNumber: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Intake details
                      <input value={editForm.intakeDetails} onChange={(event) => setEditForm((prev) => prev && { ...prev, intakeDetails: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Intake source
                      <select value={editForm.intakeSource} onChange={(event) => setEditForm((prev) => prev && { ...prev, intakeSource: event.target.value as CatEditForm["intakeSource"] })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]">
                        <option value="">Not set</option>
                        {Object.entries(INTAKE_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input type="checkbox" checked={editForm.passport} onChange={(event) => setEditForm((prev) => prev && { ...prev, passport: event.target.checked })} className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c] focus:ring-[#d05a2c]" />
                      Passport
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input type="checkbox" checked={editForm.felvFivTestDone} onChange={(event) => setEditForm((prev) => prev && { ...prev, felvFivTestDone: event.target.checked })} className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c] focus:ring-[#d05a2c]" />
                      FIV/FeLV test
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Sponsor name
                      <input value={editForm.sponsorName} onChange={(event) => setEditForm((prev) => prev && { ...prev, sponsorName: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Adopter name
                      <input value={editForm.adopterName} onChange={(event) => setEditForm((prev) => prev && { ...prev, adopterName: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800 md:col-span-2">
                      Adopter address
                      <input value={editForm.adopterAddress} onChange={(event) => setEditForm((prev) => prev && { ...prev, adopterAddress: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
                    </label>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={cancelEditingDetails}
                      className="rounded-xl border border-[#d4c7b4] bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isSavingDetails}
                      className="rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingDetails ? "Saving..." : "Save details"}
                    </button>
                  </div>
                </form>
              ) : (
                <dl className="mt-6 grid gap-x-6 gap-y-0 rounded-2xl bg-[#fff8ee]/85 p-4 sm:grid-cols-2">
                  {[
                    ["Current location", cat.currentLocationName || "Not assigned"],
                    ["Sex", sexLabels[cat.sex]],
                    ["Neutering status", sterilizationLabels[cat.sterilizationStatus]],
                    ["Color", cat.color || "Not set"],
                    ["Birth date", cat.estimatedBirthDate ? formatDateShort(cat.estimatedBirthDate) : "Not set"],
                    ["Intake date", cat.intakeDate ? formatDateShort(cat.intakeDate) : "Not set"],
                    ["Microchip number", cat.microchipNumber || "Not set"],
                    ["Intake details", cat.intakeDetails || "Not set"],
                    ["Intake source", cat.intakeSource ? INTAKE_SOURCE_LABELS[cat.intakeSource] : "Not set"],
                    ["Passport", cat.passport ? "Yes" : "No"],
                    ["FIV/FeLV test", cat.felvFivTestDone ? "Done" : "Not done"],
                    ["Sponsor name", cat.sponsorName || "Not set"],
                    ["Adopter name", cat.adopterName || "Not set"],
                    ["Adopter address", cat.adopterAddress || "Not set"],
                    ...(cat.archivingReasonName ? [["Archiving reason", cat.archivingReasonName] as const] : []),
                  ].map(([label, value]) => (
                    <div key={label} className={`min-w-0 border-b border-[#d4c7b4]/70 pb-2 last:border-b-0 ${label === "Birth date" && !cat.archivingReasonName ? "border-b-0 border-t sm:col-span-2" : (label === "Microchip number" && !cat.archivingReasonName) || label === "Intake date" || label === "Birth date" ? "border-b-0" : "sm:[&:nth-last-child(2)]:border-b-0"}`}>
                      <dt className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66] sm:whitespace-nowrap">{label}</dt>
                      <dd className="mt-0.5 truncate font-semibold text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              </div>
            </section>
            </>}
            {selectedSection === "tasks" && <div id="tasks"><CatTasks catId={cat.id} onChanged={refreshHistory} /></div>}
            {selectedSection === "treatments" && <div id="treatments"><CatTreatments catId={cat.id} onChanged={refreshHistory} refreshVersion={treatmentRefreshVersion} /></div>}
            {selectedSection === "medical-notes" && <div id="medical-notes"><CatMedicalNotes catId={cat.id} onChanged={refreshHistory} /></div>}
            {selectedSection === "vaccinations" && <div id="vaccinations"><CatVaccinations catId={cat.id} onChanged={refreshHistory} /></div>}
            {selectedSection === "parasite-treatments" && <div id="parasite-treatments"><CatParasiteTreatments catId={cat.id} onChanged={refreshHistory} /></div>}
            {selectedSection === "weight-history" && <section id="weight-history" className="md:col-span-2">
              <CatProfileSectionHeader title="Weight history" isExpanded={isWeightExpanded} onToggle={() => { setIsWeightFormOpen(false); setIsWeightExpanded((current) => !current); }} onAdd={() => setIsWeightFormOpen(true)} addLabel="Add weight" />

              {isWeightExpanded && <>
              {isWeightFormOpen && <form onSubmit={handleWeightSubmit} className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                <label className="grid gap-1 text-sm font-medium text-gray-800">
                  <span>Weight, kg <span className="text-red-700">*</span></span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                    placeholder="4.25"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-gray-800">
                  <span>Date <span className="text-red-700">*</span></span>
                  <input
                    type="date"
                    lang="en-GB"
                    value={weightDate}
                    onChange={(event) => setWeightDate(event.target.value)}
                    className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isAddingWeight}
                  className="rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAddingWeight ? "Adding..." : "Add weight"}
                </button>
              </form>}

              {weightError && <p className="mt-3 text-sm font-medium text-red-700">{weightError}</p>}
              {isLoadingWeights && <p className="mt-5 text-sm text-[#6d6a66]">Loading weight history...</p>}

              {!isLoadingWeights && weights.length === 0 && (
                <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/45 p-6 text-center">
                  <p className="text-sm text-[#6d6a66]">No weights recorded yet.</p>
                </div>
              )}

              {!isLoadingWeights && weights.length > 0 && (
                <>
                  <div className="mt-5 rounded-2xl border border-[#d4c7b4] bg-white/50 p-2">
                    <Plot
                      data={[{
                        type: "scatter",
                        mode: "lines+markers+text",
                        x: graphWeights.map((weight) => formatDateShort(weight.measuredAt)),
                        y: graphWeights.map((weight) => weight.weightKg),
                        text: graphWeights.map((weight) => weight.weightKg.toFixed(2)),
                        textposition: "top center",
                        line: { color: "#d05a2c", width: 3 },
                        marker: { color: "#d05a2c", size: 8 },
                        hovertemplate: "%{x}: %{y:.2f} kg<extra></extra>",
                      }]}
                      layout={{
                        autosize: true,
                        height: 260,
                        margin: { l: 50, r: 20, t: 30, b: 45 },
                        paper_bgcolor: "rgba(0,0,0,0)",
                        plot_bgcolor: "rgba(0,0,0,0)",
                        font: { color: "#6d6a66" },
                        xaxis: { title: "Date", fixedrange: true },
                        yaxis: { title: "Weight, kg", fixedrange: true },
                        showlegend: false,
                      }}
                      config={{ displayModeBar: false, responsive: true }}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#d4c7b4] bg-white/50">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#d05a2c]/10 text-[#6d6a66]">
                        <tr>
                          <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.1em]">Date</th>
                          <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.1em]">Weight</th>
                          <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-[0.1em]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d4c7b4]">
                        {weights.map((weight) => (
                          <tr key={weight.id}>
                            <td className="px-4 py-3 font-medium text-gray-900">{formatDateShort(weight.measuredAt)}</td>
                            <td className="px-4 py-3 text-gray-700">{weight.weightKg.toFixed(2)} kg</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveWeight(weight.id)}
                                disabled={removingWeightId === weight.id}
                                aria-label="Delete weight"
                                title="Delete weight"
                                className="rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              </>}
            </section>}
            {selectedSection === "history" && <div id="history"><CatHistory events={historyEvents} isLoading={isLoadingHistory} error={historyError} total={historyTotal} skip={historySkip} limit={historyLimit} onPageChange={setHistorySkip} onRestoreTreatment={restoreTreatment} onRestoreFlight={restoreFlight} /></div>}
          </div>
        )}

        {cat && (
          <nav aria-label="Cat page sections" className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-[#d4c7b4] bg-[#fff8ee]/95 p-2 shadow-xl backdrop-blur-md md:p-2.5">
            {isSectionMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 grid min-w-48 gap-1 rounded-xl border border-[#d4c7b4] bg-[#fff8ee] p-2 shadow-xl md:min-w-56 md:p-2">
                {[["vaccinations", "Vaccinations", faSyringe], ["parasite-treatments", "Parasite treatment", faBugs], ["medical-notes", "Medical notes", faNotesMedical], ["tasks", "Reminders", faListCheck], ["history", "Audit", faClockRotateLeft]].map(([id, label, icon]) => (
                  <button key={id as string} type="button" onClick={() => goToSection(id as string)} aria-label={label as string} title={label as string} aria-current={selectedSection === id ? "location" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition md:gap-3 md:px-3 md:py-2.5 ${selectedSection === id ? "bg-[#d05a2c]/15 text-[#b24a20]" : "text-gray-800 hover:bg-[#d05a2c]/10 hover:text-[#b24a20]"}`}><FontAwesomeIcon icon={icon as typeof faListCheck} className="w-4" aria-hidden="true" /><span>{label as string}</span></button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 md:gap-2">
              {[["profile", "Profile", faCat], ["media", "Gallery", faImages], ["treatments", "Treatments", faPills], ["weight-history", "Weight history", faWeightScale]].map(([id, label, icon]) => (
                <button key={id as string} type="button" onClick={() => goToSection(id as string)} aria-label={label as string} title={label as string} aria-current={selectedSection === id ? "location" : undefined} className={`flex h-10 w-10 items-center justify-center rounded-xl transition md:h-11 md:w-11 ${selectedSection === id ? "bg-[#d05a2c]/15 text-[#b24a20]" : "text-gray-800 hover:bg-[#d05a2c]/10 hover:text-[#b24a20]"}`}><FontAwesomeIcon icon={icon as typeof faCat} aria-hidden="true" /></button>
              ))}
              <button type="button" onClick={() => setIsSectionMenuOpen((open) => !open)} aria-expanded={isSectionMenuOpen} aria-label="More sections" title="More sections" className={`flex h-10 w-10 items-center justify-center rounded-xl text-white transition md:h-11 md:w-11 ${["vaccinations", "medical-notes", "parasite-treatments", "tasks", "history"].includes(selectedSection) ? "bg-[#b24a20] ring-2 ring-[#d05a2c]/30" : "bg-[#d05a2c] hover:bg-[#b24a20]"}`}>
                <FontAwesomeIcon icon={faEllipsis} aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}

        {cat && expandedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={`Photo of ${cat.name}`}>
            <button type="button" onClick={closePhoto} className="absolute inset-0 z-0 cursor-zoom-out" aria-label="Close expanded photo" />

            <div className="absolute left-4 top-4 z-30 rounded-full bg-black/35 px-3 py-1.5 text-sm font-semibold text-white">
              {expandedPhotoIndex + 1} / {photos.length}
            </div>

            <div className="absolute right-4 top-4 z-30 flex items-start gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPhotoMenuOpen((isOpen) => !isOpen)}
                  className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  aria-expanded={isPhotoMenuOpen}
                >
                  Actions
                </button>
                {isPhotoMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-white/20 bg-[#fff8ee] p-2 shadow-2xl">
                    {expandedPhoto.isPrimary && expandedPhoto.mediaType !== "video" && <button
                      type="button"
                      onClick={() => {
                        setIsPhotoPositionSelectorOpen((open) => !open);
                        setIsPhotoMenuOpen(false);
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#b24a20] transition hover:bg-[#d05a2c]/10"
                    >
                      {isPhotoPositionSelectorOpen ? "Hide frame selector" : "Adjust photo frame"}
                    </button>}
                    {!expandedPhoto.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryPhoto(expandedPhoto.id)}
                        disabled={settingPrimaryPhotoId === expandedPhoto.id}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#b24a20] transition hover:bg-[#d05a2c]/10 disabled:opacity-50"
                      >
                        {settingPrimaryPhotoId === expandedPhoto.id ? "Setting..." : "Make primary"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(expandedPhoto.id)}
                      disabled={removingPhotoId === expandedPhoto.id}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {removingPhotoId === expandedPhoto.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
              <button type="button" onClick={closePhoto} className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                Close
              </button>
            </div>

            {hasMultiplePhotos && (
              <button type="button" onClick={showPreviousPhoto} className="absolute left-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-3xl font-light text-white transition hover:bg-white/20" aria-label="Previous photo">
                ‹
              </button>
            )}

            <div className="relative z-10 flex max-h-[92dvh] w-[95vw] flex-col items-center gap-2">
              <div id="expanded-photo-viewport" className="relative h-[88dvh] w-full overflow-hidden rounded-2xl bg-black/30 shadow-2xl">
                {expandedPhoto.mediaType === "video" && (expandedPhoto.fullUrl ?? expandedPhoto.url) ? <video
                  src={expandedPhoto.fullUrl ?? expandedPhoto.url ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                  aria-label={`Video of ${cat.name}`}
                /> : (expandedPhoto.fullUrl ?? expandedPhoto.url) && <Image
                  src={expandedPhoto.fullUrl ?? expandedPhoto.url ?? ""}
                  alt={`Photo of ${cat.name}`}
                  fill
                  unoptimized
                  sizes="95vw"
                  onLoad={(event) => setPhotoNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                  className="object-contain"
                />}
                {expandedPhoto.isPrimary && isPhotoPositionSelectorOpen && photoFrameGeometry && <div
                    role="slider"
                    aria-label="Select vertical photo frame position"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={photoPositionY}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp") setPhotoPositionY((position) => Math.max(0, position - 2));
                      if (event.key === "ArrowDown") setPhotoPositionY((position) => Math.min(100, position + 2));
                    }}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
                      const availableHeight = photoFrameGeometry.imageHeight - photoFrameGeometry.height;
                      if (bounds && availableHeight > 0) setPhotoPositionY(Math.round(Math.max(0, Math.min(100, ((event.clientY - bounds.top - photoFrameGeometry.imageTop - photoFrameGeometry.height / 2) / availableHeight) * 100))));
                    }}
                    onPointerMove={(event) => {
                      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                      const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
                      const availableHeight = photoFrameGeometry.imageHeight - photoFrameGeometry.height;
                      if (bounds && availableHeight > 0) setPhotoPositionY(Math.round(Math.max(0, Math.min(100, ((event.clientY - bounds.top - photoFrameGeometry.imageTop - photoFrameGeometry.height / 2) / availableHeight) * 100))));
                    }}
                    className="absolute z-10 touch-none cursor-ns-resize border-y-2 border-dashed border-white bg-[#d05a2c]/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.42)] outline-none focus-visible:border-solid focus-visible:ring-2 focus-visible:ring-[#d05a2c]"
                    style={{ left: photoFrameGeometry.left, top: photoFrameGeometry.top, width: photoFrameGeometry.width, height: photoFrameGeometry.height }}
                  />}
              </div>
              {expandedPhoto.isPrimary && expandedPhoto.mediaType !== "video" && isPhotoPositionSelectorOpen && <div className="flex items-center gap-3">
                <p className="flex-1 text-xs text-white/80">Drag the frame vertically to choose the crop position.</p>
                <button type="button" onClick={() => savePhotoPosition(expandedPhoto.id)} disabled={isSavingPhotoPosition || photoPositionY === (cat.primaryPhotoPositionY ?? 50)} className="rounded-lg bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-50">{isSavingPhotoPosition ? "Saving…" : "Save position"}</button>
              </div>}
              <p className="text-xs font-medium text-white/75">Added {formatDate(expandedPhoto.createdAt)}</p>
            </div>

            {hasMultiplePhotos && (
              <button type="button" onClick={showNextPhoto} className="absolute right-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-3xl font-light text-white transition hover:bg-white/20" aria-label="Next photo">
                ›
              </button>
            )}
          </div>
        )}

        {cat && expandedDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={`Document preview: ${expandedDocument.fileName}`}>
            <button type="button" onClick={() => setExpandedDocumentId(null)} className="absolute inset-0 z-0" aria-label="Close document preview" />
            {hasMultipleDocuments && (
              <button type="button" onClick={showPreviousDocument} className="absolute left-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-3xl font-light text-white transition hover:bg-white/20" aria-label="Previous document">
                ‹
              </button>
            )}
            <div className="relative z-10 flex h-[92dvh] w-[95vw] max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-[#d4c7b4] bg-[#fff8ee] px-4 py-3">
                <p className="min-w-0 truncate text-sm font-semibold text-gray-900" title={expandedDocument.fileName}>{expandedDocument.fileName}{hasMultipleDocuments && <span className="ml-2 text-xs font-medium text-[#6d6a66]">{expandedDocumentIndex + 1} / {sortedDocuments.length}</span>}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <a href={expandedDocument.downloadUrl ?? undefined} className="rounded-lg border border-[#b24a20] px-3 py-1.5 text-xs font-semibold text-[#b24a20] transition hover:bg-[#d05a2c]/10">Download</a>
                  <button type="button" onClick={() => setExpandedDocumentId(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d05a2c] text-2xl font-light leading-none text-white transition hover:bg-[#b24a20]" aria-label="Close document preview">×</button>
                </div>
              </div>
              {(["jpg", "jpeg", "png"].includes(expandedDocument.fileName.toLowerCase().split(".").pop() ?? "") ? (
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black p-4">
                  {expandedDocument.url && <img src={expandedDocument.url} alt={expandedDocument.fileName} className="max-h-full max-w-full object-contain" />}
                </div>
              ) : (
                <iframe src={expandedDocument.url ?? undefined} title={`Preview of ${expandedDocument.fileName}`} className="min-h-0 flex-1 bg-white" />
              ))}
            </div>
            {hasMultipleDocuments && (
              <button type="button" onClick={showNextDocument} className="absolute right-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-3xl font-light text-white transition hover:bg-white/20" aria-label="Next document">
                ›
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
