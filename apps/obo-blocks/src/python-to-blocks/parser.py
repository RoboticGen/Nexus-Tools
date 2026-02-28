"""
Python-to-Blockly JSON Reverse Parser
=====================================
Parses Python code using the `ast` module and produces a Blockly workspace
JSON structure that can be loaded via Blockly.serialization.workspaces.load().

Covers all block types defined in obo-blocks:
  - Basic: print, string, number, true, false, input
  - Math: add, subtract, multiply, division, modulo, power
  - Comparison: equal, not_equal, greater_than, less_than, gte, lte
  - Control: if, if_else, while, for
  - Data: list, list_append, list_remove, list_index_get, list_index_set
  - Variables: variables_get, variables_set
  - Conversion: int_str_conv, range
  - Time: time_sleep
  - Hardware: pin_mode, pin_state, pin_value, create_adc, read_adc,
              read_micro_volt, create_pwm, set_pwm_duty, init_pwm,
              deinitilize_pwm, set_duty_ns, set_frequency,
              i2c, i2c_init, deint_i2c, i2c_scan
  - Functions: procedures_defnoreturn, procedures_defreturn,
               procedures_callnoreturn, procedures_callreturn
"""

import ast
import json
import uuid


def _uid():
    return str(uuid.uuid4())[:8]


# ---------------------------------------------------------------------------
# Variable tracking
# ---------------------------------------------------------------------------
class VarTracker:
    def __init__(self):
        self.vars = {}           # name -> {"id": ..., "type": ""}
        self.pin_vars = set()
        self.adc_vars = set()
        self.pwm_vars = set()
        self.i2c_vars = set()
        self.func_defs = {}      # func_name -> {"args": [...], "has_return": bool}

    def add_var(self, name, var_type=""):
        if name not in self.vars:
            self.vars[name] = {"id": _uid(), "type": var_type}
        elif var_type and not self.vars[name]["type"]:
            self.vars[name]["type"] = var_type
        return self.vars[name]["id"]

    def get_var_id(self, name, var_type=""):
        return self.add_var(name, var_type)

    def get_variables_json(self):
        result = []
        for name, info in self.vars.items():
            result.append({
                "name": name,
                "id": info["id"],
                "type": info["type"]
            })
        return result


tracker = VarTracker()


# ---------------------------------------------------------------------------
# Expression converters  (AST node -> Blockly block dict)
# ---------------------------------------------------------------------------

def convert_expr(node):
    """Convert an AST expression node to a Blockly block dict."""
    if node is None:
        return None

    if isinstance(node, ast.Constant):
        return convert_constant(node)
    elif isinstance(node, ast.Name):
        return convert_name(node)
    elif isinstance(node, ast.BinOp):
        return convert_binop(node)
    elif isinstance(node, ast.Compare):
        return convert_compare(node)
    elif isinstance(node, ast.BoolOp):
        return convert_boolop(node)
    elif isinstance(node, ast.UnaryOp):
        return convert_unaryop(node)
    elif isinstance(node, ast.Call):
        return convert_call_expr(node)
    elif isinstance(node, ast.List):
        return convert_list_literal(node)
    elif isinstance(node, ast.Subscript):
        return convert_subscript(node)
    elif isinstance(node, ast.IfExp):
        return convert_ifexp(node)
    elif isinstance(node, ast.NameConstant):
        # Python 3.7 compat
        if node.value is True:
            return {"type": "true_block", "id": _uid()}
        elif node.value is False:
            return {"type": "false_block", "id": _uid()}
        return None
    elif isinstance(node, ast.Num):
        # Python 3.7 compat
        return {"type": "number_block", "id": _uid(),
                "fields": {"input": node.n}}
    elif isinstance(node, ast.Str):
        # Python 3.7 compat
        return {"type": "string_block", "id": _uid(),
                "fields": {"input": node.s}}

    return None


def convert_constant(node):
    val = node.value
    if val is True:
        return {"type": "true_block", "id": _uid()}
    elif val is False:
        return {"type": "false_block", "id": _uid()}
    elif isinstance(val, (int, float)):
        return {"type": "number_block", "id": _uid(),
                "fields": {"input": val}}
    elif isinstance(val, str):
        return {"type": "string_block", "id": _uid(),
                "fields": {"input": val}}
    return None


def convert_name(node):
    var_id = tracker.get_var_id(node.id)
    return {
        "type": "variables_get",
        "id": _uid(),
        "fields": {"VAR": {"id": var_id, "name": node.id, "type": ""}}
    }


def _binop_type(op):
    mapping = {
        ast.Add: "add_block",
        ast.Sub: "subtract_block",
        ast.Mult: "multiply_block",
        ast.Pow: "power_block",
    }
    return mapping.get(type(op))


def convert_binop(node):
    # Check for safe division pattern: (a / b if b != 0 else 0)
    # This is generated as a plain BinOp for Div/Mod at source level
    op_type = type(node.op)
    if op_type == ast.Div:
        return _make_binary("division_block", node.left, node.right)
    elif op_type == ast.Mod:
        return _make_binary("modulo_block", node.left, node.right)

    block_type = _binop_type(node.op)
    if block_type:
        return _make_binary(block_type, node.left, node.right)
    return None


def _make_binary(block_type, left_node, right_node):
    block = {"type": block_type, "id": _uid(), "inputs": {}}
    left = convert_expr(left_node)
    right = convert_expr(right_node)
    if left:
        block["inputs"]["left"] = {"block": left}
    if right:
        block["inputs"]["right"] = {"block": right}
    return block


def convert_compare(node):
    if len(node.ops) != 1 or len(node.comparators) != 1:
        return None
    op = node.ops[0]
    mapping = {
        ast.Eq: "equal_block",
        ast.NotEq: "not_equal_block",
        ast.Gt: "greater_than_block",
        ast.Lt: "less_than_block",
        ast.GtE: "greater_than_equal_block",
        ast.LtE: "less_than_equal_block",
    }
    block_type = mapping.get(type(op))
    if block_type:
        return _make_binary(block_type, node.left, node.comparators[0])
    return None


def convert_boolop(node):
    # Not directly supported by block set; flatten to first comparison
    if node.values:
        return convert_expr(node.values[0])
    return None


def convert_unaryop(node):
    if isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant):
        return {"type": "number_block", "id": _uid(),
                "fields": {"input": -node.operand.value}}
    return convert_expr(node.operand)


def convert_call_expr(node):
    """Convert a Call node used as an expression (returns a value)."""
    func_name = _get_func_name(node)

    if func_name == "input":
        prompt = ""
        if node.args and isinstance(node.args[0], ast.Constant):
            prompt = node.args[0].value
        return {"type": "input_block", "id": _uid(),
                "fields": {"input": prompt}}

    if func_name == "range":
        return _convert_range(node)

    if func_name == "str":
        if node.args and isinstance(node.args[0], ast.Constant):
            return {"type": "int_str_conv_block", "id": _uid(),
                    "fields": {"number": node.args[0].value}}
        return None

    # User-defined function call with return
    if func_name and func_name in tracker.func_defs:
        info = tracker.func_defs[func_name]
        if info.get("has_return"):
            var_id = tracker.get_var_id(func_name)
            block = {
                "type": "procedures_callreturn",
                "id": _uid(),
                "fields": {"NAME": {"id": var_id, "name": func_name, "type": ""}},
                "inputs": {}
            }
            for i, arg_node in enumerate(node.args):
                arg_block = convert_expr(arg_node)
                if arg_block:
                    block["inputs"]["ARG" + str(i)] = {"block": arg_block}
            return block

    return None


def _convert_range(node):
    block = {"type": "range_block", "id": _uid(), "inputs": {}}
    args = node.args
    if len(args) == 1:
        end = convert_expr(args[0])
        if end:
            block["inputs"]["end"] = {"block": end}
    elif len(args) == 2:
        start = convert_expr(args[0])
        end = convert_expr(args[1])
        if start:
            block["inputs"]["start"] = {"block": start}
        if end:
            block["inputs"]["end"] = {"block": end}
    elif len(args) >= 3:
        start = convert_expr(args[0])
        end = convert_expr(args[1])
        step = convert_expr(args[2])
        if start:
            block["inputs"]["start"] = {"block": start}
        if end:
            block["inputs"]["end"] = {"block": end}
        if step:
            block["inputs"]["step"] = {"block": step}
    return block


def convert_list_literal(node):
    # Blockly list_block stores comma-separated items as a text field
    parts = []
    for elt in node.elts:
        if isinstance(elt, ast.Constant):
            parts.append(str(elt.value))
        elif isinstance(elt, ast.Name):
            parts.append(elt.id)
        else:
            parts.append("?")
    return {"type": "list_block", "id": _uid(),
            "fields": {"input": ",".join(parts)}}


def convert_subscript(node):
    if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, int):
        block = {
            "type": "list_index_get_block",
            "id": _uid(),
            "fields": {"index": node.slice.value},
            "inputs": {}
        }
        val = convert_expr(node.value)
        if val:
            block["inputs"]["input"] = {"block": val}
        return block
    # Python 3.8 compat for Index wrapper
    if isinstance(node.slice, ast.Index):
        idx_node = node.slice.value
        if isinstance(idx_node, ast.Constant) and isinstance(idx_node.value, int):
            block = {
                "type": "list_index_get_block",
                "id": _uid(),
                "fields": {"index": idx_node.value},
                "inputs": {}
            }
            val = convert_expr(node.value)
            if val:
                block["inputs"]["input"] = {"block": val}
            return block
    return None


def convert_ifexp(node):
    """Handle ternary: (a / b if b != 0 else 0) which is the safe division pattern."""
    # Try to detect the safe division/modulo patterns
    if (isinstance(node.orelse, ast.Constant) and node.orelse.value == 0
            and isinstance(node.test, ast.Compare)
            and isinstance(node.body, ast.BinOp)):
        if isinstance(node.body.op, ast.Div):
            return _make_binary("division_block", node.body.left, node.body.right)
        elif isinstance(node.body.op, ast.Mod):
            return _make_binary("modulo_block", node.body.left, node.body.right)
    return convert_expr(node.body)


# ---------------------------------------------------------------------------
# Statement converters  (AST stmt -> Blockly block dict)
# ---------------------------------------------------------------------------

def convert_stmt(node):
    """Convert a single AST statement to a Blockly block dict."""
    if isinstance(node, ast.Expr):
        return convert_expr_stmt(node)
    elif isinstance(node, ast.Assign):
        return convert_assign(node)
    elif isinstance(node, ast.If):
        return convert_if(node)
    elif isinstance(node, ast.While):
        return convert_while(node)
    elif isinstance(node, ast.For):
        return convert_for(node)
    elif isinstance(node, ast.FunctionDef):
        return convert_funcdef(node)
    elif isinstance(node, ast.Return):
        return convert_return(node)
    elif isinstance(node, ast.Import):
        return None  # imports are implicit in block world
    elif isinstance(node, ast.ImportFrom):
        return None
    return None


def convert_expr_stmt(node):
    """An expression used as a statement (e.g., print(...), func call, method call)."""
    call = node.value
    if isinstance(call, ast.Call):
        return convert_call_stmt(call)
    return None


def _get_func_name(node):
    """Extract a dotted function name string from a Call's func."""
    if isinstance(node.func, ast.Name):
        return node.func.id
    elif isinstance(node.func, ast.Attribute):
        if isinstance(node.func.value, ast.Name):
            return node.func.value.id + "." + node.func.attr
        elif isinstance(node.func.value, ast.Attribute):
            # e.g. machine.Pin.IN
            inner = node.func.value
            if isinstance(inner.value, ast.Name):
                return inner.value.id + "." + inner.attr + "." + node.func.attr
    return None


def convert_call_stmt(node):
    """Convert a Call node used as a statement."""
    func_name = _get_func_name(node)

    if func_name == "print":
        return _convert_print(node)
    if func_name == "time.sleep":
        return _convert_time_sleep(node)

    # Method calls on variables
    if isinstance(node.func, ast.Attribute):
        var_node = node.func.value
        method = node.func.attr
        if isinstance(var_node, ast.Name):
            var_name = var_node.id

            # Pin methods
            if method == "On" or method == "Off":
                return _convert_pin_state(var_name, method)
            if method == "value" and len(node.args) == 1:
                return _convert_pin_value(var_name, node.args[0])

            # ADC methods
            if method == "read_u16":
                return None  # handled in assignment context
            if method == "read_uv":
                return None  # handled in assignment context

            # PWM methods
            if method == "duty_u16" and len(node.args) == 1:
                return _convert_set_pwm_duty(var_name, node.args[0])
            if method == "init":
                return _convert_init_pwm(var_name, node)
            if method == "deinit":
                return _convert_deinit_pwm(var_name)
            if method == "duty_ns" and len(node.args) == 1:
                return _convert_set_duty_ns(var_name, node.args[0])
            if method == "freq" and len(node.args) == 1:
                return _convert_set_frequency(var_name, node.args[0])

            # I2C methods
            if method == "deint":
                return _convert_deint_i2c(var_name)
            if method == "scan":
                return _convert_i2c_scan(var_name)

            # list methods
            if method == "append" and len(node.args) == 1:
                return _convert_list_append(var_name, node.args[0])
            if method == "remove" and len(node.args) == 1:
                return _convert_list_remove(var_name, node.args[0])

    # User-defined function call (no return)
    if func_name and func_name in tracker.func_defs:
        info = tracker.func_defs[func_name]
        var_id = tracker.get_var_id(func_name)
        block = {
            "type": "procedures_callnoreturn",
            "id": _uid(),
            "fields": {"NAME": {"id": var_id, "name": func_name, "type": ""}},
            "inputs": {}
        }
        for i, arg_node in enumerate(node.args):
            arg_block = convert_expr(arg_node)
            if arg_block:
                block["inputs"]["ARG" + str(i)] = {"block": arg_block}
        return block

    # Fallback: simple named function call as procedure call
    if isinstance(node.func, ast.Name):
        fname = node.func.id
        if fname not in ("print", "input", "range", "str", "int", "float"):
            var_id = tracker.get_var_id(fname)
            block = {
                "type": "procedures_callnoreturn",
                "id": _uid(),
                "fields": {"NAME": {"id": var_id, "name": fname, "type": ""}},
                "inputs": {}
            }
            for i, arg_node in enumerate(node.args):
                arg_block = convert_expr(arg_node)
                if arg_block:
                    block["inputs"]["ARG" + str(i)] = {"block": arg_block}
            return block

    return None


# --- Specific statement converters ---

def _convert_print(node):
    block = {"type": "print_block", "id": _uid(), "inputs": {}}
    if node.args:
        val = convert_expr(node.args[0])
        if val:
            block["inputs"]["value"] = {"block": val}
    return block


def _convert_time_sleep(node):
    val = 0
    if node.args and isinstance(node.args[0], ast.Constant):
        val = node.args[0].value
    return {"type": "time_sleep", "id": _uid(), "fields": {"time": val}}


def _convert_pin_state(var_name, state):
    tracker.pin_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "Pin")
    return {
        "type": "pin_state", "id": _uid(),
        "fields": {
            "pin_variable": {"id": var_id, "name": var_name, "type": "Pin"},
            "pin_states": state
        }
    }


def _convert_pin_value(var_name, arg_node):
    tracker.pin_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "Pin")
    val = "0"
    if isinstance(arg_node, ast.Constant):
        val = str(arg_node.value)
    return {
        "type": "pin_value", "id": _uid(),
        "fields": {
            "pin_variable": {"id": var_id, "name": var_name, "type": "Pin"},
            "pin_values": val
        }
    }


def _convert_set_pwm_duty(var_name, arg_node):
    tracker.pwm_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "PWM")
    val = 32768
    if isinstance(arg_node, ast.Constant):
        val = arg_node.value
    return {
        "type": "set_pwm_duty", "id": _uid(),
        "fields": {
            "PWM": {"id": var_id, "name": var_name, "type": "PWM"},
            "duty_cycle": val
        }
    }


def _convert_init_pwm(var_name, call_node):
    tracker.pwm_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "PWM")
    freq = 50
    duty = 8000
    for kw in call_node.keywords:
        if kw.arg == "freq" and isinstance(kw.value, ast.Constant):
            freq = kw.value.value
        elif kw.arg == "duty_ns" and isinstance(kw.value, ast.Constant):
            duty = kw.value.value
    return {
        "type": "init_pwm", "id": _uid(),
        "fields": {
            "PWM": {"id": var_id, "name": var_name, "type": "PWM"},
            "frequency": freq, "duty": duty
        }
    }


def _convert_deinit_pwm(var_name):
    tracker.pwm_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "PWM")
    return {
        "type": "deinitilize_pwm", "id": _uid(),
        "fields": {"PWM": {"id": var_id, "name": var_name, "type": "PWM"}}
    }


def _convert_set_duty_ns(var_name, arg_node):
    tracker.pwm_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "PWM")
    val = 5000
    if isinstance(arg_node, ast.Constant):
        val = arg_node.value
    return {
        "type": "set_duty_ns", "id": _uid(),
        "fields": {
            "PWM": {"id": var_id, "name": var_name, "type": "PWM"},
            "duty_ns": val
        }
    }


def _convert_set_frequency(var_name, arg_node):
    tracker.pwm_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "PWM")
    val = 50
    if isinstance(arg_node, ast.Constant):
        val = arg_node.value
    return {
        "type": "set_frequency", "id": _uid(),
        "fields": {
            "PWM": {"id": var_id, "name": var_name, "type": "PWM"},
            "frequency": val
        }
    }


def _convert_deint_i2c(var_name):
    tracker.i2c_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "I2C")
    return {
        "type": "deint_i2c", "id": _uid(),
        "fields": {"i2c": {"id": var_id, "name": var_name, "type": "I2C"}}
    }


def _convert_i2c_scan(var_name):
    tracker.i2c_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "I2C")
    return {
        "type": "i2c_scan", "id": _uid(),
        "fields": {"I2C": {"id": var_id, "name": var_name, "type": "I2C"}}
    }


def _convert_list_append(var_name, arg_node):
    var_id = tracker.get_var_id(var_name)
    block = {
        "type": "list_append_block", "id": _uid(),
        "inputs": {
            "list": {"block": {
                "type": "variables_get", "id": _uid(),
                "fields": {"VAR": {"id": var_id, "name": var_name, "type": ""}}
            }}
        }
    }
    val = convert_expr(arg_node)
    if val:
        block["inputs"]["value"] = {"block": val}
    return block


def _convert_list_remove(var_name, arg_node):
    var_id = tracker.get_var_id(var_name)
    block = {
        "type": "list_remove_block", "id": _uid(),
        "inputs": {
            "list": {"block": {
                "type": "variables_get", "id": _uid(),
                "fields": {"VAR": {"id": var_id, "name": var_name, "type": ""}}
            }}
        }
    }
    val = convert_expr(arg_node)
    if val:
        block["inputs"]["value"] = {"block": val}
    return block


# --- Assignment handling ---

def convert_assign(node):
    if len(node.targets) != 1:
        return None
    target = node.targets[0]
    value = node.value

    # Subscript assignment: list[i] = "val"
    if isinstance(target, ast.Subscript):
        return _convert_subscript_assign(target, value)

    if not isinstance(target, ast.Name):
        return None

    var_name = target.id

    # machine.Pin(...) assignment
    if isinstance(value, ast.Call):
        func = _get_func_name(value)

        if func == "machine.Pin":
            return _convert_pin_mode(var_name, value)
        if func == "machine.ADC":
            return _convert_create_adc(var_name, value)
        if func == "machine.PWM":
            return _convert_create_pwm(var_name, value)
        if func == "machine.I2C":
            return _convert_i2c_create(var_name, value)

        # var = adc.read_u16()
        if isinstance(value.func, ast.Attribute):
            attr = value.func.attr
            if attr == "read_u16":
                return _convert_read_adc(var_name, value)
            if attr == "read_uv":
                return _convert_read_micro_volt(var_name, value)

    # Plain variable assignment: x = expr
    var_id = tracker.get_var_id(var_name)
    block = {
        "type": "variables_set", "id": _uid(),
        "fields": {"VAR": {"id": var_id, "name": var_name, "type": ""}},
        "inputs": {}
    }
    val = convert_expr(value)
    if val:
        block["inputs"]["VALUE"] = {"block": val}
    return block


def _convert_subscript_assign(target, value):
    idx = 0
    if isinstance(target.slice, ast.Constant):
        idx = target.slice.value
    elif isinstance(target.slice, ast.Index) and isinstance(target.slice.value, ast.Constant):
        idx = target.slice.value.value

    val_str = ""
    if isinstance(value, ast.Constant):
        val_str = str(value.value)

    block = {
        "type": "list_index_set_block", "id": _uid(),
        "fields": {"index": idx, "value": val_str},
        "inputs": {}
    }
    list_expr = convert_expr(target.value)
    if list_expr:
        block["inputs"]["input"] = {"block": list_expr}
    return block


def _convert_pin_mode(var_name, call_node):
    tracker.pin_vars.add(var_name)
    var_id = tracker.get_var_id(var_name, "Pin")
    pin_num = 0
    pin_mode = "OUT"
    if call_node.args:
        if isinstance(call_node.args[0], ast.Constant):
            pin_num = call_node.args[0].value
    if len(call_node.args) >= 2:
        mode_node = call_node.args[1]
        if isinstance(mode_node, ast.Attribute):
            pin_mode = mode_node.attr  # "IN" or "OUT"
    return {
        "type": "pin_mode", "id": _uid(),
        "fields": {
            "pin_number": pin_num,
            "pinVariable": {"id": var_id, "name": var_name, "type": "Pin"},
            "pinMode": pin_mode
        }
    }


def _convert_create_adc(var_name, call_node):
    tracker.adc_vars.add(var_name)
    adc_id = tracker.get_var_id(var_name, "ADC")
    pin_name = "pin"
    if call_node.args and isinstance(call_node.args[0], ast.Name):
        pin_name = call_node.args[0].id
    pin_id = tracker.get_var_id(pin_name, "Pin")
    tracker.pin_vars.add(pin_name)
    return {
        "type": "create_adc", "id": _uid(),
        "fields": {
            "pin_variable": {"id": pin_id, "name": pin_name, "type": "Pin"},
            "adc_variable": {"id": adc_id, "name": var_name, "type": "ADC"}
        }
    }


def _convert_read_adc(var_name, call_node):
    adc_name = ""
    if isinstance(call_node.func, ast.Attribute) and isinstance(call_node.func.value, ast.Name):
        adc_name = call_node.func.value.id
    tracker.adc_vars.add(adc_name)
    adc_id = tracker.get_var_id(adc_name, "ADC")
    var_id = tracker.get_var_id(var_name)
    return {
        "type": "read_adc", "id": _uid(),
        "fields": {
            "adc_variable": {"id": adc_id, "name": adc_name, "type": "ADC"},
        },
        "inputs": {
            "adc_value": {"block": {
                "type": "variables_get", "id": _uid(),
                "fields": {"VAR": {"id": var_id, "name": var_name, "type": ""}}
            }}
        }
    }


def _convert_read_micro_volt(var_name, call_node):
    adc_name = ""
    if isinstance(call_node.func, ast.Attribute) and isinstance(call_node.func.value, ast.Name):
        adc_name = call_node.func.value.id
    tracker.adc_vars.add(adc_name)
    adc_id = tracker.get_var_id(adc_name, "ADC")
    var_id = tracker.get_var_id(var_name)
    return {
        "type": "read_micro_volt", "id": _uid(),
        "fields": {
            "ADC": {"id": adc_id, "name": adc_name, "type": "ADC"},
            "Var": {"id": var_id, "name": var_name, "type": ""}
        }
    }


def _convert_create_pwm(var_name, call_node):
    tracker.pwm_vars.add(var_name)
    pwm_id = tracker.get_var_id(var_name, "PWM")
    pin_name = "pin"
    freq = 50
    duty = 8000
    if call_node.args and isinstance(call_node.args[0], ast.Name):
        pin_name = call_node.args[0].id
    pin_id = tracker.get_var_id(pin_name, "Pin")
    tracker.pin_vars.add(pin_name)
    for kw in call_node.keywords:
        if kw.arg == "freq" and isinstance(kw.value, ast.Constant):
            freq = kw.value.value
        elif kw.arg == "duty_u16" and isinstance(kw.value, ast.Constant):
            duty = kw.value.value
    return {
        "type": "create_pwm", "id": _uid(),
        "fields": {
            "PWM": {"id": pwm_id, "name": var_name, "type": "PWM"},
            "Pin": {"id": pin_id, "name": pin_name, "type": "Pin"},
            "frequency": freq, "duty": duty
        }
    }


def _convert_i2c_create(var_name, call_node):
    tracker.i2c_vars.add(var_name)
    i2c_id = tracker.get_var_id(var_name, "I2C")
    scl = "scl_pin"
    sda = "sda_pin"
    freq = 400000
    for kw in call_node.keywords:
        if kw.arg == "scl" and isinstance(kw.value, ast.Name):
            scl = kw.value.id
        elif kw.arg == "sda" and isinstance(kw.value, ast.Name):
            sda = kw.value.id
        elif kw.arg == "freq" and isinstance(kw.value, ast.Constant):
            freq = kw.value.value
    scl_id = tracker.get_var_id(scl, "Pin")
    sda_id = tracker.get_var_id(sda, "Pin")
    tracker.pin_vars.add(scl)
    tracker.pin_vars.add(sda)
    return {
        "type": "i2c", "id": _uid(),
        "fields": {
            "sclPin": {"id": scl_id, "name": scl, "type": "Pin"},
            "sdaPin": {"id": sda_id, "name": sda, "type": "Pin"},
            "frequency": freq,
            "i2c": {"id": i2c_id, "name": var_name, "type": "I2C"}
        }
    }


# --- Control flow ---

def convert_if(node):
    has_else = node.orelse and len(node.orelse) > 0

    # Check if orelse is an elif (single If node inside orelse)
    # For simplicity, treat elif as else with nested if
    if has_else:
        block_type = "if_else_block"
        block = {"type": block_type, "id": _uid(), "inputs": {}}
        cond = convert_expr(node.test)
        if cond:
            block["inputs"]["condition"] = {"block": cond}
        body = _convert_stmts_to_chain(node.body)
        if body:
            block["inputs"]["statement"] = {"block": body}
        else_body = _convert_stmts_to_chain(node.orelse)
        if else_body:
            block["inputs"]["else"] = {"block": else_body}
        return block
    else:
        block = {"type": "if_block", "id": _uid(), "inputs": {}}
        cond = convert_expr(node.test)
        if cond:
            block["inputs"]["condition"] = {"block": cond}
        body = _convert_stmts_to_chain(node.body)
        if body:
            block["inputs"]["statement"] = {"block": body}
        return block


def convert_while(node):
    block = {"type": "while_block", "id": _uid(), "inputs": {}}
    cond = convert_expr(node.test)
    if cond:
        block["inputs"]["condition"] = {"block": cond}
    body = _convert_stmts_to_chain(node.body)
    if body:
        block["inputs"]["statement"] = {"block": body}
    return block


def convert_for(node):
    block = {"type": "for_block", "id": _uid(), "inputs": {}, "fields": {}}
    if isinstance(node.target, ast.Name):
        var_id = tracker.get_var_id(node.target.id)
        block["fields"]["variable"] = {
            "id": var_id, "name": node.target.id, "type": ""
        }
    iterable = convert_expr(node.iter)
    if iterable:
        block["inputs"]["value"] = {"block": iterable}
    body = _convert_stmts_to_chain(node.body)
    if body:
        block["inputs"]["statement"] = {"block": body}
    return block


# --- Functions ---

def convert_funcdef(node):
    func_name = node.name
    args = [a.arg for a in node.args.args]

    # Check if function has a return statement
    has_return = _has_return(node.body)
    tracker.func_defs[func_name] = {"args": args, "has_return": has_return}

    # Register function name and arg variables
    func_var_id = tracker.get_var_id(func_name)
    for a in args:
        tracker.get_var_id(a)

    if has_return:
        block_type = "procedures_defreturn"
    else:
        block_type = "procedures_defnoreturn"

    block = {
        "type": block_type, "id": _uid(),
        "fields": {"NAME": func_name},
        "inputs": {}
    }

    # Convert function body (excluding the return statement if present)
    body_stmts = [s for s in node.body if not isinstance(s, ast.Return)]
    body = _convert_stmts_to_chain(body_stmts)
    if body:
        block["inputs"]["STACK"] = {"block": body}

    # Handle return value
    if has_return:
        ret_node = _find_return(node.body)
        if ret_node and ret_node.value:
            ret_val = convert_expr(ret_node.value)
            if ret_val:
                block["inputs"]["RETURN"] = {"block": ret_val}

    return block


def convert_return(node):
    """Convert a standalone return inside a function (if-guarded returns)."""
    return None  # Handled at function level


def _has_return(body):
    for stmt in body:
        if isinstance(stmt, ast.Return):
            return True
        if isinstance(stmt, ast.If):
            if _has_return(stmt.body) or _has_return(stmt.orelse):
                return True
    return False


def _find_return(body):
    for stmt in body:
        if isinstance(stmt, ast.Return):
            return stmt
    return None


# ---------------------------------------------------------------------------
# Statement chaining  (link blocks via "next")
# ---------------------------------------------------------------------------

def _convert_stmts_to_chain(stmts):
    """Convert a list of AST statements into a linked chain of Blockly blocks."""
    blocks = []
    for s in stmts:
        b = convert_stmt(s)
        if b:
            blocks.append(b)
    if not blocks:
        return None
    # Chain via "next"
    for i in range(len(blocks) - 1):
        blocks[i]["next"] = {"block": blocks[i + 1]}
    return blocks[0]


# ---------------------------------------------------------------------------
# Top-level entry
# ---------------------------------------------------------------------------

def python_to_blockly_json(code):
    """
    Parse Python code and return a Blockly workspace JSON string.

    Args:
        code: Python source code string

    Returns:
        JSON string of Blockly workspace, or JSON error object
    """
    global tracker
    tracker = VarTracker()

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return json.dumps({"error": f"SyntaxError: {e.msg} (line {e.lineno})"})

    # First pass: collect function definitions
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            args = [a.arg for a in node.args.args]
            has_ret = _has_return(node.body)
            tracker.func_defs[node.name] = {"args": args, "has_return": has_ret}

    # Second pass: convert statements
    top_blocks = []
    y_offset = 50
    for stmt in tree.body:
        block = convert_stmt(stmt)
        if block:
            top_blocks.append(block)

    # Assign x, y positions to top-level blocks & chain consecutive statements
    positioned = []
    chain_start = None
    chain_tail = None

    for b in top_blocks:
        btype = b.get("type", "")
        is_statement = btype not in (
            "variables_get", "number_block", "string_block",
            "true_block", "false_block"
        )

        if is_statement and chain_start is not None:
            # Continue the chain
            chain_tail["next"] = {"block": b}
            chain_tail = b
        else:
            # Start a new chain
            b["x"] = 50
            b["y"] = y_offset
            y_offset += 200
            positioned.append(b)
            if is_statement:
                chain_start = b
                chain_tail = b
            else:
                chain_start = None
                chain_tail = None

    workspace = {
        "blocks": {
            "languageVersion": 0,
            "blocks": positioned
        },
        "variables": tracker.get_variables_json()
    }

    return json.dumps(workspace)
