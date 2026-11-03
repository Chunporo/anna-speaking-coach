const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const events = [], revoked = [], tracks = [];
  let permission;
  const stream = { getTracks: () => [{ stop: () => tracks.push('stopped') }] };
  class Recorder {
    static isTypeSupported = type => type === 'audio/mp4';
    constructor(_, options) { this.mimeType = options.mimeType; this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable({ data: new Blob(['recording']) }); this.onstop(); }); }
    pause() { this.state = 'paused'; }
    resume() { this.state = 'recording'; }
  }
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/audioRecorder.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, Blob, MediaRecorder: Recorder, queueMicrotask, setInterval, clearInterval,
    navigator: { mediaDevices: { getUserMedia: () => new Promise(resolve => { permission = () => resolve(stream); }) } },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: url => revoked.push(url) } });
  return { recorder: new exports.AudioRecorder(state => events.push(state)), events, revoked, tracks, grant: () => permission() };
}

test('reset while stop is pending discards stale audio and stops tracks', async () => {
  const h = harness(); const starting = h.recorder.startRecording(); h.grant(); await starting;
  h.recorder.resetRecording(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.events.at(-1).audioBlob, null);
  assert.equal(h.events.at(-1).recordingTime, 0);
  assert.ok(h.tracks.length);
});

test('completed recording preserves the actual MIME type and releases its URL', async () => {
  const h = harness(); const starting = h.recorder.startRecording(); h.grant(); await starting;
  h.recorder.stopRecording(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.events.at(-1).audioBlob.type, 'audio/mp4');
  assert.ok(h.events.at(-1).audioBlob.size > 0);
  h.recorder.cleanup(); assert.deepEqual(h.revoked, ['blob:test']);
});

test('permission arriving after unmount stops tracks without starting recording', async () => {
  const h = harness(); const starting = h.recorder.startRecording();
  h.recorder.cleanup(); h.grant(); await starting;
  assert.equal(h.events.length, 0);
  assert.ok(h.tracks.length);
});
