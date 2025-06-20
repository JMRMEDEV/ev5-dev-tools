# EV5 Dev Tools

**EV5 Dev Tools** is an npm-based **CLI utility** that helps you scaffold and manage **KAZI-EV5** ANSI C projects. It streamlines your development workflow by providing commands to **create**, **build**, and **upload** projects directly from the command line.

The generated project includes:

- A basic `main.c` or chosen program source file.
- A preconfigured `.vscode/settings.json` for the correct **compiler**, **include paths**, and **IntelliSense**.
- Built-in CLI commands to **build** and **upload** without relying on PowerShell scripts.

---

## Prerequisites

- [Node.js](https://nodejs.org/en) must be installed.
- `arm-none-eabi-gcc` and `arm-none-eabi-objcopy` must be available in your PATH (part of the EV5 SDK toolchain).
- Set the `EV5_SDK` environment variable pointing to your EV5 SDK path (e.g., `C:\ev5-sdk`).

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

## Template Repository

Templates are maintained separately:

- [ev5-dev-tools-templates](https://github.com/JMRMEDEV/ev5-dev-tools-templates)

You can view, extend, or contribute to available templates.

---

## License

MIT
