# EV5 Dev Tools

**EV5 Dev Tools** is an npm-based **CLI utility** that helps you scaffold a **KAZI-EV5** project using **ANSI C** instead of **KAZI Scratch**. This streamlines your development workflow by generating a ready-to-use project structure.

The generated project includes:

- A basic `main.c` file that includes basic **EV5 C SDK** headers.
- A preconfigured `.vscode/settings.json` for the correct **compiler**, **include paths**, and **IntelliSense** settings.
- A `scripts/` directory containing scripts for **building** and **uploading** code to the EV5.

---

## Prerequisites

- [Node.js](https://nodejs.org/en) must be installed.
- (Optional) You can install this package globally to use it from anywhere:

```bash
npm install -g ev5-dev-tools
```

---

## Usage

### Create a New Project

To create a new project using the **default** template:

```bash
ev5-dev-tools create my-project
```

This will generate a `my-project/` folder with the default template files.

To use a specific template (e.g., `display`):

```bash
ev5-dev-tools create my-project --template=display
```

This will generate a `my-project/` folder using the `display` template, merged with the shared configuration files.

---

## Example Output

```bash
ev5-dev-tools create lcd-test --template=display
```

Creates a folder like this:

```
lcd-test/
├── .vscode/
│   └── c_cpp_properties.json
├── scripts/
│   ├── build.ps1
│   └── upload.ps1
├── main.c
└── .gitignore
```

---

## Template Repository

Templates are maintained in a separate repository:

- [ev5-dev-tools-templates](https://github.com/JMRMEDEV/ev5-dev-tools-templates)

You can view, modify, or contribute templates there.

---

## License

MIT
