import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useQuestion } from "@/hooks/useQuestion";
import { usePracticeHistory } from "@/hooks/usePracticeHistory";
import { usePracticeSubmission } from "@/hooks/usePracticeSubmission";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
const mock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  speak: vi.fn(),
  stop: vi.fn(),
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  reset: vi.fn(),
  finish: vi.fn(),
  cleanup: vi.fn(),
  callback: null as any,
}));
vi.mock("@/lib/api", () => ({ default: { get: mock.get, post: mock.post } }));
vi.mock("@/lib/audioRecorder", () => ({
  speakText: mock.speak,
  stopSpeaking: mock.stop,
  AudioRecorder: class {
    constructor(callback: any) {
      mock.callback = callback;
    }
    startRecording = mock.start;
    stopRecording = mock.finish;
    pauseRecording = mock.pause;
    resumeRecording = mock.resume;
    resetRecording = mock.reset;
    cleanup = mock.cleanup;
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mock.get.mockResolvedValue({ data: { id: 7 } });
  mock.post.mockResolvedValue({ data: { id: 9 } });
  mock.start.mockResolvedValue(undefined);
  mock.speak.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
it("question hook skips absent ids, fetches questions and reports failures on changed id", async () => {
  const { result, rerender } = renderHook(({ id }) => useQuestion(id), {
    initialProps: { id: 0 },
  });
  expect(mock.get).not.toHaveBeenCalled();
  rerender({ id: 7 });
  await waitFor(() => expect(result.current.question).toEqual({ id: 7 }));
  expect(result.current.loading).toBe(false);
  mock.get.mockRejectedValueOnce(new Error("offline"));
  rerender({ id: 8 });
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.loading).toBe(false);
});
it("history hook skips missing ids and allows failed requests to be retried", async () => {
  const { result, rerender } = renderHook(({ id }) => usePracticeHistory(id), {
    initialProps: { id: 0 },
  });
  expect(mock.get).not.toHaveBeenCalled();
  mock.get.mockRejectedValueOnce(new Error("offline"));
  rerender({ id: 7 });
  await waitFor(() =>
    expect(result.current.error).toBe("Failed to load practice history"),
  );
  mock.get.mockResolvedValue({ data: { sessions: [], total_practices: 0 } });
  await act(() => result.current.refetch());
  expect(result.current.practiceHistory).toEqual({
    sessions: [],
    total_practices: 0,
  });
  expect(result.current.error).toBeNull();
});
it("submission uploads actual FormData, awaits callback, and clears result", async () => {
  const { result } = renderHook(usePracticeSubmission);
  let resolve: any;
  const success = vi.fn(() => new Promise<void>((r) => (resolve = r)));
  let pending: any;
  act(() => {
    pending = result.current.submitRecording(
      new Blob(["audio"], { type: "audio/webm" }),
      { id: 7, part: 2 } as any,
      success,
    );
  });
  await waitFor(() => expect(success).toHaveBeenCalledWith({ id: 9 }));
  expect(result.current.submitting).toBe(true);
  const form = mock.post.mock.calls[0][1];
  expect(form.get("question_id")).toBe("7");
  expect(form.get("part")).toBe("2");
  expect(form.get("audio").name).toBe("recording.webm");
  await act(async () => {
    resolve();
    await pending;
  });
  expect(result.current.analyzing).toBe(false);
  expect(result.current.lastSubmission).toEqual({ id: 9 });
  act(() => result.current.clearLastSubmission());
  expect(result.current.lastSubmission).toBeNull();
});
it.each([
  { response: { data: { detail: "Service busy" } } },
  new Error("offline"),
])("submission handles backend errors and restores controls", async (error) => {
  mock.post.mockRejectedValueOnce(error);
  const { result } = renderHook(usePracticeSubmission);
  await act(() =>
    result.current.submitRecording(new Blob(["voice"]), {
      id: 7,
      part: 1,
    } as any),
  );
  expect(result.current.error).toBeTruthy();
  expect(result.current.submitting).toBe(false);
  act(() => result.current.setError(null));
  expect(result.current.error).toBeNull();
});
it("submission guards absent input and permits no callback", async () => {
  const { result } = renderHook(usePracticeSubmission);
  await act(() => result.current.submitRecording(null as any, {} as any));
  expect(mock.post).not.toHaveBeenCalled();
  await act(() =>
    result.current.submitRecording(new Blob(["voice"]), {
      id: 7,
      part: 1,
    } as any),
  );
  expect(result.current.lastSubmission).toEqual({ id: 9 });
});
it("recorder hook handles partial state, controls, errors, reset and unmount cleanup", async () => {
  const { result, unmount } = renderHook(useAudioRecorder);
  act(() =>
    mock.callback({
      isRecording: true,
      recordingTime: 4,
      audioBlob: new Blob(["voice"]),
      audioUrl: "blob:test",
    }),
  );
  expect(result.current.isRecording).toBe(true);
  expect(result.current.recordingTime).toBe(4);
  act(() => {
    result.current.pauseRecording();
    result.current.resumeRecording();
    result.current.stopRecording();
    result.current.resetRecording();
  });
  expect(mock.pause).toHaveBeenCalled();
  expect(mock.resume).toHaveBeenCalled();
  expect(mock.finish).toHaveBeenCalled();
  expect(result.current.audioBlob).toBeNull();
  mock.start.mockRejectedValueOnce(new Error("Denied"));
  await act(() => result.current.startRecording());
  expect(result.current.error).toBe("Denied");
  mock.start.mockRejectedValueOnce({});
  await act(() => result.current.startRecording());
  expect(result.current.error).toBeTruthy();
  await act(() => result.current.startRecording());
  expect(result.current.error).toBeNull();
  act(() => mock.callback({}));
  expect(result.current.recordingTime).toBe(0);
  unmount();
  expect(mock.cleanup).toHaveBeenCalled();
  expect(mock.stop).toHaveBeenCalled();
});
it("playback plays, ends, fails, stops and reports failed speech", async () => {
  const audio = {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 3,
    onended: null as any,
    onerror: null as any,
  };
  vi.stubGlobal("Audio", function () {
    return audio;
  });
  const { result } = renderHook(useAudioPlayback);
  act(() => result.current.stopPlayback());
  act(() => result.current.playRecording(""));
  expect(audio.play).not.toHaveBeenCalled();
  act(() => result.current.playRecording("blob:test"));
  expect(result.current.isPlaying).toBe(true);
  act(() => audio.onended());
  expect(result.current.isPlaying).toBe(false);
  audio.play.mockRejectedValueOnce(new Error("Playback blocked"));
  await act(async () => result.current.playRecording("blob:blocked"));
  expect(result.current.isPlaying).toBe(false);
  expect(result.current.error).toBe("Failed to play recording");
  act(() => result.current.playRecording("blob:test"));
  act(() => audio.onerror());
  expect(result.current.error).toBe("Failed to play recording");
  act(() => result.current.stopPlayback());
  expect(audio.currentTime).toBe(0);
  await act(() => result.current.speakQuestion("Hello", 7));
  expect(mock.speak).toHaveBeenCalledWith("Hello", 7);
  mock.speak.mockRejectedValueOnce(new Error("voice"));
  await act(() => result.current.speakQuestion("Hello", 7));
  expect(result.current.error).toBeTruthy();
  expect(result.current.isSpeaking).toBe(false);
  vi.unstubAllGlobals();
});
