# EV5 Dev Tools

**EV5 Dev Tools** is an npm-based **CLI utility** that helps you scaffold and manage **KAZI-EV5** ANSI C projects. It streamlines your development workflow by providing commands to **create**, **build**, and **upload** projects directly from the command line.

The generated project includes:

- A basic `main.c` or chosen program source file.
- A preconfigured `.vscode/settings.json` for the correct **compiler**, **include paths**, and **IntelliSense**.
- Built-in CLI commands to **build** and **upload** without relying on PowerShell scripts.

---

## Prerequisites

### Required Tools

- [Node.js](https://nodejs.org/en) must be installed.
- `arm-none-eabi-gcc` and `arm-none-eabi-objcopy` must be available in your `PATH`.

### Setup: EV5 SDK

1. **Download Kazi-Scratch** from your EV5 hardware provider (Windows `.exe` installer).

   - **Linux users**: May need to extract the `.exe` using Wine or another method.

2. **Extract the compiler resources**:

   - Find the `includeRTOSEV5` folder under the installation directory (e.g.,\
     `C:\Program Files (x86)\Scratch2-KAZI\compiler\...`).
   - Copy it to a safe location, e.g., `C:\ev5-sdk\includeRTOSEV5`.

3. **Set up environment variable**:

   - Create an environment variable named `EV5_SDK` that points to the root SDK directory (e.g., `C:\ev5-sdk`).
   - This allows the CLI to locate headers and linker scripts for builds.

4. Ensure `arm-none-eabi-*` tools are available globally (can be downloaded from ARM or installed via package managers).

5. Ensure the compiled `.c` program has access to `RTOSEV5` object files (typically found in `EV5_SDK/includeRTOSEV5/o/`).

### Setup: Uploading via USB

- Plug in the EV5 device via USB.
- Power on the EV5 and enter **Download mode** (usually via a button on the brick).
- The device must be mounted and visible with the volume label `EV5`.

> **WiFi Upload** is not yet supported.

Optional: Install globally for convenience:

```bash
npm install -g ev5-dev-tools
```

---

## CLI Usage

### Create a New Project

To create a new project using the **default** template:

```bash
ev5-dev-tools create my-project
```

To use a specific template (e.g., `display`):

```bash
ev5-dev-tools create my-project --template=display
```

This pulls templates from the [ev5-dev-tools-templates](https://github.com/JMRMEDEV/ev5-dev-tools-templates) repo.

---

### Build a Program

Compile your program by specifying the name of the `.c` file (without extension):

```bash
ev5-dev-tools build --program=wifi16
```

If `--program` is omitted, it defaults to `main`, compiling `main.c`.

The resulting `.bin` file will be created in the current directory.

---

### Upload to EV5

Upload the compiled `.bin` file to an EV5 USB device:

```bash
ev5-dev-tools upload --program=wifi16
```

- The tool auto-detects the EV5 USB drive based on the volume label `EV5`.
- Works on **Windows**, **macOS**, and **Linux**.
- If `--program` is omitted, it defaults to `main`.

---

### Other Commands

Show version:

```bash
ev5-dev-tools --version
```

Show help:

```bash
ev5-dev-tools --help
```

---

## Example Project Structure

```text
my-project/
├── .vscode/
│   └── c_cpp_properties.json
├── main.c
├── .gitignore
└── (other template files)
```

---

## Notes

Please, consider the following guidance for your development workflow.

### Intended Use

#### Compiling

These commands mimic the ones we originally tested with the Kazi SDK compiler:

1. `.o` file creation:

```bash
..\..\compiler\ARM\bin\arm-none-eabi-gcc -I..\..\compiler\includeRTOSEV5 -mcpu=cortex-m3 -mthumb -Os -fsigned-char -w -gdwarf-2 -DF_CPU=72000000UL -std=gnu99 -c main.c -o main.o
```

2. `.elf` file creation:

```bash
..\..\compiler\ARM\bin\arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -L..\..\compiler\includeRTOSEV5/o -T..\..\compiler\includeRTOSEV5\o\stm32_flash.ld --% -Wl,--gc-sections -Wl,-Map=main.map,-cref main.o -lm -o main.elf
```

3. `.bin` conversion:

```bash
..\..\compiler\ARM\bin\arm-none-eabi-objcopy.exe -O binary main.elf main.bin
```

### Linux Support

- Full Linux support is planned.
- However, since the build and upload logic is implemented in Node.js, core functionality may already work on Linux systems without modification.

### Compiler

The CLI now supports using the **officially distributed** `arm-none-eabi` compiler instead of the bundled version from Kazi-Scratch.

Original compiler reference:

1. `arm-none-eabi-gcc`:

```
arm-none-eabi-gcc.exe (GNU Tools for ARM Embedded Processors) 4.8.4 20140526 (release)
```

2. `arm-none-eabi-objcopy`:

```
GNU objcopy (GNU Tools for ARM Embedded Processors) 2.23.2.20140529
```

We installed a nearly identical version from [Launchpad GCC ARM Embedded Downloads](https://launchpad.net/gcc-arm-embedded/+download?direction=backwards\&memo=10).

### Next Steps

- Add WiFi-based program uploading.
- Finalize full Linux support.
- Test and document compatibility with newer versions of `arm-none-eabi`.

---

## Template Repository

Templates are maintained separately:

- [ev5-dev-tools-templates](https://github.com/JMRMEDEV/ev5-dev-tools-templates)

You can view, extend, or contribute to available templates.

---

## License

MIT
