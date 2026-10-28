# Changelog

## v1.3.1-l92 (sync with notmaj0r/Y2JB)
- Compared this build against the improved project (https://github.com/notmaj0r/Y2JB, `main` = `1f2ff09`, which is exactly the base this repo was taken over from) and merged what it had that we did not
- `src/relapse.js`: **FW 11.40 offsets added** (they were the only firmware missing between 7.00 and 13.60); values derived from `RelapseOffsets.js` with both deltas (11.20 -> 11.40 and 11.60 -> 11.40) yielding the same result, block generated in our own format/style and re-checked with `node --check`
- `src/global.js`: SYSCALL table aligned with theirs (56 -> 63 entries: `socketpair`, `getrlimit`, `setrlimit`, `aio_multi_wait`, `aio_multi_poll`, `aio_multi_cancel`, `aio_submit_cmd`), same numeric values as the `SYSCALL_EXTRA` fallback relapse.js merges in
- `README.md`: merged the setup documentation we were missing (requirements, full DNS procedure and rationale, fake account activation, Prospero/FTP transfer paths, backup file names + Sony restore warning, `appinfo_editor.py` procedure, YouTube softlock escape, `payload_sender.py` usage with ports), keeping the L92 structure and our newer YouTube table; release links now point to this repo
- Not merged on purpose: `main.js` (our Ops Console HUD is the interface), `kexp.js` / `remotejsloader.js` (our chain loads `kernel.js`, byte-identical to theirs), `elfldr-ps5.elf` and `kexp.bin` (ours are newer: elfldr v0.26 of 2026-09-29 and kexp v0.8 of 2026-09-30 vs their 2026-08-02 / 2026-05-25 builds), `payloads/payload_sender.py` (byte-identical)

## v1.3.0-l92 (repository takeover)
- The stock Y2JB payload chain (`download0/cache/...`, `kexp.js`, `remotejsloader.js`) is replaced by the L92 autoloader project: `src/` is now the source of truth, the Y2JB install vector is unchanged
- UI: the L92 "Ops Console" HUD is now the only interface (runtime log, step checklist, progress bar, embedded background/icon)
- Build: `Makefile` + `build.sh` + GitHub workflows from the L92 project; `y2jb_update.zip` and the UFS2 `download0.dat` are built in CI
- Dependencies (elfldr v0.26, kexp v0.8, unified autoloader) are tracked in `src/`, so the repo builds without submodules
- Kept from Y2JB: `appinfo_editor.py`, `log_server.py`, `payloads/payload_sender.py`
- Removed: stale Y2JB exploit payloads (`RelapseOffsets.js`, `kexp.js`, `remotejsloader.js`, `payloads/Relapse.js`, `payloads/lapse.js`, samples)
- Version bump to 1.3.0 for the new baseline
- Branding: HUD/updater lines, credits, funding and release notes now credit L92 only; per-file third-party copyright notices are kept in `THIRD_PARTY_NOTICES.md`
- Build: `scripts/download_deps.sh` removed and `--download-deps` turned into a no-op note — `build.sh` now verifies and uses the bundled binaries
- Build: `build.sh` executable bit restored (it was committed as 100644, which made `./build.sh` fail with exit code 126 in CI)

## v1.2.4-l92 (hover background attempt)
- splash_screen cache only contained loader files -> hover background is not there
- New: writes user background as `pic1.png` (1920x1080, custom-covers convention) into `/user/appmeta/{tid}/` via both update flows, with unlink + readback verification and explicit notifications
- If pic1 is ignored by the shell we will know from the HUD log (verified write but no visual change)

## v1.2.3-l92 (hover-background diagnostics)
- Dashboard hover background is a dynamic system background, not appmeta icon0
- New diagnostics: lists files (name + size) in /user/appmeta/{tid}/ and in the YT splash_screen cache on every boot (visible in RUNTIME LOG)
- Next step: identify and hijack the splash/hover background file used by the dashboard

## v1.2.2-l92 (dashboard icon diagnostics)
- App icon write now unlinks the old file first, writes, then re-reads and byte-compares
- Explicit notifications: "VERIFIED on disk (reboot to refresh)" or "[ERROR] write FAILED (sandbox block?)"
- Covers both update flows (USB update package and per-boot icon sync)

## v1.2.1-l92 (background fix)
- Cobalt cannot reliably load relative image files -> HUD background + icon are now embedded as data-URLs (jpeg 1080p q80 + png 256, ~420 KB) directly in main.js
- No dependency on file loading at UI paint time anymore: background always renders on every firmware/app combo

## v1.2.0 (speed + HUD edition)
- **Major speed**: native bulk-memory path (`addr_to_u8copy`) replaces per-byte fake-RW loops
  - update zip decompress feed, extracted file writes (zero-copy via `get_backing_store`), icon compare — orders of magnitude faster (was: millions of read8/write8 calls)
- **Major speed**: `log()` no longer forces a paint per message (batched rAF flush) — whole exploit chain runs visibly faster
- Faster boot: log-server probe timeout 800ms -> 250ms; inter-stage delay 1s -> 0.7s
- Brand-new HUD "Ops Console" UI (sharp military-HUD design, mint/amber): runtime log terminal, live mission checklist, big percentage readout + segmented bar, scanline, corner brackets, ticker footer
- Steps HUD driven by real stages (BOOT/EXPLOIT/KERNEL/UPDATE/PAYLOAD) with explicit stage calls injected in the main flow

## v1.1.0 (L92 UI + stability edition)
- New modern UI (space/neon theme using custom `background.png` + custom `icon0.png`)
- Stability: retry primitive acquisition stage up to 3 attempts with full GC between tries
- Stability: ELF loader wait window extended from 10s to 20s with progress logging
- Stability: payload send now retries connect (3x) and handles partial socket writes
- Stability: update package ZIP signature check (detects corrupt USB transfers before extraction)
- Stability: clear abort with notification if extraction yields 0 files
- Stability: last-chance exception now also emits a system notification

## v1.0.1
- Fixed Relapse reporting "reboot the PS5 first" on a console that was already rebooted

## v1.0.0
- Added [Relapse](https://github.com/edisnord/relapse-y2jb) - thanks to [edisnord](https://github.com/edisnord)
  - Preferred exploit for FW 8.00–13.60 (except 9.05 and 11.40) when an active network connection (Wi-Fi or Ethernet) is detected
  - Automatically falls back to Lapse on FW <= 10.01 if no active network interface is detected (or on 9.05)
  - Replaces P2JB (removed)
- Added 1s delay before autoloading to allow elfldr to stabilize after exploit handoff
- Updated [elfldr](https://github.com/itsPLK/ps5-elfldr) to v0.26
- Updated [kexp](https://github.com/ufm42/kexp) to v0.8
- Updated [unified-autoloader](https://github.com/itsPLK/ps5-unified-autoloader) to v0.1.5
  - includes bundled [Payload Manager](https://github.com/itsPLK/ps5-payload-manager) v0.5.2
- CI: Generate `download0.dat` UFS2 filesystem image and include in releases (thanks [Feyzee61](https://github.com/Feyzee61))
- Build: Download prebuilt dependencies matching pinned submodules instead of latest (`./build.sh -d`)


## v0.9.1
- Updated [elfldr](https://github.com/itsPLK/ps5-elfldr) to v0.24
- Updated [unified-autoloader](https://github.com/itsPLK/ps5-unified-autoloader) to v0.1.3
  - includes bundled [Payload Manager](https://github.com/itsPLK/ps5-payload-manager) v0.5.1 (previously v0.3.1)
- Added support for YouTube 01.009.253 (min fw 13.40) to the Y2JB userland exploit (thanks [@Gezine](https://github.com/Gezine))
  - *Note: This is just for the future; a >12.70 kernel exploit is still needed*


## v0.9

- **Unified Autoloader**: Autoload config parsing logic has been moved into [ps5-unified-autoloader](https://github.com/itsPLK/ps5-unified-autoloader) — a shared ELF used across all autoloaders (Y2JB, BD-JB, Lua). This keeps the codebase consistent and makes improvements available to all of them at once.
- **Sync autoload config from USB to /data**: Added support for syncing (moving) the autoload configuration from a USB drive to internal `/data` storage using the `@sync` directive in `autoload.txt`.
- **Improved stability for `autoload.txt` users**: Since payloads are now loaded after the YouTube app has fully closed, issues with certain payloads causing a kernel panic on load should be resolved.
- **Dropped YT cache directory config support**: Because the unified autoloader runs after the YouTube app is fully closed, loading the `autoload.txt` configuration from the YouTube app's cache directory is no longer supported.

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.8-a0146a2...v0.9-2b2e5f6)


## v0.8

- Added P2JB support for firmwares above 10.01 up to 12.70 (lower firmwares still use Lapse)
- Added estimated progress overlay during the P2JB exploit loading phase (shifts position randomly to prevent OLED burn-in)
- Updated elfldr [(rebuilt with latest sdk)](https://github.com/itsPLK/ps5-elfldr/releases/tag/v0.23.2-148b71c)
- Updated Payload Manager to [v0.3.1](https://github.com/itsPLK/ps5-payload-manager/releases/tag/v0.3.1)

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.7-530a4ce...v0.8-a0146a2)


## v0.7

- Improved stability of PSN dialog disabling ([07c1742](https://github.com/itsPLK/ps5-y2jb-autoloader/commit/07c17420b376318f95e826436ad07787c3429615))
- Updated kexp ([5bed6cf](https://github.com/itsPLK/ps5-kexp/commit/5bed6cf36b26e4109049499e89e2bda9f95a7bdc))
- Updated Payload Manager to [v0.3.0](https://github.com/itsPLK/ps5-payload-manager/releases/tag/v0.3.0)

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.6.3-e655073...v0.7-530a4ce)


## v0.6.3

- Updated `kexp` - fixes kernel panics when launching PS5 games (thanks @c0w-ar, @ufm42)

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.6-a9821f8...v0.6.3-e655073)


## v0.6 (Aborted)

*Note: v0.6 was an aborted release due to kernel panics when launching PS5 games (subsequently fixed in v0.6.3).*

- Removed the static 4-second startup delay (now polls for when the ELF loader is ready, starting immediately)
- Updated Lapse to 2.0, merged ufm42's kexp post-JB shellcode, and deprecated GPU RW / firmware-specific kernel offsets
- Overhauled the build system to resolve external binary dependencies (`kexp`, `elfldr`, `pldmgr`) dynamically during build time rather than tracking them in Git
- Added fully automated release workflows and simplified repository directory structure

[Full Changelog](https://github.com/itsPLK/ps5-y2jb-autoloader/compare/v0.5...v0.6-a9821f8)

## v0.5

- **New Loader UI**: A clean graphical interface that replaces system notification spam with a dedicated log window for important status updates. In the event of an error, the UI automatically hides to reveal the full "old style" debug logs.
- **Payload Manager (New Default ELF)**: It handles payload loading after the YouTube app is closed, improving the stability of payloads like **etaHEN** and **kstuff**.
    - **Note on Compatibility**: Your existing autoload configurations will continue to work as they did before.
    - **Note on Usage**: If you choose to use Payload Manager, it should be the **only** item listed in your `autoload.txt`.
- **Custom ELF Loader**: The default `elfldr` now only accepts connections from the PS5 itself (localhost). This improves security by preventing other devices on your network from sending payloads to your console.
    - **Note**: You can still use a standard `elfldr` if you need to send payloads from other devices. See the **Additional Info** section in [README.md](README.md) for instructions.

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.4...v0.5)


## v0.4

Note: By default, Y2JB Autoloader does not utilize the new kill_youtube.elf from the upstream Y2JB project.
If you experience stability issues with the current auto-close method, you can manually add kill_youtube.elf as the final entry in your autoload configuration.

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.3...v0.4)


## v0.3

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.2.2...v0.3)


## v0.2.2

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.2.1...v0.2.2)


## v0.2.1

- splash.html included in download0.dat now has read-only permissions
- updater will now fix splash.html permissions too

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.2...v0.2.1)


## v0.2

This version adds y2jb_updater.
To install future releases, simply put the y2jb_update.zip file on your USB drive.

Updated elfldr.elf to v0.21

[Full Changelog](https://github.com/itsPLK/ps5_y2jb_autoloader/compare/v0.1...v0.2)


## v0.1

- Initial release
