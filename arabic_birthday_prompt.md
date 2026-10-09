# Prompt: Arabic birthday version of a classroom video (run on a machine with a GPU)

## Context (measured from the source file)
- Source: portrait 464x832, 25.4 s, ~59.94 fps, H.264 + AAC stereo 44.1 kHz, iPhone .mov.
- Content: a classroom, several children clapping and singing "Happy Birthday" in Hebrew. Most shots are wide, so faces are ~15-40 px. Only two moments are close-ups of a single child (flower crown).
- Decisions made by the owner:
  - Wants it to look and sound like the kids sing an Arabic birthday song ("سنة حلوة يا جميل") over the video.
  - Faces too small to edit reliably stay ORIGINAL (no artifacts).
  - Voice source: whatever works best and is legal/free. No cloning of any real child's voice.

## Your role
You are a senior video/audio engineer. Work only with free/open-source tools. Verify every claim by running it; never state something works unless you rendered and checked it.

## Step 0 - Environment check (stop and report if it fails)
1. `nvidia-smi`, torch CUDA available, VRAM. Check you can download from huggingface.co and github.com.
2. If there is no GPU or no model access, STOP and say so. Do not fake lip-sync with CPU hacks.

## Step 1 - Backup and analysis
- Copy the original to `original_backup.mov` (never modify it).
- ffprobe it. Extract frames. Run a face detector (InsightFace/RetinaFace or MediaPipe) + tracker on every frame.
- Produce a table: per track, frames covered, face size in px, yaw, occluded %. Classify tracks: EDIT (face >= ~96 px, yaw < 45 deg, little occlusion) vs KEEP (everything else).
- Expect only the 2 close-up segments to be EDIT. Everything else remains untouched.

## Step 2 - Arabic vocal track
Priority order, pick the first that is available and legally usable:
1. A recording the owner supplies (family/group singing of "سنة حلوة يا جميل").
2. A CC0/CC-BY recording of children/choir singing it, with the license verified and noted.
3. Open-source singing synthesis (e.g. DiffSinger/OpenUtau with a free voicebank) layered 4-6 times with different pitch (+-20 cents), timing (+-30-80 ms), formant and breath variation to sound like a group of children.
Never clone a child's voice from the video. Align the vocal's phrases to the original song's tempo and clap rhythm (use the original audio only as a timing reference via onset detection / DTW).

## Step 3 - Lip-sync (EDIT tracks only)
- Use LatentSync or MuseTalk, one face at a time, on a crop of the tracked face. Verify whether the model handles multiple faces (they usually do not); if not, process per-track and composite back.
- Feed the Arabic vocal segment aligned to that clip.
- Composite only the mouth/lower-face region with a feathered mask, with color matching to the original frame and the original sharpness/noise (add matching grain and re-apply the phone's compression look).
- Temporal checks: optical-flow stabilization of the mask, no flicker, no identity drift (compare face embedding before/after, reject if the cosine distance is above a threshold). If a segment fails, revert to the original frames for it.

## Step 4 - Audio that feels recorded in the room
- Estimate the room: take the original audio, extract room tone from gaps, and estimate an impulse response (or use a free small-classroom IR).
- Convolve the vocal stack with the room IR, mix with the original ambient/clap noise (vocals removed or ducked as far as possible), add slight stereo spread, phone-mic EQ (high-pass ~120 Hz, gentle roll-off ~12 kHz) and light compression.
- Keep the original claps in sync with the new vocal. The singing must not sound like a clean studio track.

## Step 5 - Render and verify
- Mux with FFmpeg: H.264 High profile, yuv420p, same resolution and fps as the source, AAC 192 kbps, `-movflags +faststart`, keep rotation metadata, so it plays on iPhone.
- First render a ~6 s test (`birthday_arabic_test.mp4`) containing one EDIT segment and one KEEP segment. Review frame by frame (look for mouth flicker, teeth artifacts, color seams) and listen to the audio. Fix before rendering the full video.
- Check A/V sync with a clap/onset test.

## Deliverables
`birthday_arabic_final.mp4`, `birthday_arabic_audio.mp3`, `birthday_arabic_test.mp4`, plus a short report: which faces were edited, which were kept and why, the vocal source and its license, and any known artifacts.

## Honesty rule
If realistic lip-sync is not achievable for a segment, keep the original face and say so. The Arabic audio plus untouched faces is an acceptable outcome; visible AI artifacts are not.
