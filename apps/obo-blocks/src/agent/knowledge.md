# OBO Blocks — AI Knowledge Base

This file describes **every Python code snippet this platform can generate** through its visual block editor.
Use it to answer user questions accurately and to stay within the capabilities of the platform.

---

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
- `break` / `continue` / `pass` statements
- Multi-line string literals
- File I/O (`open()`, `read()`, `write()`)
- Any third-party library beyond `machine` and `time`

If a user asks for something outside these blocks, **tell them clearly it is not supported** and suggest the closest block-based alternative.

---

## 📦 CATEGORIES & GENERATED CODE

### 1. Input / Output

| Block | Generated Python |
|-------|-----------------|
| `print` value | `print(value)` |
| `input` with prompt | `input("prompt")` |

**Examples:**
```python
print("Hello World!")
print(42)
print(my_variable)
name = input("Enter your name")
```

---

### 2. Operators

#### Values / Literals
| Block | Generated Python |
|-------|-----------------|
| String literal | `"Hello World!"` |
| Number literal | `0` (any number) |
| Boolean True | `True` |
| Boolean False | `False` |

#### Arithmetic
| Block | Generated Python | Notes |
|-------|-----------------|-------|
| Add | `a + b` | Works on numbers and strings (concatenation) |
| Subtract | `a - b` | |
| Multiply | `a * b` | |
| Divide | `(a / b if b != 0 else 0)` | Safe — returns 0 on division by zero |
| Modulo | `(a % b if b != 0 else 0)` | Safe — returns 0 when divisor is zero |
| Power | `a ** b` | |

#### Comparison
| Block | Generated Python |
|-------|-----------------|
| Equal | `a == b` |
| Not equal | `a != b` |
| Greater than | `a > b` |
| Less than | `a < b` |
| Greater than or equal | `a >= b` |
| Less than or equal | `a <= b` |

#### Conversion
| Block | Generated Python |
|-------|-----------------|
| Convert int to string | `str(number)` |

#### Range
| Block | Generated Python |
|-------|-----------------|
| Range with start, end, step | `range(start, end, step)` |
| Range with start, end | `range(start, end)` |
| Range with end only | `range(end)` |

**Examples:**
```python
result = 10 + 5
result = (100 / 3 if 3 != 0 else 0)
result = 2 ** 8
is_valid = x >= 0
label = str(42)
for i in range(0, 10, 2):
    print(i)
```

---

### 3. Control Flow

| Block | Generated Python |
|-------|-----------------|
| If | `if condition:\n    statements` |
| If / Else | `if condition:\n    statements\nelse :\n    statements` |
| While loop | `while condition:\n    statements` |
| For loop | `for variable in value :\n    statements` |

**Examples:**
```python
if x == 10:
    print("ten")

if x > 0:
    print("positive")
else :
    print("not positive")

while True:
    print("running")

for i in range(0, 5) :
    print(i)
```

> **Note:** There is no `break`, `continue`, or `elif` block. A chain of if/else blocks must be nested manually.

---

### 4. Variables

Variables are created through Blockly's built-in variable system.

| Block | Generated Python |
|-------|-----------------|
| Set variable | `variable_name = value` |
| Get variable | `variable_name` |
| Change variable (math change) | `variable_name = (variable_name if isinstance(variable_name, Number) else 0) + delta` |

**Example:**
```python
counter = 0
counter = counter + 1
print(counter)
```

> **Note:** Variable names are managed by Blockly. Users cannot freely type variable names — they must create them via the Variables category.

---

### 5. List Operations

Lists are created and manipulated through dedicated blocks.

| Block | Generated Python |
|-------|-----------------|
| Create list | `[1,2,3]` (comma-separated values as text) |
| Append to list | `list.append(value)` |
| Remove from list | `list.remove(value)` |
| Get item by index | `list[index]` |
| Set item by index | `list[index] = "value"` |

**Examples:**
```python
my_list = [1,2,3]
my_list.append(4)
my_list.remove(2)
item = my_list[0]
my_list[1] = "hello"
```

> **Note:** The list block takes a text field (e.g. `1,2,3`). It does **not** support nested expressions in the list literal — use `append` to build dynamic lists.

---

### 6. Functions (Procedures)

| Block | Generated Python |
|-------|-----------------|
| Define function (no return) | `def funcName(arg1, arg2):\n    body` |
| Define function (with return) | `def funcName(arg1, arg2):\n    body\n    return value` |
| Call function (no return) | `funcName(arg1, arg2)` |
| Call function (with return) | `funcName(arg1, arg2)` (as expression) |
| Conditional return | `if condition:\n    return value` |

**Example:**
```python
def greet(name):
    print("Hello " + name)

def add(a, b):
    return a + b

greet("Alice")
result = add(3, 4)
```

---

### 7. Sleep / Time

| Block | Generated Python | Auto-import |
|-------|-----------------|-------------|
| Sleep N seconds | `time.sleep(N)` | `import time` |

**Example:**
```python
import time

time.sleep(1)
print("done")
time.sleep(0.5)
```

---

### 8. MicroPython — Pin (GPIO)

> All Pin blocks automatically inject `import machine` at the top of the generated code.

| Block | Generated Python |
|-------|-----------------|
| Create pin (set mode) | `pin_var = machine.Pin(pin_number, machine.Pin.IN)` or `.OUT` |
| Set pin On/Off | `pin_var.On()` or `pin_var.Off()` |
| Set pin value (0 or 1) | `pin_var.value(0)` or `pin_var.value(1)` |

**Example — blink an LED:**
```python
import machine
import time

led = machine.Pin(25, machine.Pin.OUT)

while True:
    led.value(1)
    time.sleep(1)
    led.value(0)
    time.sleep(1)
```

> **Pin numbers:** 0–30. Mode is either `IN` (input) or `OUT` (output).
> Pin variables must be created using the **"Create pin…"** button in the MicroPython category.

---

### 9. MicroPython — ADC (Analog-to-Digital Converter)

> All ADC blocks automatically inject `import machine`.

| Block | Generated Python |
|-------|-----------------|
| Create ADC from pin | `adc_var = machine.ADC(pin_var)` |
| Read ADC (16-bit) | `result_var = adc_var.read_u16()` |
| Read ADC (microvolts) | `result_var = adc_var.read_uv()` |

**Example — read sensor voltage:**
```python
import machine

sensor_pin = machine.Pin(26, machine.Pin.IN)
sensor_adc = machine.ADC(sensor_pin)
reading = sensor_adc.read_u16()
print(reading)
voltage = sensor_adc.read_uv()
print(voltage)
```

> `read_u16()` returns a value from 0 to 65535 (16-bit).
> `read_uv()` returns the voltage in microvolts.
> ADC variables must be created using the **"Create adc…"** button.

---

### 10. MicroPython — PWM (Pulse Width Modulation)

> All PWM blocks automatically inject `import machine`.

| Block | Generated Python |
|-------|-----------------|
| Create PWM from pin | `pwm_var = machine.PWM(pin_var, freq=50, duty_u16=8000)` |
| Initialize / reinitialize PWM | `pwm_var.init(freq=50, duty_ns=8000)` |
| Set duty cycle (16-bit) | `pwm_var.duty_u16(32768)` |
| Set duty cycle (nanoseconds) | `pwm_var.duty_ns(5000)` |
| Set frequency | `pwm_var.freq(50)` |
| Deinitialize PWM | `pwm_var.deinit()` |

**Example — control a servo:**
```python
import machine

servo_pin = machine.Pin(15, machine.Pin.OUT)
servo = machine.PWM(servo_pin, freq=50, duty_u16=4915)
servo.duty_u16(7372)
servo.freq(50)
servo.deinit()
```

> `duty_u16` range: 0–65535. For a 50 Hz servo: ~4915 = 0°, ~7372 = 90°, ~9830 = 180°.
> PWM variables must be created using the **"Create pwm…"** button.

---

### 11. MicroPython — I2C

> All I2C blocks automatically inject `import machine`.

| Block | Generated Python |
|-------|-----------------|
| Create I2C bus | `i2c_var = machine.I2C(scl=scl_pin, sda=sda_pin, freq=400000)` |
| I2C init (re-init) | `i2c_var = machine.I2C(scl=scl_pin, sda=sda_pin, freq=400000)` |
| Scan for I2C devices | `i2c_var.scan()` |
| Deinitialize I2C | `i2c_var.deint()` |

**Example — scan for I2C devices:**
```python
import machine

scl = machine.Pin(5, machine.Pin.OUT)
sda = machine.Pin(4, machine.Pin.OUT)
i2c_bus = machine.I2C(scl=scl, sda=sda, freq=400000)
devices = i2c_bus.scan()
print(devices)
```

> Default frequency is 400000 Hz (400 kHz, fast mode).
> I2C variables must be created using the **"Create i2c…"** button.

---

## 🔁 COMPLETE EXAMPLE — Sensor + LED Feedback

Here is a realistic complete program using multiple categories:

```python
import machine
import time

# Setup
led = machine.Pin(25, machine.Pin.OUT)
sensor_pin = machine.Pin(26, machine.Pin.IN)
sensor = machine.ADC(sensor_pin)

threshold = 30000

while True:
    reading = sensor.read_u16()
    if reading > threshold:
        led.value(1)
    else :
        led.value(0)
    time.sleep(0.1)
```

---

## ❌ WHAT THIS PLATFORM CANNOT GENERATE

Do NOT suggest the following — there are no blocks for them:
- `class MyClass:` — No OOP / class blocks
- `try: ... except:` — No exception handling blocks
- `import numpy`, `import random`, etc. — Only `machine` and `time` are supported
- `f"Hello {name}"` — No f-string or string formatting blocks  
- `{key: value}` — No dictionary blocks
- `(a, b)` — No tuple blocks
- `break` / `continue` — No loop control blocks
- `open("file")` — No file I/O blocks
- `lambda x: x + 1` — No lambda blocks
- `async / await` — No async blocks
- Any `import` written manually by the user

If a user asks for any of these, respond with: *"This feature is not available as a block in OBO Blocks."* and suggest the closest supported alternative if one exists.
