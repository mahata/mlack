import { randomInt } from "node:crypto";

const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_CODE_MAX = 10 ** VERIFICATION_CODE_LENGTH;
export const VERIFICATION_EXPIRY_MS = 10 * 60 * 1000;

export function generateVerificationCode(): string {
  const code = randomInt(0, VERIFICATION_CODE_MAX);
  return code.toString().padStart(VERIFICATION_CODE_LENGTH, "0");
}

export function createExpiresAt(): string {
  return new Date(Date.now() + VERIFICATION_EXPIRY_MS).toISOString();
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

type SendEmailResult = { success: true } | { success: false; error: string };

export async function sendVerificationEmail(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  code: string,
): Promise<SendEmailResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: "Mlack - Verify your email",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #333;">Verify your email</h2>
          <p style="color: #555; font-size: 16px;">Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">${code}</span>
          </div>
          <p style="color: #888; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Resend API error:", response.status, body);
    return { success: false, error: "Failed to send verification email." };
  }

  return { success: true };
}
