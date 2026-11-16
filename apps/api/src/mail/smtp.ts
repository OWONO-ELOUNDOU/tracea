import nodemailer, { type Transporter } from "nodemailer";
import type { Mail, Mailer } from "./mailer.js";

export class SmtpMailer implements Mailer {
  private readonly transporter: Transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport(smtpUrl);
  }

  async send(mail: Mail): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...mail });
  }
}
