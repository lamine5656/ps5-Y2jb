<p align="center">
 <img src="./src/icon0.png" width="128" />
</p>
<h1 align="center">Y2JB Autoloader — L92 build</h1>
<h3 align="center">L92 build — kernel exploit + payload autoloader</h3>
&nbsp;
<p align="center">Kernel exploit + automatic payload loading for PS5.<br>Supports PS5 firmwares 4.03 - 13.60</p>

<p align="center">
 <img src="./y2jb_screenshot.png" width="600" />
</p>

## What this build is

This repository carries the **L92 project** — the *Ops Console* HUD, the autoloader chain and the
Relapse/Lapse routing. Everything is started from the YouTube app, so installation and the update
flow stay the same.

What you get:

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

## Requirements

- At least 4.03 firmware PS5

### For Jailbroken PS5 (WebKit, Lua, BD-JB)

- Fake or legit activated PS5
- YouTube app PKG matching your firmware (see the table in [Installation](#installation))
- FTP access to the console

### For Non-Jailbroken PS5

- USB flash drive
- Pre-made backup file

## Installation

### Jailbroken PS5 (WebKit, Lua, BD-JB)

Install YouTube (`PPSA01650` / `PPSA01651` / `PPSA01652`):

| Firmware | YouTube Version |
| :--- | :--- |
| **4.03 - 12.40** | `v01.000.003` |
| **12.60 - 13.20** | `v01.000.030` |
| **13.40 - 13.60** | `v01.009.253` |

Download `download0.dat` from the [Releases page](https://github.com/lamine5656/ps5-Y2jb/releases)
and transfer it with [Prospero Manager](https://github.com/notmaj0r/ProsperoMgr),
[FTP](https://github.com/ps5-payload-dev/ftpsrv) or any file manager to the path matching your
YouTube app's TITLE ID (create the folder if it does not exist):

```
/user/download/PPSA01650
/user/download/PPSA01651
/user/download/PPSA01652
```

You only need one of them — the one matching your YouTube app's TITLE ID.

#### Configure network DNS settings (optional, but highly recommended)

1. Navigate to **Settings > Network > Settings > Set Up Internet Connection**
2. Scroll to the bottom and select **Set Up Manually**
3. Choose your connection type:
   - **Use WiFi**: enter your network name and password manually, then set security to "WPA-Personal..."
   - **Use a LAN Cable**: proceed to the next step
4. Under **DNS Settings**, change from "Automatic" to **Manual**
5. Set **Primary DNS** to `127.0.0.2` (leave Secondary DNS blank)
6. Press **Done** and wait for the connection to establish

**Note:** you may see a network/PSN connection error — this is expected and can be safely ignored;
the console still works normally for YouTube payload delivery.

**Alternative:** instead of `127.0.0.2`, you can block PSN servers with your own DNS server.

**Why `127.0.0.2` matters:** pointing DNS at localhost keeps the PS5 from reaching PlayStation
Network, which otherwise raises YouTube app and firmware update prompts that interfere with the
exploit.

#### Fake account activation

> Skip this section if you use the backup file from the Releases page.

Y2JB requires a **fake-activated account**, and a legit PSN-activated account cannot be used
directly — create a separate fake-activated one:

1. Create a new offline account on your PS5
2. While logging in to this new account, open **etaHEN toolbox**
3. Navigate to the **"Remote Play"** menu
4. The account is fake-activated automatically

### Non-Jailbroken PS5

1. Download the backup file from the [Releases page](https://github.com/lamine5656/ps5-Y2jb/releases)
   - **Firmware 4.03 – 12.40** → `Y2JB_backup_1.6(4.03)`
   - **Firmware 12.60 and up** → `Y2JB_backup_1.6(12.20)`
2. Follow Sony's official guide to [restore backup data from USB](https://www.playstation.com/en-gb/support/hardware/back-up-ps5-data-USB/)
3. Place `download0.dat` in `/user/download/PPSA01650` with FTP, or install a YouTube app from
   another region and place it in `/user/download/PPSA0165*/`

**⚠️ WARNING:** restoring backup data **will factory reset your PS5** — every data on the console
will be erased.

### Blocking YouTube updates (`appinfo_editor.py`)

**⚠️ CRITICAL:** database corruption can delete **all installed FPKGs and savedata** on your
internal storage. Back up your savedata with the PS5's built-in backup and restore (Settings)
before touching `appinfo.db`.

This script stops YouTube from updating if you accidentally connect to the internet — an update
can softlock YouTube.

1. Retrieve `/system_data/priv/mms/appinfo.db` from your PS5 using FTP
2. Place `appinfo.db` in the same directory as `appinfo_editor.py` and run:
   ```
   python appinfo_editor.py
   ```
3. **Before replacing the file** (to avoid corruption): close YouTube completely, navigate to the
   Settings page and make sure no package is being installed or updated
4. Use FTP to replace `/system_data/priv/mms/appinfo.db` with the modified version
5. If you get no corruption notification, reboot your PS5

### How to escape a YouTube softlock

This typically happens when you connect to the internet **before** setting the `127.0.0.2` DNS
(most common with WiFi users).

1. Once softlocked, connect to the internet normally, without a custom DNS
2. Launch YouTube again and deny the system software update popup
3. YouTube should now launch — run the jailbreak and load HEN
4. Set the DNS back to `127.0.0.2`, then uninstall YouTube
5. Repeat the **Jailbroken PS5** and **Blocking YouTube updates** sections
6. Restart your PS5

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

Place **`y2jb_update.zip`** from the [Releases page](https://github.com/lamine5656/ps5-Y2jb/releases)
on a USB drive and start the app: the HUD performs the update, re-verifies the written files and
reports the result in the runtime log.

Accepted locations (first match wins):

- `/mnt/usbN/y2jb_update.zip` (USB root)
- `/mnt/usbN/ps5_autoloader/y2jb_update.zip`
- `/data/y2jb_update.zip`
- `/data/ps5_autoloader/y2jb_update.zip`

The file name must match exactly.

## Sending payloads

Send payloads from your PC with `payloads/payload_sender.py` (requires Python):

```
python payload_sender.py <host> <file>
python payload_sender.py <host> <port> <file>
```

**Examples:**

```
python payload_sender.py 192.168.1.100 helloworld.js
python payload_sender.py 192.168.1.100 50000 helloworld.js
python payload_sender.py 192.168.1.100 9020 payload.bin
```

**Port notes:** the Remote JS server does not always use `50000` — it may pick another port;
that is normal behaviour, not a bug.

- **Lapse** (FW ≤ 10.01): once Lapse succeeds, send HEN or any ELF to port **9021**
  (`python payload_sender.py 192.168.1.100 9021 hen.bin`) — any TCP sender works (`netcat`,
  `payload_sender.py`).
- **Relapse** (FW ≤ 13.60, active network connection required): elfldr starts listening on port
  **9021** after the payload lands.

## Extras

- `appinfo_editor.py` — blocks YouTube updates by patching `appinfo.db` (**backup your savedata
  first**: a corrupted database can wipe installed FPKGs and savedata) — see
  [Blocking YouTube updates](#blocking-youtube-updates-appinfo_editorpy).
- `log_server.py` — tiny HTTP log server; point `LOG_SERVER` in `src/main.js` at your PC to mirror
  the HUD log over the network.
- `payloads/payload_sender.py` — send a payload to a listening ELF loader from your PC.
- `scripts/create_update_package.py` — MIT-licensed packaging script (see its header), builds `y2jb_update.zip`.

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

- **[L92](https://github.com/notmaj0r)** — Ops Console HUD, autoloader chain, Relapse/Lapse routing,
  update and icon sync
- Third-party components keep their own notices in the source files: Lapse and Relapse derivations,
  elfldr, kexp, the unified autoloader and the payload manager, plus the references they build on
  (psfree/Lapse team, shahrilnet, null_ptr, BenNoxXD, ntfargo, flat_z, LM, john-tornblom,
  EchoStretch, hammer-83, zecoxao, idlesauce, TheFlow, ufm42, Dr.Yenyen and the PS5 R&D community)

## License

This project is licensed under the **GPL-3.0 License**.
The upstream base code remains under its original **MIT License** (see [LICENSE-MIT](LICENSE-MIT)).
All unique modifications and additions by L92 are licensed under **GPL-3.0**.
Per-file third-party copyright notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Disclaimer

This tool is provided as-is for research and development purposes only. Use at your own risk.
The developers are not responsible for any damage, data loss, or consequences resulting from its use.

## Donate

- see [DONATE.md](DONATE.md)
