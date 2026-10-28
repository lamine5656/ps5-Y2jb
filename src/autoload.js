async function start_autoload() {

  function sceNetHtons(hostshort) {
    return ((hostshort & 0xff) << 8) | ((hostshort >> 8) & 0xff);
  }

  function file_exists(path) {
    const path_addr = alloc_string(path);
    const stat_buf = malloc(0x200n);
    const ret = syscall(SYSCALL.stat, path_addr, stat_buf);
    return ret === 0n;
  }

  function read_file_to_buffer(path) {
    const path_addr = alloc_string(path);
    const stat_buf = malloc(0x200n);
    if (syscall(SYSCALL.stat, path_addr, stat_buf) !== 0n) {
      throw new Error("read_file_to_buffer: stat failed for " + path);
    }
    const file_size = Number(read64(stat_buf + 72n));
    if (file_size <= 0) {
      throw new Error("read_file_to_buffer: invalid file size " + file_size);
    }

    const fd = syscall(SYSCALL.open, path_addr, O_RDONLY, 0n);
    if (fd < 0n) {
      throw new Error("read_file_to_buffer: open failed for " + path + " fd: " + toHex(fd));
    }

    const file_buffer = malloc(BigInt(file_size));
    let total_bytes_read = 0n;

    try {
      const bytes_read = syscall(SYSCALL.read, fd, file_buffer, BigInt(file_size));
      total_bytes_read = bytes_read;

      if (bytes_read < 0n) {
        throw new Error("read_file_to_buffer: read failed: " + toHex(bytes_read));
      }
      if (Number(bytes_read) !== file_size) {
        throw new Error(`read_file_to_buffer: incomplete read. Expected ${file_size}, got ${bytes_read}`);
      }
    } finally {
      syscall(SYSCALL.close, fd);
    }

    return { buffer: file_buffer, size: file_size };
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function find_file(filename) {
    const search = [
        "/mnt/sandbox/" + TITLE_ID + "_000/download0/cache/splash_screen/aHR0cHM6Ly93d3cueW91dHViZS5jb20vdHY=/" + filename,
        "/mnt/sandbox/" + TITLE_ID + "_001/download0/cache/splash_screen/aHR0cHM6Ly93d3cueW91dHViZS5jb20vdHY=/" + filename,
        "/mnt/sandbox/" + TITLE_ID + "_002/download0/cache/splash_screen/aHR0cHM6Ly93d3cueW91dHViZS5jb20vdHY=/" + filename,
    ];
    for (const path of search) {
        if (file_exists(path)) {
            return path;
        }
    }
    return null;
  }

  // wait for elf_loader to start accepting connections (itsPLK 143e3f0: fast 25ms poll,
  // buffers allocated once, and connect_ret must be exactly 0n - FreeBSD raw syscalls
  // return positive errno codes on failure)
  let loader_active = false;
  const LOADER_WAIT_TRIES = 200; // 200 x 25ms = up to 5s of polling
  const enable = malloc(4n);
  write32(enable, 1n);
  // Prepare sockaddr for 127.0.0.1:9021
  const sockaddr = malloc(16n);
  write8(sockaddr + 0n, 16n); // sin_len
  write8(sockaddr + 1n, AF_INET); // sin_family
  write16(sockaddr + 2n, BigInt(sceNetHtons(9021))); // sin_port
  write8(sockaddr + 4n, 127n); // 127.0.0.1
  write8(sockaddr + 5n, 0n);
  write8(sockaddr + 6n, 0n);
  write8(sockaddr + 7n, 1n);
  for (let i = 0; i < LOADER_WAIT_TRIES; i++) {
    const sockfd = syscall(SYSCALL.socket, AF_INET, SOCK_STREAM, 0n);
    if (sockfd >= 0n) {
      syscall(SYSCALL.setsockopt, sockfd, SOL_SOCKET, SO_REUSEADDR, enable, 4n);
      const connect_ret = syscall(SYSCALL.connect, sockfd, sockaddr, 16n);
      syscall(SYSCALL.close, sockfd);
      if (connect_ret === 0n) {
        loader_active = true;
        break;
      }
    }
    await sleep(25);
  }

  if (!loader_active) {
    await log("[ERROR] autoloader: elf_loader is not active");
    send_notification("[ERROR] elf_loader is not active");
    return;
  }

  const payload_name = "ps5-unified-autoloader.elf";
  const payload_path = find_file(payload_name);

  if (!payload_path) {
    const msg = "[-] Payload not found: " + payload_name;
    await log(msg);
    send_notification(msg);
    return;
  }

  await log("Loading payload from: " + payload_path);

  try {
    const { buffer, size } = read_file_to_buffer(payload_path);
    await log(`Payload size: ${size} bytes`);
    
    const sockfd = syscall(SYSCALL.socket, AF_INET, SOCK_STREAM, 0n);
    if (sockfd < 0n) {
      throw new Error("socket creation failed: " + toHex(sockfd));
    }

    const enable = malloc(4n);
    write32(enable, 1n);
    syscall(SYSCALL.setsockopt, sockfd, SOL_SOCKET, SO_REUSEADDR, enable, 4n);

    // Prepare sockaddr for 127.0.0.1:9021
    const sockaddr = malloc(16n);
    write8(sockaddr + 0n, 16n);
    write8(sockaddr + 1n, AF_INET);
    write16(sockaddr + 2n, BigInt(sceNetHtons(9021)));
    write8(sockaddr + 4n, 127n);
    write8(sockaddr + 5n, 0n);
    write8(sockaddr + 6n, 0n);
    write8(sockaddr + 7n, 1n);

    // Connect with retries (elfldr accept queue can be briefly busy; success is exactly 0n)
    let connect_ret = -1n;
    const CONNECT_RETRIES = 3;
    for (let i = 0; i < CONNECT_RETRIES; i++) {
      connect_ret = syscall(SYSCALL.connect, sockfd, sockaddr, 16n);
      if (connect_ret === 0n) break;
      if (i < CONNECT_RETRIES - 1) {
        await log("connect failed (" + toHex(connect_ret) + "), retrying in 300ms...");
        await sleep(300);
      }
    }
    if (connect_ret !== 0n) {
      syscall(SYSCALL.close, sockfd);
      throw new Error("connect failed after " + CONNECT_RETRIES + " retries: " + toHex(connect_ret));
    }

    await log("Connected to loader. Writing ELF data...");
    // Send with manual offset, handled piece by piece (large write can be partial)
    let total_sent = 0n;
    const remaining_total = BigInt(size);
    while (total_sent < remaining_total) {
      const sent = syscall(SYSCALL.write, sockfd, buffer + total_sent, remaining_total - total_sent);
      if (sent <= 0n) {
        syscall(SYSCALL.close, sockfd);
        throw new Error("error sending elf data at offset " + total_sent + "/" + remaining_total + ": " + toHex(sent));
      }
      total_sent += sent;
    }
    syscall(SYSCALL.close, sockfd);
    total_sent = remaining_total;

    const msg = `Successfully loaded unified autoloader`;
    await log(msg);
    send_notification(msg);

  } catch (e) {
    const errorMsg = "Payload Sender Error: " + e.message;
    await log(errorMsg);
    send_notification(errorMsg);
  }
}
