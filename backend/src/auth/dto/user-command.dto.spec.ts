import {
  ChangePasswordDto,
  CreateUserDto,
  PasswordLoginDto,
  ReplaceTemporaryPasswordDto,
  UpdateUserDto,
} from "./index";

describe("user DTO command conversion", () => {
  it("normalizes all create-user fields into a plain command", () => {
    const dto = Object.assign(new CreateUserDto(), {
      email: " USER@EXAMPLE.COM ",
      fullName: "  User Name  ",
      role: "admin" as const,
      status: "inactive" as const,
      password: "Password123!",
      isTest: true,
    });
    expect(dto.toCommand()).toEqual({
      email: "user@example.com",
      fullName: "User Name",
      role: "admin",
      status: "inactive",
      password: "Password123!",
      isTest: true,
    });
  });

  it("preserves omitted optional create-user name", () => {
    const dto = Object.assign(new CreateUserDto(), {
      email: "user@example.com",
      role: "staff" as const,
      status: "active" as const,
      password: "Password123!",
      isTest: false,
    });
    expect(dto.toCommand()).toEqual({
      email: "user@example.com",
      fullName: undefined,
      role: "staff",
      status: "active",
      password: "Password123!",
      isTest: false,
    });
  });

  it("normalizes only populated update-user fields", () => {
    const dto = Object.assign(new UpdateUserDto(), {
      fullName: "  New Name  ",
      role: "admin" as const,
      password: "NewPassword123!",
    });
    expect(dto.toCommand()).toEqual({
      fullName: "New Name",
      role: "admin",
      password: "NewPassword123!",
    });
  });

  it("keeps explicitly empty update fields for handler validation/clearing", () => {
    const dto = Object.assign(new UpdateUserDto(), {
      fullName: "   ",
      status: "inactive" as const,
    });
    expect(dto.toCommand()).toEqual({ fullName: "", status: "inactive" });
  });

  it("normalizes password-login email before handing off the command", () => {
    const dto = Object.assign(new PasswordLoginDto(), {
      email: " User@Example.com ",
      password: "Password123!",
    });
    expect(dto.toCommand()).toEqual({
      email: "user@example.com",
      password: "Password123!",
    });
  });

  it("projects the actor and passwords for change-password commands", () => {
    const dto = Object.assign(new ChangePasswordDto(), {
      currentPassword: "Current123!",
      newPassword: "NewPassword123!",
      newPasswordConfirmation: "NewPassword123!",
    });
    expect(dto.toCommand("user-1")).toEqual({
      userId: "user-1",
      currentPassword: "Current123!",
      newPassword: "NewPassword123!",
    });
  });

  it("rejects mismatched change-password confirmations", () => {
    const dto = Object.assign(new ChangePasswordDto(), {
      currentPassword: "Current123!",
      newPassword: "NewPassword123!",
      newPasswordConfirmation: "Different123!",
    });
    expect(() => dto.toCommand("user-1")).toThrow("New passwords do not match");
  });

  it("projects the actor for temporary-password commands", () => {
    const dto = Object.assign(new ReplaceTemporaryPasswordDto(), {
      newPassword: "NewPassword123!",
      newPasswordConfirmation: "NewPassword123!",
    });
    expect(dto.toCommand("user-1")).toEqual({
      userId: "user-1",
      newPassword: "NewPassword123!",
    });
  });

  it("rejects mismatched temporary-password confirmations", () => {
    const dto = Object.assign(new ReplaceTemporaryPasswordDto(), {
      newPassword: "NewPassword123!",
      newPasswordConfirmation: "Different123!",
    });
    expect(() => dto.toCommand("user-1")).toThrow("New passwords do not match");
  });
});
