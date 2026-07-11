/**
 * Singleton background music controller.
 * Persists the Audio instance across soft navigations within the same tab.
 */

const STORAGE_KEY = 'music_playing';

let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/backgroundmusic.mp3');
    audio.loop = true;
    audio.volume = 0.35;
  }
  return audio;
}

export function isMusicPlaying(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setMusicPreference(playing: boolean) {
  localStorage.setItem(STORAGE_KEY, playing ? 'true' : 'false');
}

export async function playMusic(): Promise<void> {
  const a = getAudio();
  setMusicPreference(true);
  try {
    await a.play();
  } catch {
    // Autoplay blocked — preference is saved, user can retry
  }
}

export function pauseMusic(): void {
  if (!audio) return;
  audio.pause();
  setMusicPreference(false);
}

export function isActuallyPlaying(): boolean {
  return !!audio && !audio.paused;
}
