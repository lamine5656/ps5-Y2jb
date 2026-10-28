# Third-party notices

The L92 build in this repository contains code derived from the projects below.
Their notices are kept here and in the headers of the files they apply to; they are
not part of the user-visible branding.

## Y2JB base application

- Files: `src/global.js`, `src/kernel.js`, `src/misc.js`, `src/splash.html`, and the
  application skeleton of `src/main.js`
- License: MIT — Copyright (c) 2025 Gezine (full text in [`LICENSE-MIT`](LICENSE-MIT))

## y2jb_updater

- Files: `src/update.js`, `scripts/create_update_package.py`
- License: MIT — Copyright (c) 2025 itsPLK

## Lapse

- File: `src/lapse.js`
- License: AGPL-3.0 — derivative work of `lapse.mjs` from psfree
  (Copyright (C) 2025 Gezine, Copyright (C) 2025 anonymous). The full notice is in the
  file header, as required.

## Relapse and autoloader chain

- Files: `src/relapse.js`, `src/autoload.js`, `src/icon_update.js`, `src/aioshellcode.js`,
  `Makefile`, `build.sh`
- Based on the Relapse implementation and the Y2JB autoloader chain; license GPL-3.0
  for this project's modifications, with the upstream notices kept in the file headers.

## Bundled binaries

- `src/elfldr-ps5-v0.26-bb1e117.elf` (elfldr)
- `src/kexp-v0.8-24cf6e5.bin` (kexp)
- `src/ps5-unified-autoloader.elf` (unified autoloader + payload manager)

These are distributed unmodified, under the terms of their respective projects.
