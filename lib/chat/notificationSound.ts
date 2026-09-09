/**
 * Agent inbox new-message chime.
 * Served from Tomcat under `/SES` (not the Next app basePath `/SES/social_media`).
 * Final URL: `{origin}/SES/assets/audio/notification.mp3`
 */

const SOUND_PATH = "/assets/audio/notification.mp3";
/** Tomcat / SES root — domain + this + SOUND_PATH. */
const SOUND_BASE_PATH = "/SES";

let notificationAudio: HTMLAudioElement | null = null;
let unlocked = false;

function resolveNotificationSoundUrl(): string {
  const soundPath = SOUND_PATH.startsWith("/") ? SOUND_PATH : `/${SOUND_PATH}`;
  const base = SOUND_BASE_PATH.endsWith("/")
    ? SOUND_BASE_PATH.slice(0, -1)
    : SOUND_BASE_PATH;
  return `${base}${soundPath}`;
}

function getNotificationAudio(): HTMLAudioElement {
  if (!notificationAudio) {
    notificationAudio = new Audio(resolveNotificationSoundUrl());
    notificationAudio.preload = "auto";
    notificationAudio.volume = 0.6;
  }
  return notificationAudio;
}

/** Silently play/pause once so later `play()` is allowed by the browser. */
export function unlockNotificationSound(): void {
  if (typeof window === "undefined" || unlocked) return;
  try {
    const audio = getNotificationAudio();
    const prevVolume = audio.volume;
    audio.volume = 0;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = prevVolume;
        unlocked = true;
      })
      .catch(() => {
        audio.volume = prevVolume;
      });
  } catch {
    // ignore
  }
}

/** Call once from a client layout/dashboard so the first click/key unlocks audio. */
export function ensureNotificationSoundUnlockedOnGesture(): () => void {
  if (typeof window === "undefined") return () => {};

  const onGesture = () => {
    unlockNotificationSound();
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  };

  window.addEventListener("pointerdown", onGesture, { once: true });
  window.addEventListener("keydown", onGesture, { once: true });

  return () => {
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  };
}

export function playNewMessageNotificationSound(): void {
  if (typeof window === "undefined") return;
  try {
    const audio = getNotificationAudio();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Still blocked — unlock on next gesture; no-op here.
    });
  } catch {
    // ignore missing / blocked audio
  }
}
