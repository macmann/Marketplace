export interface VerificationProvider {
  start(phone: string): Promise<string>;
  check(sid: string, code: string): Promise<boolean>;
}
export class VerificationUnavailable extends Error {
  constructor() {
    super("Verification provider unavailable");
  }
}
export function smsConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  );
}
export class TwilioVerificationProvider implements VerificationProvider {
  constructor(private transport: typeof fetch = fetch) {}
  private async request(path: string, body: Record<string, string>) {
    if (!smsConfigured()) throw new VerificationUnavailable();
    let response: Response;
    try {
      response = await this.transport(
        `https://verify.twilio.com/v2/Services/${encodeURIComponent(process.env.TWILIO_VERIFY_SERVICE_SID!)}/${path}`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                process.env.TWILIO_ACCOUNT_SID +
                  ":" +
                  process.env.TWILIO_AUTH_TOKEN,
              ).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(body),
          signal: AbortSignal.timeout(15000),
        },
      );
    } catch {
      throw new VerificationUnavailable();
    }
    if (response.status === 404 && path === "VerificationCheck")
      return { status: "expired" };
    if (!response.ok) throw new VerificationUnavailable();
    try {
      return await response.json();
    } catch {
      throw new VerificationUnavailable();
    }
  }
  async start(phone: string) {
    const data = await this.request("Verifications", {
      To: phone,
      Channel: "sms",
    });
    if (typeof data.sid !== "string" || !/^VE[a-fA-F0-9]{32}$/.test(data.sid))
      throw new VerificationUnavailable();
    return data.sid;
  }
  async check(sid: string, code: string) {
    const data = await this.request("VerificationCheck", {
      VerificationSid: sid,
      Code: code,
    });
    return data.status === "approved";
  }
}
