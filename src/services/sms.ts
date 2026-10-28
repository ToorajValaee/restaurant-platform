import { env } from "../config/env.js";

export async function sendOtpSms(mobile: string, code: string) {
  if (!env.SMSIR_API_KEY || !env.SMSIR_TEMPLATE_ID) {
    if (env.NODE_ENV !== "production") console.log(`[OTP] ${mobile}: ${code}`);
    return;
  }

  const response = await fetch("https://api.sms.ir/v1/send/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": env.SMSIR_API_KEY,
    },
    body: JSON.stringify({
      mobile,
      templateId: Number(env.SMSIR_TEMPLATE_ID),
      parameters: [{ name: env.SMSIR_TEMPLATE_PARAM, value: code }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SMS.ir failed (${response.status}): ${body}`);
  }
}
