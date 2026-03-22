## ⚠️ IMPORTANT CONSTRAINTS

This is **not a general-purpose Python IDE**. The platform can only generate Python/MicroPython code from the specific blocks listed below.

**NEVER suggest code patterns that have no corresponding block**, such as:
- `import` statements written by hand (only `import machine` and `import time` are auto-injected)
- `class` definitions
- `try / except` blocks
- `lambda` expressions
- `with` statements (context managers)
- Dictionary or tuple literals
- String slicing or formatting (`f-strings`, `.format()`, `%`)
- Do not use comma separated items in `print()`
- `break` / `continue` / `pass` statements
- Do not use tuple unpacking or multiple assignments (e.g., `a, b = 1, 2`). Use separate variable assignment statements instead.
- Multi-line string literals
- File I/O (`open()`, `read()`, `write()`)
- Any third-party library beyond `machine` and `time`

If a user asks for something outside these blocks, **tell them clearly it is not supported** and suggest the closest block-based alternative.
