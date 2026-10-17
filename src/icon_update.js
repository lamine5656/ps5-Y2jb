async function start_icon_update() {

  function read_file_to_buffer(path) {
    const path_addr = alloc_string(path);
    const stat_buf = malloc(0x200n);
    const stat_ret = syscall(SYSCALL.stat, path_addr, stat_buf);
    if (stat_ret !== 0n) {
      throw new Error("read_file_to_buffer: stat failed for " + path + " code: " + toHex(stat_ret));
    }
    const file_size = Number(read64(stat_buf + 72n)); // 0x48 offset for st_size

    if (file_size < 0) {
      throw new Error("read_file_to_buffer: invalid file size " + file_size);
    }
    if (file_size === 0) { // empty file
        return { buffer: malloc(0n), size: 0 };
    }

    const fd = syscall(SYSCALL.open, path_addr, O_RDONLY, 0n);
    if (fd < 0n) {
      throw new Error("read_file_to_buffer: open failed for " + path + " fd: " + toHex(fd));
    }

    const file_buffer = malloc(BigInt(file_size));

    try {
      const bytes_read = syscall(SYSCALL.read, fd, file_buffer, BigInt(file_size));

      if (bytes_read < 0n) {
        throw new Error("read_file_to_buffer: read failed: " + toHex(bytes_read));
      }
      if (Number(bytes_read) !== file_size) {
        throw new Error(`read_file_to_buffer: incomplete read. Expected ${file_size}, got ${bytes_read}`);
      }
    } finally {
      syscall(SYSCALL.close, fd);
    }

    return { buffer: file_buffer, size: file_size }; // Return size as number
  }

  function write_buffer_to_file(path, buffer_ptr, size) {
      const path_addr = alloc_string(path);
      // flags: O_WRONLY|O_CREAT|O_TRUNC, mode 0755
      const flags = O_WRONLY | O_CREAT | O_TRUNC;
      const mode = 0o755n;
      const fd = syscall(SYSCALL.open, path_addr, BigInt(flags), mode);
      if (fd < 0n) {
          const err = toHex(fd);
          log("[ERROR] open for write failed: " + path + " fd=" + err);
          send_notification("[ERROR] open for write failed: " + path + " fd=" + err);
          return false;
      }

      // Write directly from the provided buffer pointer
      const wrote = syscall(SYSCALL.write, fd, buffer_ptr, BigInt(size));
      const closeRet = syscall(SYSCALL.close, fd);

      if (wrote < 0n) {
          const err = toHex(wrote);
          log("[ERROR] write failed for " + path + " -> " + err);
          send_notification("[ERROR] write failed for " + path + " -> " + err);
          return false;
      }
      if (wrote !== BigInt(size)) {
          log("[WARN] partial write for " + path + " wrote=" + wrote + " expected=" + size);
          send_notification("[WARN] partial write for " + path + " wrote=" + wrote + " expected=" + size);
          return false;
      }
      if (closeRet < 0n) {
          log("[WARN] close returned " + toHex(closeRet) + " for " + path);
          send_notification("[WARN] close returned " + toHex(closeRet) + " for " + path);
      }
      return true;
  }

  function compare_buffers(buf1_ptr, buf2_ptr, size) {
      // Fast path: compare in native typed arrays (was: per-byte read8)
      if (typeof addr_to_u8copy === "function") {
          const a = addr_to_u8copy(buf1_ptr, size);
          const b = addr_to_u8copy(buf2_ptr, size);
          const words = size >> 2;
          const a32 = new Uint32Array(a.buffer, 0, words);
          const b32 = new Uint32Array(b.buffer, 0, words);
          for (let i = 0; i < words; i++) {
              if (a32[i] !== b32[i]) return false;
          }
          for (let i = words << 2; i < size; i++) {
              if (a[i] !== b[i]) return false;
          }
          return true;
      }
      const n = BigInt(size);
      for (let i = 0n; i < n; i++) {
          if (read8(buf1_ptr + i) !== read8(buf2_ptr + i)) {
              return false; // Buffers are different
          }
      }
      return true; // Buffers are identical
  }

  function file_exists(path) {
    const path_addr = alloc_string(path);
    const stat_buf = malloc(0x200n);
    const ret = syscall(SYSCALL.stat, path_addr, stat_buf);
    return ret === 0n;
  }

  async function list_dir_entries(path) {
    // Diagnostics: list directory contents so we can find the file the dashboard
    // uses for the app hover background (the icon0.png alone is already replaced).
    const buf_size = 4096n;
    const buf = malloc(buf_size);
    const dirfd = syscall(SYSCALL.open, alloc_string(path), 0n, 0n);
    if (dirfd < 0n) {
      log("[diag] dir open failed: " + path + " -> " + toHex(dirfd));
      return;
    }
    let names = [];
    let guard = 0;
    while (guard++ < 64) {
      const nread = syscall(SYSCALL.getdents, dirfd, buf, buf_size);
      if (nread <= 0n) break;
      let offset = 0n;
      while (offset < nread) {
        const d_reclen = Number(read16(buf + offset + 4n));
        if (d_reclen === 0) break;
        const d_namlen = Number(read8(buf + offset + 7n));
        let name = "";
        for (let i = 0; i < d_namlen; i++) {
          const ch = Number(read8(buf + offset + 8n + BigInt(i)));
          if (ch === 0) break;
          name += String.fromCharCode(ch);
        }
        offset += BigInt(d_reclen);
        if (!name || name === "." || name === "..") continue;
        // stat to show size (best effort)
        let sizePart = "";
        try {
          const st = malloc(0x200n);
          if (syscall(SYSCALL.stat, alloc_string(path + "/" + name), st) === 0n) {
            const sz = Number(read64(st + 72n));
            sizePart = ":" + sz + "b";
          }
        } catch (e) {}
        names.push(name + sizePart);
      }
    }
    syscall(SYSCALL.close, dirfd);
    log("[diag] " + path);
    log("[diag] entries: " + names.join(", "));
  }

  async function updateIcon() {
    const iconPath = "/user/appmeta/" + get_title_id() + "/icon0.png";
    const newIconPath = "/mnt/sandbox/" + get_title_id() + "_000/download0/cache/splash_screen/aHR0cHM6Ly93d3cueW91dHViZS5jb20vdHY=/icon0.png";

    if (!file_exists(iconPath)) {
        log("Icon file does not exist: " + iconPath);
        return null;
    }

    let currentIcon = null;
    let newIcon = null;
    let areIdentical = false;

    try {
        log("Reading current icon from: " + iconPath);
        currentIcon = read_file_to_buffer(iconPath);
        log("Current icon size: " + currentIcon.size + " bytes");

        log("Reading new icon from: " + newIconPath);
        newIcon = read_file_to_buffer(newIconPath);
        log("New icon size: " + newIcon.size + " bytes");

        if (currentIcon.size !== newIcon.size) {
            log("Icons are different (size mismatch).");
            areIdentical = false;
        } else {
            log("Icons are the same size. Comparing contents...");
            areIdentical = compare_buffers(currentIcon.buffer, newIcon.buffer, currentIcon.size);
        }

        if (!areIdentical) {
            log("App icon: writing " + newIcon.size + " bytes to appmeta...");
            // unlink first so any stale cache mapping does not shadow the rewrite
            const un_ret = syscall(SYSCALL.unlink, alloc_string(iconPath));
            if (un_ret !== 0n) {
                log("[WARN] unlink existing icon0 returned " + toHex(un_ret));
            }
            const writeSuccess = write_buffer_to_file(iconPath, newIcon.buffer, newIcon.size);
            if (writeSuccess) {
                try {
                    const rb = read_file_to_buffer(iconPath);
                    const sizeOK = (rb.size === newIcon.size);
                    let contentOK = false;
                    if (sizeOK) {
                        contentOK = compare_buffers(rb.buffer, newIcon.buffer, Math.min(rb.size, newIcon.size));
                    }
                    if (sizeOK && contentOK) {
                        log("App icon VERIFIED on disk (" + rb.size + " bytes). Dashboard icon refreshes after console reboot.");
                        send_notification("App icon updated (reboot to refresh).");
                    } else {
                        log("[ERROR] App icon readback mismatch: size_ok=" + sizeOK + " content_ok=" + contentOK);
                        send_notification("[ERROR] App icon verification failed");
                    }
                } catch (verr) {
                    log("[ERROR] App icon readback failed: " + (verr && verr.message ? verr.message : String(verr)));
                    send_notification("[ERROR] App icon readback failed (write may be blocked)");
                }
            } else {
                log("[ERROR] App icon write to appmeta FAILED. If it repeats every boot, the sandbox blocks /user/appmeta writes.");
                send_notification("[ERROR] App icon write FAILED (sandbox block?)");
            }
        } else {
            log("Icons are identical. No update needed.");
        }

    } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        log("[ERROR] updateIcon failed: " + msg);
        send_notification("[ERROR] updateIcon: " + msg);
    }
  }

  await list_dir_entries("/user/appmeta/" + get_title_id() + "/");
  await list_dir_entries("/mnt/sandbox/" + get_title_id() + "_000/download0/cache/splash_screen/aHR0cHM6Ly93d3cueW91dHViZS5jb20vdHY=/");

  await updateIcon();

}