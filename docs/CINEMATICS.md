# CINEMATICS

Every chapter opens with a short film before you take control: it establishes
where you are, when you are, and what is about to happen. Then the avatar
appears and gameplay begins.

## The shape of an intro

1. The world loads behind a black frame.
2. A letterboxed video plays full-screen — the cinematic.
3. A title card fades in over it: chapter number, title, place, date.
4. The video ends; the frame fades to black.
5. The HUD fades in, the camera settles behind the Timekeeper, and the opening
   dialogue begins.

The player can skip at any point. Skipping fades straight to step 5.

## Files

```
assets/cinematics/<chapter-id>.mp4    1280×720, H.264, no audio track needed
```

The video is muted and un-looped. It must be small — a 20–30 second clip should
stay under 4 MB so the whole game fits comfortably in a browser download.

## Authoring a cinematic

The cinematics are captured **from the actual game**, so they can never drift
out of sync with the scene they introduce.

1. Load the chapter in cinematic mode:

   ```
   http://127.0.0.1:8099/?chapter=washington-1865&cine=1
   ```

   Cinematic mode hides the HUD, hides the player, disables input, and drives
   the camera from the shot list in `src/data/story.js` under
   `CHAPTERS[].cinematic.shots`.

2. Each shot is a camera position, a look-at target, a field of view and a
   duration:

   ```js
   cinematic: {
     video: './assets/cinematics/washington-1865.mp4',
     title: 'SAVE LINCOLN',
     subtitle: 'Ford’s Theatre · 14 April 1865',
     shots: [
       { pos: [0, 9.0, 15.5], target: [0, 3.6, -10], fov: 46, dur: 4.0 },
       { pos: [0, 3.4, 6.0],  target: [0, 2.6, -13.5], fov: 38, dur: 5.0 },
       { pos: [6.0, 4.6, -2.0], target: [0, 3.0, -13.5], fov: 34, dur: 4.5 }
     ]
   }
   ```

3. Record the run:

   ```bash
   /data/home/venv-img/bin/python tools/record_game.py washington-1865 20
   ```

   This writes a `.webm` into `/data/home/luxin/video/<chapter>/`.

4. Convert to mp4 **on the host** (the VM has no ffmpeg):

   ```bash
   ffmpeg -i page@*.webm -c:v libx264 -pix_fmt yuv420p -crf 24 \
          -movflags +faststart assets/cinematics/washington-1865.mp4
   ```

5. Copy it into the repo and reload.

## Why a video and not just a camera move in-engine

An in-engine camera move is cheaper and seamless, but it cannot carry a
*title*, a date, or a piece of narration the way a film can, and it cannot be
pre-composed to land on a good frame. The video gives the game a title sequence.
The trade is the download size and a hard cut between film and gameplay — which
the fade-to-black is there to hide.

## Status

| Chapter | Intro video | Notes |
|---------|-------------|-------|
| Mali 1324 | not yet | shot list needed; the market street is the obvious subject |
| Save Lincoln 1865 | not yet | shot list written; capture blocked on the lighting fix |
| France 1917 | not yet | |
| Berlin 1989 | not yet | |

If a chapter has no video, the game falls back to the in-engine camera and the
opening dialogue starts immediately. Nothing breaks.
