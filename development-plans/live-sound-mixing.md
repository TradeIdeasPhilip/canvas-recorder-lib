# Live Sound Mixing

Let the browser mix the sound clips while it plays them, instead of building one big buffer first.
Then a small change on the timeline doesn't rebuild the whole soundtrack.

**Status (2026-10-20):** Planning. No code yet.

## The problem

Any change to a sound clip, or to a component's schedule, rebuilds the whole soundtrack.
Add a small delay here or there, and the sound stops for a few seconds, then starts again.

Loading a new, large sound file can take a while.  That's fine.
Rebuilding everything after every small change is the problem.

## How it works now

**What starts a rebuild.**  `initAudio()` ([dev/canvas-recorder.ts:797-848](../dev/canvas-recorder.ts#L797-L848)) runs 300 ms after the last of these:

- a schedule change reaching the root:  `veRootParent` ([:1885](../dev/canvas-recorder.ts#L1885)) and `toShowParent` ([:1911](../dev/canvas-recorder.ts#L1911))
- a sound clip's numbers, from a field or a drag:  `_onClipValueChanged()` ([:2206-2208](../dev/canvas-recorder.ts#L2206-L2208))
- ✂ Cut ([:2130](../dev/canvas-recorder.ts#L2130)), adding or removing clips ([:5259](../dev/canvas-recorder.ts#L5259)), a clip's Owner menu ([:5607](../dev/canvas-recorder.ts#L5607))

And at once, with no wait, for `refreshGUI("sound")` ([:1629](../dev/canvas-recorder.ts#L1629)), 🔓 Allow local files ([:468](../dev/canvas-recorder.ts#L468)), `reload()` ([:7225](../dev/canvas-recorder.ts#L7225)) and `philDebug.refreshSounds()` ([:1655](../dev/canvas-recorder.ts#L1655)).

**What a rebuild does.**

1. `stopAudio()` and `audioReady = false`.
   While playing, the animation loop holds the current frame until the audio is ready ([:887-892](../dev/canvas-recorder.ts#L887-L892)).
   So the picture freezes too, not just the sound.
2. A new `AudioBuilder` ([dev/audio-builder.ts](../dev/audio-builder.ts)).
   Its decode cache belongs to the instance ([audio-builder.ts:68-69](../dev/audio-builder.ts#L68-L69)), so **every source file is fetched and decoded again**.
   One at a time:  `doIt()` awaits each `add()` in a loop ([canvas-recorder.ts:812-818](../dev/canvas-recorder.ts#L812-L818)).
   The comment at [audio-builder.ts:54](../dev/audio-builder.ts#L54) puts decoding at ⅜–¾ s per 4 minutes of audio.
3. Each clip is added into one mono `Float32Array` as long as the whole video ([audio-builder.ts:147-214](../dev/audio-builder.ts#L147-L214)).
   That part is cheap:  about 29 million additions for 10 minutes at 48 kHz.

**Playback.**  One `AudioBufferSourceNode` plays the whole buffer, starting at the playhead (`startAudio()`, [:705-736](../dev/canvas-recorder.ts#L705-L736)).
`audioContext.currentTime` is the master clock (`currentAudioTimeMs()`, [:680-693](../dev/canvas-recorder.ts#L680-L693)).

**Other users of the mixed buffer.**

- Video export:  [:1098-1121](../dev/canvas-recorder.ts#L1098-L1121), fed to Mediabunny's `AudioBufferSource` at [:1186-1199](../dev/canvas-recorder.ts#L1186-L1199).
- 🎤 Record just sound:  a WAV from `toBlob()` ([:7217](../dev/canvas-recorder.ts#L7217)).

**Other users of the decoded files** (`getDecodedBuffer()`):

- a clip's length when it plays to the end of its file:  `soundFileMs()` ([:2219-2222](../dev/canvas-recorder.ts#L2219-L2222))
- the timeline's waveforms ([:2322](../dev/canvas-recorder.ts#L2322)).  They draw channel 0 only ([dev/timeline-display.ts:566](../dev/timeline-display.ts#L566)).
- `VisualEditorAPI.getDecodedBuffer()` ([src/showable.ts:42](../src/showable.ts#L42), [canvas-recorder.ts:1648](../dev/canvas-recorder.ts#L1648)).
  Nothing else in the library calls it.  A consumer project might.

**Unmeasured guess:**  step 2, decoding everything again, is most of the few seconds.
The timing log at [audio-builder.ts:58-64](../dev/audio-builder.ts#L58-L64) is turned off with `false &&`.  Turning it on would say for sure.

## The plan

Two steps that don't depend on each other.
The first is small and probably gets most of the speed.
The second removes the rebuild.

### Step 1:  Keep decoded files between rebuilds

Move the decode cache out of `AudioBuilder` into something that lives as long as the page.
Then a rebuild only mixes.

- **Mix down to mono while decoding.**  Store one channel per file, averaged the way `add()` does now ([audio-builder.ts:202-212](../dev/audio-builder.ts#L202-L212)).
  That halves the memory for stereo files, and the mixer, step 2 and the waveforms only ever see one channel.
  The waveforms would then show the whole sound, not just the left channel.
  `VisualEditorAPI.getDecodedBuffer()` would return mono buffers too.
- **Decode in parallel.**  Start every file's decode, then mix.  `warmCache()` already exists for this.
  (Speculation:  whether Chrome really decodes several files at once.)
- **Don't cache failures.**  A rejected promise stays in `#cache` today.  That's harmless only because the cache is thrown away on every rebuild.
  A long-lived cache must drop failures, or a `local:` file stays broken after 🔓 Allow local files.
- **A way to clear it.**  A file re-recorded under the same name would play the old copy.
  `philDebug.refreshSounds()` should clear the cache first.
  (Speculation:  for `local:` files, add the file's `lastModified` to the cache key.)
- **Fix the `OfflineAudioContext`'s length while here.**  `totalDurationMs * 1000` frames ([audio-builder.ts:36-39](../dev/audio-builder.ts#L36-L39)) counts microseconds, not samples:  about 21× too long at 48 kHz.
  It's only used for `decodeAudioData()` and `createBuffer()`, so a length of 1 works.
  With the cache moved out, one long-lived context can do all the decoding.

Expected result (speculation):  a rebuild takes the 300 ms debounce plus tens of ms.
The sound still stops and starts again.

### Step 2:  One `AudioBufferSourceNode` per clip

Don't mix in JavaScript at all.
Give each clip its own source node, and let the browser's audio thread add them up.
The nodes share the decoded `AudioBuffer`s; nothing is copied.

**Flatten the tree.**  Move `doIt()`'s tree walk into a function that only reads:  `collectSoundClips(toShow)` → `{ source, startMs, trimMs, lengthMs }[]`, in time from the start of the video.
Include `add()`'s handling of negative starts ([audio-builder.ts:153-164](../dev/audio-builder.ts#L153-L164)).
The player and the export both use it.

**Schedule from the playhead.**  `startAudio(fromMs)` makes a node for each clip that ends after `fromMs`:

```ts
const node = audioContext.createBufferSource();
node.buffer = decoded; // shared, not copied
node.playbackRate.value = audioPlaybackRate;
node.connect(gainNode);
const waitMs = Math.max(0, clip.startMs - fromMs);
const skipMs = Math.max(0, fromMs - clip.startMs);
node.start(
  contextNow + waitMs / 1000 / audioPlaybackRate,
  (clip.trimMs + skipMs) / 1000,
  (clip.lengthMs - skipMs) / 1000, // Leave out to play to the end of the file.
);
```

From MDN's [`AudioBufferSourceNode.start()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start) (checked 2026-10-20):

- `offset` and `duration` are in buffer time.  `duration` "is independent of the `playbackRate`".  Only `when` has to be divided by the rate.
- A `when` in the past starts at once.
- A negative value for any of the three throws a `TypeError`.
- `start()` can only be called once per node.  Nodes are single-use by design, and cheap.

`stopAudio()` stops and disconnects every node in a list, instead of one.

**An edit means:  stop everything, and schedule again from `currentAudioTimeMs()`.**
The anchor (`audioContextStartTime`, `audioMediaStartMs`) doesn't move, so the clock doesn't change.
No `audioReady = false`, and no held frame.

**Clips whose file isn't decoded yet are skipped.**  When the decode finishes, schedule again.
Everything else keeps playing meanwhile.  Today one new file holds up all the sound.

**Speed changes** (`setPlaybackRate()`, [:753-765](../dev/canvas-recorder.ts#L753-L765)):  re-anchor as now, then schedule again.
Every node's `when` depends on the rate.

**Mono.**  With step 1's mono buffers, nothing to do.
Without step 1, a `GainNode` with `channelCount: 1, channelCountMode: "explicit"` would mix down, but not quite the way `add()` does.
Stereo becomes `0.5 * (L + R)`, the same as now; 5.1 becomes `0.7071 * (L + R) + C + 0.5 * (SL + SR)`, not an average.
(MDN's [Basic concepts](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Basic_concepts_behind_Web_Audio_API), checked 2026-10-20.)

**Export still needs one mixed buffer.**  Mediabunny's `AudioBufferSource` and the WAV writer both want samples.

- Keep `AudioBuilder` as the export's mixer.  Build it when Record is clicked, from `collectSoundClips()` and step 1's cache.  Tens of ms.  The simplest choice.
- Or play the same schedule into an `OfflineAudioContext` and render it.  Then the preview and the export use one mixer and can't disagree.  More code changes.

Either way, the live player no longer needs a buffer as long as the video.

**What stays the same:**  `audioContext.currentTime` as the master clock; the RAF fallback when autoplay is blocked; repeat (it already calls `startAudio()`); the volume and mute `gainNode`.

**Things to watch (speculation):**

- **Clicks at the swap.**  Stop the old nodes and start the new ones at the same context time, a few ms ahead:  `stop(t)` and `start(t, …)`.
  Then clips that didn't change should continue sample for sample.
  A clip that really moved under the playhead will jump.  That's the edit.
- **Changes during a drag.**  Making a new list of nodes is cheap enough to do on every `input` event.
  Whether that sounds good mid-drag is another question.  Keep the 300 ms debounce at first, then try shorter.
- **Many clips.**  Scheduling every clip at once should be fine for hundreds.
  If it isn't, schedule only a window ahead of the playhead, refilled by a timer:  the lookahead pattern from Chris Wilson's [A tale of two clocks](https://web.dev/articles/audio-scheduling).
- **Replace only what changed.**  Keep the nodes whose clip is the same, instead of replacing all of them.  Only worth it if the swap clicks.

### Steps

1. Turn on the timing log, and write down rebuild times for affine-transforms.
2. Step 1, the long-lived cache.  Measure again.
3. `collectSoundClips()`, and make `initAudio()` use it.  No change in behavior.
4. Step 2:  `startAudio()`, `stopAudio()` and `setPlaybackRate()` work with a list of nodes.
   `initAudio()` becomes "decode whatever is missing, then schedule again if playing."
5. Export through `AudioBuilder`, built from the cache when needed.

## How to test

In [affine-transforms](https://github.com/TradeIdeasPhilip/affine-transforms) (port 5175):

- **Play, and drag a component's duration.**  Before:  the sound and picture stop for a few seconds.  After:  the sound keeps going, and the clips after the change move.
- **Edit something far from the playhead.**  No audible glitch.
- **0.5× and 2×.**  Clips stay lined up with their components, before and after an edit.
- **🎤 Record just sound, before and after.**  The WAV should be identical after step 1.  After step 2, identical with `AudioBuilder` as the export mixer, nearly identical with an offline render.
- **A `local:` file that needs 🔓.**  Allow it, and its clip joins in without a reload.

## Not now

- **AudioWorklet.**  The browser calls your [`process()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process) on the real-time audio thread for every 128 samples (2.67 ms at 48 kHz), and you fill in the samples.
  It's what a DAW would use, and an edit could be heard within a few ms.
  Overkill here:  the decoded files must be copied into the worklet's scope, `process()` must never block, and the fastest way to share data (`SharedArrayBuffer`) needs COOP/COEP headers, which GitHub Pages can't send.  simple-video-editor lives there.
  Step 2 gets most of the benefit using the browser's own mixer.
- **Decoding part of a file.**  Mediabunny's `AudioBufferSink` (installed version 1.61.4:  `getBuffer(timestamp)` and `buffers(start, end)`) decodes just a time range, using WebCodecs.
  That only speeds up loading a new, large file, which isn't the problem.
  It could matter for memory in a very long project:  decoded mono at 48 kHz is about 11.5 MB per minute.
