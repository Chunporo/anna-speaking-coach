import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AudioRecorder, speakText, stopSpeaking } from "@/lib/audioRecorder";
let recorder: AudioRecorder;
let media: any;
let events: any[];
let track: any;
let getUserMedia: any;
class Media {
  static supported = true;
  static isTypeSupported = () => Media.supported;
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: any;
  onstop: any;
  constructor(
    public stream: any,
    public options: any,
  ) {
    media = this;
  }
  start() {
    this.state = "recording";
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"]) });
    this.onstop?.();
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01"));
  events = [];
  track = { stop: vi.fn() };
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [track] });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  vi.stubGlobal("MediaRecorder", Media);
  Media.supported = true;
  URL.createObjectURL = vi.fn().mockReturnValue("blob:audio");
  URL.revokeObjectURL = vi.fn();
  recorder = new AudioRecorder((state) => events.push(state));
});
afterEach(() => {
  recorder.cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("records active time excluding pauses, emits blob and revokes playback on reset", async () => {
  recorder.pauseRecording();
  recorder.resumeRecording();
  await recorder.startRecording();
  media.ondataavailable({ data: new Blob([]) });
  vi.advanceTimersByTime(1200);
  expect(events.at(-1).recordingTime).toBe(1);
  recorder.pauseRecording();
  expect(events.at(-1).isPaused).toBe(true);
  vi.advanceTimersByTime(3000);
  recorder.resumeRecording();
  vi.advanceTimersByTime(1000);
  recorder.stopRecording();
  expect(events.at(-1)).toMatchObject({
    isRecording: false,
    recordingTime: 2,
    audioUrl: "blob:audio",
  });
  expect(events.at(-1).audioBlob.size).toBe(5);
  recorder.resetRecording();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:audio");
  expect(events.at(-1)).toMatchObject({ recordingTime: 0, audioBlob: null });
  expect(track.stop).toHaveBeenCalled();
});
it("automatically stops after five minutes", async () => {
  await recorder.startRecording();
  vi.advanceTimersByTime(300000);
  expect(media.state).toBe("inactive");
  expect(events.at(-1).recordingTime).toBe(300);
});
it("stops while paused without counting paused time and supports browser default codec", async () => {
  Media.supported = false;
  await recorder.startRecording();
  expect(media.options).toBeUndefined();
  vi.advanceTimersByTime(1000);
  recorder.pauseRecording();
  vi.advanceTimersByTime(5000);
  media.mimeType = "";
  recorder.stopRecording();
  expect(events.at(-1).recordingTime).toBe(1);
  expect(events.at(-1).audioBlob.type).toBe("audio/webm");
});
it("discards microphone permission responses after cleanup", async () => {
  let resolve: any;
  getUserMedia.mockReturnValue(new Promise((r) => (resolve = r)));
  const start = recorder.startRecording();
  recorder.cleanup();
  resolve({ getTracks: () => [track] });
  await start;
  expect(track.stop).toHaveBeenCalled();
  expect(events).toHaveLength(0);
});
it.each([new Error("Denied"), {}])(
  "reports permission errors and rethrows them",
  async (error) => {
    getUserMedia.mockRejectedValue(error);
    await expect(recorder.startRecording()).rejects.toBe(error);
    expect(events.at(-1).error).toBe(
      error instanceof Error ? "Denied" : "Failed to access microphone",
    );
  },
);
it("ignores stale permission failures after a reset", async () => {
  let reject: any;
  getUserMedia.mockReturnValue(new Promise((_, r) => (reject = r)));
  const pending = recorder.startRecording();
  recorder.resetRecording();
  reject(new Error("late"));
  await pending;
  expect(events).toHaveLength(1);
  expect(events[0].error).toBeNull();
});
it("speaks configured English speech and resolves when it ends", async () => {
  let utterance: any;
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(),
    speak: vi.fn((u) => (utterance = u)),
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  const pending = speakText("Hello", 1);
  expect(utterance).toMatchObject({
    text: "Hello",
    lang: "en-US",
    rate: 0.9,
    pitch: 1,
    volume: 1,
  });
  utterance.onend();
  await pending;
  stopSpeaking();
  expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(2);
});
it("rejects speech synthesis errors", async () => {
  let utterance: any;
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(),
    speak: vi.fn((u) => (utterance = u)),
  });
  vi.stubGlobal("SpeechSynthesisUtterance", class {});
  const pending = speakText("Hello", 1);
  utterance.onerror(new Error("voice unavailable"));
  await expect(pending).rejects.toThrow("voice unavailable");
});
it("reports unsupported speech browsers", async () => {
  delete (window as any).speechSynthesis;
  await expect(speakText("Hello", 1)).rejects.toThrow(
    "Speech synthesis not supported",
  );
  stopSpeaking();
});
