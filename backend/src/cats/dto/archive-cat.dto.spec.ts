import { validate } from "class-validator";
import { ArchiveCatDto } from "./create-cat-archiving-reason.dto";

describe("ArchiveCatDto", () => {
  it("converts the provided date to midnight UTC in its command", () => {
    const dto = Object.assign(new ArchiveCatDto(), {
      reasonId: "reason-id",
      archivingDate: "2024-06-15",
    });

    expect(dto.toCommand("cat-id", "actor-id", true)).toEqual({
      catId: "cat-id",
      reasonId: "reason-id",
      archivedAt: new Date("2024-06-15T00:00:00.000Z"),
      actorUserId: "actor-id",
      currentUserIsTest: true,
    });
  });

  it("rejects a missing or invalid archiving date", async () => {
    const missingDate = Object.assign(new ArchiveCatDto(), { reasonId: "reason-id" });
    const invalidDate = Object.assign(new ArchiveCatDto(), {
      reasonId: "reason-id",
      archivingDate: "not-a-date",
    });

    await expect(validate(missingDate)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "archivingDate" })]),
    );
    await expect(validate(invalidDate)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "archivingDate" })]),
    );
  });
});
