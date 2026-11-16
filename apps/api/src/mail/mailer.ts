export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Keeps sent mail in memory; used by tests to read verification and reset links. */
export class MemoryMailer implements Mailer {
  readonly sent: Mail[] = [];

  send(mail: Mail): Promise<void> {
    this.sent.push(mail);
    return Promise.resolve();
  }

  lastTo(email: string): Mail | undefined {
    return [...this.sent].reverse().find((mail) => mail.to === email);
  }
}
