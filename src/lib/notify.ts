import { google } from "googleapis";
import { config } from "./config";
import type { Release } from "@/types";

const siteConfig = {
  site:{
  host:   "superblackout",
  domain: "rollingblackout.band"
  },
  url:()=> {
    return `https://${siteConfig.site.host}.${siteConfig.site.domain}`;
  }
};

export async function sendReleaseNotification(release: Release) {
  const promises: Promise<unknown>[] = [];

  if (config.notifyEmails.length > 0) {
    promises.push(sendEmail(release));
  }
  if (config.chatWebhook) {
    promises.push(sendChatMessage(release));
  }

  await Promise.allSettled(promises);
}

async function sendEmail(release: Release) {
  const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/gmail.send"] });
  const gmail = google.gmail({ version: "v1", auth });

  const tracklist = release.tracks.map((t, i) => `  ${i + 1}. ${t.title}`).join("\n");
  const body = [
    `New release: ${release.title}`,
    "",
    release.description ?? "",
    "",
    "Tracks:",
    tracklist,
    "",
    `Listen: ${process.env.APP_URL ?? siteConfig.url}/release/${release.id}`,
  ].join("\n");

  const message = [
    `To: ${config.notifyEmails.join(", ")}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: New Release: ${release.title}`,
    "",
    body,
  ].join("\n");

  const encoded = Buffer.from(message).toString("base64url");
  await gmail.users.messages.send({ userId: "me", requestBody: { raw: encoded } });
}

async function sendChatMessage(release: Release) {
  const text = `🎵 *New release: ${release.title}*\n${release.description ?? ""}\n${release.tracks.length} tracks — ${process.env.APP_URL ?? siteConfig.url}}/release/${release.id}`;
  await fetch(config.chatWebhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
