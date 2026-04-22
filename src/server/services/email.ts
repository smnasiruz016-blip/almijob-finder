import { log } from "@/lib/logger";

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

class DevEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, html: string) {
    log("info", "Email stub invoked", {
      deliveryMode: process.env.ALERT_DELIVERY_MODE ?? "stub",
      to,
      subject,
      preview: html.slice(0, 120)
    });
  }
}

export function getEmailProvider(): EmailProvider {
  return new DevEmailProvider();
}
