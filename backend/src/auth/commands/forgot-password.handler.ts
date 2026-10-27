import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ForgotPasswordHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async handle(email: string, captchaToken: string): Promise<void> {
    const recaptchaSecret = this.config.get<string>("recaptcha.secretKey");
    if (!recaptchaSecret) {
      throw new ServiceUnavailableException("CAPTCHA verification is not configured");
    }
    const captchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: recaptchaSecret, response: captchaToken }),
    });
    if (!captchaResponse.ok) {
      throw new ServiceUnavailableException("CAPTCHA verification is unavailable");
    }
    const captchaResult = (await captchaResponse.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
    };
    if (
      captchaResult.success !== true ||
      captchaResult.action !== "forgot_password" ||
      typeof captchaResult.score !== "number" ||
      captchaResult.score < 0.5
    ) {
      throw new BadRequestException("CAPTCHA verification failed");
    }

    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, passwordHash: { not: null } },
      select: { id: true, email: true },
    });
    if (!user) return;

    const smtp = this.config.get<{
      host?: string;
      port?: number;
      secure?: boolean;
      user?: string;
      password?: string;
      from?: string;
    }>("email");
    if (!smtp?.user || !smtp.password || !smtp.from) {
      throw new ServiceUnavailableException("Password reset email is not configured");
    }

    const temporaryPassword = randomBytes(12).toString("base64url");
    const transporter = nodemailer.createTransport({
      host: smtp.host || "smtp.gmail.com",
      port: smtp.port || 465,
      secure: smtp.secure ?? true,
      auth: { user: smtp.user, pass: smtp.password },
    });
    await transporter.sendMail({
      from: smtp.from,
      to: user.email,
      subject: "Friends of Larnaca Cats password reset",
      text: `Friends of Larnaca Cats password reset\n\nYour temporary password (copy the line below):\n${temporaryPassword}\n\nSign in with this password and change it immediately.`,
      html: `<p>Friends of Larnaca Cats password reset</p><p>Your temporary password (copy the line below):</p><p><code style="font-family: monospace; font-size: 16px; user-select: all;">${temporaryPassword}</code></p><p>Sign in with this password and change it immediately.</p>`,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(temporaryPassword, 10),
        passwordChangeRequired: true,
        version: { increment: 1 },
      },
    });
  }
}
