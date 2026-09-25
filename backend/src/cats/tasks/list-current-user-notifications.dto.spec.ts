import { BadRequestException } from "@nestjs/common";
import { ListCurrentUserNotificationsDto } from "./list-current-user-notifications.dto";

describe("ListCurrentUserNotificationsDto", () => {
  it("uses default pagination and projects the current user", () => {
    const dto = new ListCurrentUserNotificationsDto();
    expect(dto.toQuery("user-1", true)).toEqual({
      userId: "user-1",
      isTest: true,
      skip: 0,
      limit: 50,
    });
  });

  it("parses supplied pagination", () => {
    const dto = Object.assign(new ListCurrentUserNotificationsDto(), { skip: "5", limit: "10" });
    expect(dto.toQuery("user-1", false)).toEqual({
      userId: "user-1",
      isTest: false,
      skip: 5,
      limit: 10,
    });
  });

  it("rejects invalid skip values", () => {
    const dto = Object.assign(new ListCurrentUserNotificationsDto(), { skip: "-1" });
    expect(() => dto.toQuery("user-1", false)).toThrow(BadRequestException);
  });

  it("rejects non-integer pagination and oversized limits", () => {
    const nonInteger = Object.assign(new ListCurrentUserNotificationsDto(), { limit: "1.5" });
    expect(() => nonInteger.toQuery("user-1", false)).toThrow(BadRequestException);
    const oversized = Object.assign(new ListCurrentUserNotificationsDto(), { limit: "101" });
    expect(() => oversized.toQuery("user-1", false)).toThrow(BadRequestException);
  });
});
