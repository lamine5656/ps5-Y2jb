#!/usr/bin/env bash
set -e

# Ensure we are in the project root
cd "$(dirname "$0")"

BUILD_TYPE="dev"
DEP_ACTION="auto"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --stable) BUILD_TYPE="stable" ;;
        --dev) BUILD_TYPE="dev" ;;
        --build-deps|-b) DEP_ACTION="build" ;;
        --download-deps|-d)
            echo "Note: dependencies are bundled in src/, nothing to download."
            DEP_ACTION="auto" ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

DEST_DIR="src"

# Helper to build dependencies from source
build_source_deps() {
    echo "=== Building dependencies from source ==="
    
    if [ ! -e "third_party/ps5-elfldr/.git" ] || [ ! -e "third_party/ps5-kexp/.git" ]; then
        echo "Error: Submodules are not initialized. Please run: git submodule update --init --recursive" >&2
        exit 1
    fi
    
    # Clean old binaries
    rm -f "$DEST_DIR"/kexp-*.bin
    rm -f "$DEST_DIR"/elfldr-ps5-*.elf
    rm -f "$DEST_DIR"/kexp_v*.bin
    rm -f "$DEST_DIR"/kexp_v*.bin
    rm -f "$DEST_DIR"/elfldr*.elf
    
    echo "Building ps5-elfldr..."
    (cd third_party/ps5-elfldr && ./build.sh)
    ELFLDR_VER=$(git -C third_party/ps5-elfldr describe --tags --always)
    cp third_party/ps5-elfldr/elfldr-ps5.elf "$DEST_DIR/elfldr-ps5-${ELFLDR_VER}.elf"
    
    echo "Building ps5-kexp..."
    (cd third_party/ps5-kexp && ./build.sh)
    KEXP_VER=$(git -C third_party/ps5-kexp describe --tags --always)
    cp third_party/ps5-kexp/build/kexp.bin "$DEST_DIR/kexp-${KEXP_VER}.bin"

    echo "Building ps5-unified-autoloader..."
    if [ ! -e "third_party/ps5-unified-autoloader/.git" ]; then
        echo "Error: ps5-unified-autoloader submodule is not initialized. Please run: git submodule update --init --recursive" >&2
        exit 1
    fi
    (cd third_party/ps5-unified-autoloader && ./build_release.sh -b)
    AUTOLOADER_VER=$(git -C third_party/ps5-unified-autoloader describe --tags --always)
    AUTOLOADER_ELF=$(ls third_party/ps5-unified-autoloader/autoloader_v*.elf 2>/dev/null | head -n 1)
    if [ -z "$AUTOLOADER_ELF" ]; then
        echo "Error: ps5-unified-autoloader build succeeded but no output ELF found." >&2
        exit 1
    fi
    rm -f "$DEST_DIR"/ps5-unified-autoloader*.elf
    cp "$AUTOLOADER_ELF" "$DEST_DIR/ps5-unified-autoloader.elf"

    if [ "${GITHUB_OUTPUT:-}" ]; then
        echo "elfldr_ver=${ELFLDR_VER}" >> "$GITHUB_OUTPUT"
        echo "kexp_ver=${KEXP_VER}" >> "$GITHUB_OUTPUT"
        echo "unified_autoloader_ver=${AUTOLOADER_VER}" >> "$GITHUB_OUTPUT"
    fi
    
    echo "Source build complete."
}

# Dependencies are bundled in src/ - no download or submodule checkout needed
use_bundled_deps() {
    FOUND=$(ls "$DEST_DIR"/kexp-*.bin "$DEST_DIR"/elfldr-ps5-*.elf "$DEST_DIR"/ps5-unified-autoloader.elf 2>/dev/null | wc -l | tr -d ' ')
    if [ "$FOUND" -lt 3 ]; then
        echo "Error: bundled binaries missing from $DEST_DIR/ (need kexp-*.bin, elfldr-ps5-*.elf and ps5-unified-autoloader.elf)." >&2
        exit 1
    fi
    echo "Using bundled dependencies from $DEST_DIR."
}

# Resolve dependency action
if [ "$DEP_ACTION" = "build" ]; then
    build_source_deps
else
    use_bundled_deps
fi

echo "Creating Y2JB update package..."
make all BUILD_TYPE=$BUILD_TYPE
