import { createServerFn } from "@tanstack/react-start";

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean; // true for 465 (SSL), false for 587/25 (STARTTLS)
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
};

type SendPayload = {
  config: EmailConfig;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export const sendEmailViaConfig = createServerFn({ method: "POST" })
  .inputValidator((d: SendPayload) => d)
  .handler(async ({ data }) => {
    const { config, to, subject, html, text } = data;
    if (!config?.host) throw new Error("SMTP host is required");
    if (!config?.port) throw new Error("SMTP port is required");
    if (!config?.fromEmail) throw new Error("From email is required");
    if (!to) throw new Error("Recipient is required");

    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port),
      secure: !!config.secure,
      auth: config.username
        ? { user: config.username, pass: config.password }
        : undefined,
    });

    const info = await transporter.sendMail({
      from: `${config.fromName || "Devionic"} <${config.fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, " "),
      replyTo: config.replyTo || undefined,
    });

    return { ok: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  });

export const verifySmtpConnection = createServerFn({ method: "POST" })
  .inputValidator((d: { config: EmailConfig }) => d)
  .handler(async ({ data }) => {
    const { config } = data;
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port),
      secure: !!config.secure,
      auth: config.username ? { user: config.username, pass: config.password } : undefined,
    });
    await transporter.verify();
    return { ok: true };
  });
