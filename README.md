<p align="center">
 <img src="./src/icon0.png" width="128" />
</p>
<h1 align="center">Y2JB Autoloader — L92 build</h1>
<h3 align="center">Based on <a href="https://github.com/Gezine/Y2JB">Y2JB</a> + the L92 autoloader project</h3>
&nbsp;
<p align="center">Kernel exploit + automatic payload loading for PS5.<br>Supports PS5 firmwares 4.03 - 13.60</p>

<p align="center">
 <img src="./y2jb_screenshot.png" width="600" />
</p>

## What this build is

This repository carries the **L92 project** (the one with the *Ops Console* HUD) instead of the
stock Y2JB payload chain. Everything is started from the YouTube app, exactly like the original Y2JB,
so installation and the update flow stay the same.

What you get over stock Y2JB:

- **Ops Console HUD** — a full-screen interface (runtime log terminal, live step checklist,
  big progress readout, segmented bar) drawn by `src/main.js`, with the background and icon
  embedded as data-URLs so they always render in Cobalt.
- **Autoloader** — once the exploit lands, the kernel loader (kexp + elfldr) runs and your
  payloads are sent automatically, or the **Payload Manager** web UI is started when nothing is configured.
- **Exploit routing** — Relapse for FW 7.00 - 13.60 (network interface required, Lapse fallback on
  7.00 - 10.01 without network), Lapse for FW <= 10.01.
- **Speed** — native bulk-memory copies instead of per-byte fake-RW loops (update zip extraction,
  file writes, icon compare) and a batched log repaint.
- **Background / icon sync** — your `background.png` is written as `pic1.png` and `icon0.png` as the
  dashboard icon in `/user/appmeta/<TITLE_ID>/`, with read-back verification.
- **Robust update flow** — `y2jb_update.zip` sanity checks (zip signature, 0-file extraction abort),
  retries when acquiring the V8 primitives, longer ELF-loader wait window.

The interface is previewable in a normal browser: open [preview_ui.html](preview_ui.html).

## Installation

Installation is identical to the original Y2JB.

### Jailbroken PS5 (WebKit, Lua, BD-JB)

Install YouTube (`PPSA01650` / `PPSA01651` / `PPSA01652`):

| Firmware | YouTube Version |
| :--- | :--- |
| **4.03 - 12.40** | `v01.000.003` |
| **12.60 - 13.20** | `v01.000.030` |
| **13.40 - 13.60** | `v01.009.253` |

Then FTP `download0.dat` from the [Releases page](https://github.com/notmaj0r/Y2JB/releases) to
`/user/download/PPSA0165*/` (create the folder if needed).

> **DNS note:** setting the PS5 DNS to `127.0.0.2` blocks PSN, which stops YouTube and firmware
> update prompts from interfering with the exploit. See the original
> [Y2JB README](https://github.com/Gezine/Y2JB/blob/main/README.md) for the step-by-step.

### Non-Jailbroken PS5

Restore a Y2JB system backup, then place `download0.dat` from the Releases page in
`/user/download/PPSA01650` with FTP, or install a YouTube app from another region and place it in
`/user/download/PPSA0165*/`.

## How to use the autoloader

### Option 1: Payload Manager (nothing to configure)

If no `autoload.txt` config is found, the **Payload Manager** web UI starts automatically, so you can
send payloads from your browser without preparing files in advance.

### Option 2: Manual config (`autoload.txt`)

- Create a directory named `ps5_autoloader`.
- Inside it, place your `.elf` / `.bin` files and an `autoload.txt`, one filename per line
  (names are case-sensitive). Add lines like `!1000` to wait 1000 ms before the next payload.
- Put `ps5_autoloader` on the **root of a USB drive** or in **`/data/ps5_autoloader`** (USB wins).

> **Note:** when an `autoload.txt` is found, Payload Manager is **not** started. Add `pldmgr.elf`
> to `ps5_autoloader` and to `autoload.txt` if you want both.

## How to update

Place **`y2jb_update.zip`** from the [Releases page](https://github.com/notmaj0r/Y2JB/releases)
on a USB drive and start the app: the HUD performs the update, re-verifies the written files and
reports the result in the runtime log.

Accepted locations (first match wins):

- `/mnt/usbN/y2jb_update.zip` (USB root)
- `/mnt/usbN/ps5_autoloader/y2jb_update.zip`
- `/data/y2jb_update.zip`
- `/data/ps5_autoloader/y2jb_update.zip`

The file name must match exactly.

## Extras kept from Y2JB

- `appinfo_editor.py` — blocks YouTube updates by patching `appinfo.db` (read the warning in the
  original Y2JB README before using it).
- `log_server.py` — tiny HTTP log server; point `LOG_SERVER` in `src/main.js` at your PC to mirror
  the HUD log over the network.
- `payloads/payload_sender.py` — send a payload to a listening ELF loader from your PC.
- `scripts/create_update_package.py` — vendored from [itsPLK/y2jb-updater](https://github.com/itsPLK/y2jb-updater) (MIT), builds `y2jb_update.zip`.

## Build from source

Binaries (elfldr, kexp, unified autoloader) are bundled in `src/`, so no submodule checkout is needed:

```bash
./build.sh --stable      # or --dev
# produces y2jb_update.zip with @@VERSION@@ / @@ELFLDR_FILE@@ / @@KEXP_FILE@@ substituted
```

The GitHub workflows build `y2jb_update.zip` and generate the UFS2 `download0.dat` image used for
installation.

### Custom autoload configs per YouTube app

Name the directory `ps5_autoloader_[TITLE_ID]` (e.g. `ps5_autoloader_PPSA01650`) to keep a different
`autoload.txt` per app; those directories always take precedence over the generic one.

### Using your own ELF loader

By default the autoloader ships a localhost-only elfldr. To use your own, drop it in
`ps5_autoloader`, list it in `autoload.txt`, and add a sleep (e.g. `!4000`) before the next payload.

## Credits

- **[Gezine](https://github.com/Gezine)** — creator of [Y2JB](https://github.com/Gezine/Y2JB) and of this
  application's base code
- **[itsPLK](https://github.com/itsPLK)** — [ps5-y2jb-autoloader](https://github.com/itsPLK/ps5-y2jb-autoloader),
  [ps5-elfldr](https://github.com/itsPLK/ps5-elfldr), [ps5-kexp](https://github.com/itsPLK/ps5-kexp),
  [ps5-unified-autoloader](https://github.com/itsPLK/ps5-unified-autoloader),
  [ps5-payload-manager](https://github.com/itsPLK/ps5-payload-manager)
- **[maj0r](https://github.com/notmaj0r)** — Relapse implementation, this fork
- **[shahrilnet](https://github.com/shahrilnet), [null_ptr](https://github.com/n0llptr)** — Remote Lua Loader references
- **[BenNoxXD](https://github.com/BenNoxXD)** — ClosePlayer reference
- **[ntfargo](https://github.com/ntfargo)** — V8 CVEs and CTF writeups
- **abc and psfree team** — Lapse implementation
- **[edisnord](https://github.com/edisnord)** — [Relapse](https://github.com/edisnord/relapse-y2jb) implementation
- **[flat_z](https://github.com/flatz), [LM](https://github.com/LightningMods)** — GPU rw via direct ioctl
- **[john-tornblom](https://github.com/john-tornblom), [EchoStretch](https://github.com/EchoStretch)** — elfldr payload
- **[hammer-83](https://github.com/hammer-83)** — BD-J PS5 exploit references
- **[zecoxao](https://github.com/zecoxao), [idlesauce](https://github.com/idlesauce), [TheFlow](https://github.com/Theofficialflow)** — dlsym troubleshooting
- **[Dr.Yenyen](https://github.com/DrYenyen) and PS5 R&D community** — testing Y2JB
- **Rush** — Y2JB backup file
- **[ufm42](https://github.com/ufm42)** — [kexp](https://github.com/ufm42/kexp) post-JB shellcode

## License

This project is licensed under the **GPL-3.0 License**.
The original **Y2JB** base code remains under its original **MIT License** (see [LICENSE-MIT](LICENSE-MIT)).
All unique modifications and additions in this fork are licensed under **GPL-3.0**.

## Disclaimer

This tool is provided as-is for research and development purposes only. Use at your own risk.
The developers are not responsible for any damage, data loss, or consequences resulting from its use.

## Donate

- [donate to Gezine](https://github.com/sponsors/Gezine) (creator of the original Y2JB)
- see [DONATE.md](DONATE.md)
