import nodemailer from "nodemailer";
import { z } from "zod";
export interface EmailProvider {
  send(
    email: string,
    code: string,
    purpose: "VERIFY" | "RECOVER",
  ): Promise<void>;
}
export function smtpConfiguration() {
  const port = Number(process.env.SMTP_PORT ?? 587),
    from = process.env.EMAIL_FROM ?? "",
    host = process.env.SMTP_HOST ?? "";
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;
  if (
    !host ||
    /[\r\n]/.test(host) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !z.email().safeParse(from).success ||
    Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASSWORD) ||
    (process.env.SMTP_SECURE &&
      !["true", "false"].includes(process.env.SMTP_SECURE))
  )
    return null;
  return {
    host,
    port,
    secure,
    from,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD! }
      : undefined,
  };
}
export function emailConfigured() {
  return !!smtpConfiguration();
}
type Message = {
  from: { name: string; address: string };
  to: string;
  subject: string;
  text: string;
};
type Transport = {
  sendMail: (
    message: Message,
  ) => Promise<{ accepted?: unknown[]; rejected?: unknown[] }>;
};
export class SmtpEmailProvider implements EmailProvider {
  constructor(
    private factory: (options: Record<string, unknown>) => Transport = (
      options,
    ) => nodemailer.createTransport(options),
  ) {}
  async send(email: string, code: string, purpose: "VERIFY" | "RECOVER") {
    const config = smtpConfiguration();
    if (!config || !z.email().safeParse(email).success || !/^\d{6}$/.test(code))
      throw Error("email_unavailable");
    const transport = this.factory({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      auth: config.auth,
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    });
    const result = await transport.sendMail({
      from: { name: "Neighbour", address: config.from },
      to: email,
      subject:
        purpose === "VERIFY"
          ? "Verify your Neighbour email"
          : "Reset your Neighbour password",
      text: `${purpose === "VERIFY" ? "Email verification" : "Password recovery"} code: ${code}\n\nThis code expires in 10 minutes and can be used once. Never share it.\n\nအတည်ပြုကုဒ်: ${code}\n၁၀ မိနစ်အတွင်း တစ်ကြိမ်သာ အသုံးပြုနိုင်ပါသည်။ အခြားသူအား မပေးပါနှင့်။\n\nIf you did not request this code, ignore this message.`,
    });
    if (!result.accepted?.length || result.rejected?.length)
      throw Error("email_unavailable");
  }
}
