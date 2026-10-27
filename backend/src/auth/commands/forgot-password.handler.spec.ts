import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ForgotPasswordHandler } from "./forgot-password.handler";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({
  createTransport: () => ({ sendMail }),
}));

describe("ForgotPasswordHandler", () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, score: 0.9, action: "forgot_password" }) }));
  });

  it("emails a generated temporary password and marks the account for replacement", async () => {
    await runInTestTransaction(async (tx) => {
      const email = `${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const user = await tx.user.create({ data: { email, passwordHash: "old-hash" } });
      const config = {
        get: (key: string) => key === "recaptcha.secretKey" ? "captcha-secret" : ({ host: "smtp.gmail.com", port: 465, secure: true, user: "sender@gmail.com", password: "app-pass", from: "sender@gmail.com" }),
      } as unknown as ConfigService;

      await new ForgotPasswordHandler(tx as PrismaService, config).handle(email, "captcha-token");

      const updated = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(updated.passwordChangeRequired).toBe(true);
      const sentMessage = sendMail.mock.calls[0][0];
      const mailedPassword = sentMessage.text.split("\n")[3];
      expect(await bcrypt.compare(mailedPassword, updated.passwordHash!)).toBe(true);
      expect(sentMessage).toMatchObject({
        to: email,
        subject: "Friends of Larnaca Cats password reset",
        html: expect.stringContaining(`>${mailedPassword}</code>`),
      });
    });
  });

  it("does nothing for unknown or passwordless accounts", async () => {
    await runInTestTransaction(async (tx) => {
      const config = { get: (key: string) => key === "recaptcha.secretKey" ? "captcha-secret" : undefined } as unknown as ConfigService;
      await new ForgotPasswordHandler(tx as PrismaService, config).handle("missing@example.com", "captcha-token");
      expect(sendMail).not.toHaveBeenCalled();
    });
  });

  it("does not replace the password if sending fails", async () => {
    await runInTestTransaction(async (tx) => {
      const email = `${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const user = await tx.user.create({ data: { email, passwordHash: "old-hash" } });
      sendMail.mockRejectedValueOnce(new Error("SMTP unavailable"));
      const config = {
        get: (key: string) => key === "recaptcha.secretKey" ? "captcha-secret" : ({ user: "sender@gmail.com", password: "app-pass", from: "sender@gmail.com" }),
      } as unknown as ConfigService;

      await expect(new ForgotPasswordHandler(tx as PrismaService, config).handle(email, "captcha-token")).rejects.toThrow("SMTP unavailable");
      await expect(tx.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ passwordHash: "old-hash", version: 0 });
    });
  });
});
