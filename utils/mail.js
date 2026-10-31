import dns from "dns";
import nodemailer from "nodemailer";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // older Node versions
}

function env(name) {
  return (process.env[name] || "").trim();
}

function parseFrom(from = "") {
  const match = String(from).match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, "") || "SiwCarry",
      email: match[2].trim(),
    };
  }
  return {
    name: "SiwCarry",
    email: from || env("ADMIN_EMAIL") || env("SMTP_USER"),
  };
}

/** Brevo HTTPS API — required on Railway Hobby (SMTP is blocked) */
async function sendWithBrevo({ to, subject, text, html }) {
  const apiKey = env("BREVO_API_KEY");
  const sender = parseFrom(env("SMTP_FROM") || env("ADMIN_EMAIL") || env("SMTP_USER"));

  if (apiKey.startsWith("xsmtpsib-")) {
    throw new Error(
      "BREVO_API_KEY looks like an SMTP key (xsmtpsib-...). Create an API key in Brevo: Settings → SMTP & API → API keys (not SMTP).",
    );
  }

  console.log(`[email] sending via Brevo API to ${to}`);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: sender.name, email: sender.email },
      to: [{ email: to }],
      subject,
      htmlContent: html || `<pre>${text || ""}</pre>`,
      textContent: text || "",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo email failed (${response.status}): ${body}`);
  }
}

async function sendWithResend({ to, subject, text, html }) {
  const apiKey = env("RESEND_API_KEY");
  const from = env("SMTP_FROM") || env("RESEND_FROM") || "SiwCarry <onboarding@resend.dev>";

  console.log(`[email] sending via Resend API to ${to}`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }
}

function lookupIpv4(hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
  }
  dns.lookup(hostname, { family: 4 }, callback);
}

/** Local SMTP only — blocked on Railway Hobby/Free */
async function sendWithSmtp({ to, subject, text, html }) {
  const smtpHost = env("SMTP_HOST") || "smtp.gmail.com";
  const smtpUser = env("SMTP_USER");
  const smtpPassword = env("SMTP_PASSWORD");

  if (!smtpUser || !smtpPassword) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[email skipped] ${subject} -> ${to}\n${text}`);
      return;
    }
    throw new Error(
      "Email not configured. On Railway set BREVO_API_KEY (API key, not SMTP key).",
    );
  }

  console.warn("[email] using SMTP — this will fail on Railway Hobby/Free");

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: 587,
    secure: false,
    requireTLS: true,
    family: 4,
    lookup: lookupIpv4,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: { user: smtpUser, pass: smtpPassword },
    tls: { servername: smtpHost, minVersion: "TLSv1.2" },
  });

  await transporter.sendMail({
    from: env("SMTP_FROM") || smtpUser,
    to,
    subject,
    text,
    html,
  });
}

export async function sendMail({ to, subject, text, html }) {
  if (env("BREVO_API_KEY")) {
    return sendWithBrevo({ to, subject, text, html });
  }

  if (env("RESEND_API_KEY")) {
    return sendWithResend({ to, subject, text, html });
  }

  return sendWithSmtp({ to, subject, text, html });
}
