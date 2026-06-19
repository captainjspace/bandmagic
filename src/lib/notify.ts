import { google } from "googleapis";
import { config } from "./config";
import type { TrackGroup } from "@/types";

const siteConfig = {
  site:{
  host:   "superblackout",
  domain: "rollingblackout.band"
  },
  url:()=> {
    return `https://${siteConfig.site.host}.${siteConfig.site.domain}`;
  }
};

export async function sendReleaseNotification(trackGroup: TrackGroup) {
  const promises: Promise<unknown>[] = [];

  if (config.notifyEmails.length > 0) {
    promises.push(sendEmail(trackGroup));
  }
  if (config.chatWebhook) {
    promises.push(sendChatMessage(trackGroup));
  }

  await Promise.allSettled(promises);
}

async function sendEmail(trackGroup: TrackGroup) {
  const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/gmail.send"] });
  const gmail = google.gmail({ version: "v1", auth });

  const tracklist = trackGroup.tracks.map((t, i) => `  ${i + 1}. ${t.title}`).join("\n");
  const body = [
    `New trackGroup: ${trackGroup.title}`,
    "",
    trackGroup.description ?? "",
    "",
    "Tracks:",
    tracklist,
    "",
    `Listen: ${process.env.APP_URL ?? siteConfig.url}/track-group/${trackGroup.id}`,
  ].join("\n");

  const message = [
    `To: ${config.notifyEmails.join(", ")}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: New TrackGroup: ${trackGroup.title}`,
    "",
    body,
  ].join("\n");

  const encoded = Buffer.from(message).toString("base64url");
  await gmail.users.messages.send({ userId: "me", requestBody: { raw: encoded } });
}

async function sendChatMessage(trackGroup: TrackGroup) {
  const text = `🎵 *New track group: ${trackGroup.title}*\n${trackGroup.description ?? ""}\n${trackGroup.tracks.length} tracks — ${process.env.APP_URL ?? siteConfig.url}/track-group/${trackGroup.id}`;
  await fetch(config.chatWebhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
