/**
 * Python-to-Blocks Converter
 * ==========================
 * Runs the Python AST parser (parser.py) inside the existing Pyodide worker
 * to convert Python source code into a Blockly workspace JSON string.
 *
 * Usage:
 *   import { convertPythonToBlocks } from "@/python-to-blocks";
 *   const json = await convertPythonToBlocks(pythonCode);
 */

// The Python parser source is embedded as a string so we can run it in Pyodide
// without needing file-system access in the worker.
const PARSER_SOURCE = `
import ast
import json
import uuid

def _uid():
    return str(uuid.uuid4())[:8]

class VarTracker:
    def __init__(self):
        self.vars = {}
        self.pin_vars = set()
        self.adc_vars = set()
        self.pwm_vars = set()
        self.i2c_vars = set()
        self.func_defs = {}

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
            result.append({"name": name, "id": info["id"], "type": info["type"]})
        return result

tracker = VarTracker()

def convert_expr(node):
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
        if node.values:
            return convert_expr(node.values[0])
        return None
    elif isinstance(node, ast.UnaryOp):
        if isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant):
            return {"type": "number_block", "id": _uid(), "fields": {"input": -node.operand.value}}
        return convert_expr(node.operand)
    elif isinstance(node, ast.Call):
        return convert_call_expr(node)
    elif isinstance(node, ast.List):
        parts = []
        for elt in node.elts:
            if isinstance(elt, ast.Constant):
                parts.append(str(elt.value))
            elif isinstance(elt, ast.Name):
                parts.append(elt.id)
            else:
                parts.append("?")
        return {"type": "list_block", "id": _uid(), "fields": {"input": ",".join(parts)}}
    elif isinstance(node, ast.Subscript):
        return convert_subscript(node)
    elif isinstance(node, ast.IfExp):
        if (isinstance(node.orelse, ast.Constant) and node.orelse.value == 0
                and isinstance(node.test, ast.Compare) and isinstance(node.body, ast.BinOp)):
            if isinstance(node.body.op, ast.Div):
                return _make_binary("division_block", node.body.left, node.body.right)
            elif isinstance(node.body.op, ast.Mod):
                return _make_binary("modulo_block", node.body.left, node.body.right)
        return convert_expr(node.body)
    return None

def convert_constant(node):
    val = node.value
    if val is True:
        return {"type": "true_block", "id": _uid()}
    elif val is False:
        return {"type": "false_block", "id": _uid()}
    elif isinstance(val, (int, float)):
        return {"type": "number_block", "id": _uid(), "fields": {"input": val}}
    elif isinstance(val, str):
        return {"type": "string_block", "id": _uid(), "fields": {"input": val}}
    return None

def convert_name(node):
    var_id = tracker.get_var_id(node.id)
    return {"type": "variables_get", "id": _uid(),
            "fields": {"VAR": {"id": var_id, "name": node.id, "type": ""}}}

def _binop_type(op):
    m = {ast.Add: "add_block", ast.Sub: "subtract_block", ast.Mult: "multiply_block", ast.Pow: "power_block"}
    return m.get(type(op))

def convert_binop(node):
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
    m = {ast.Eq: "equal_block", ast.NotEq: "not_equal_block", ast.Gt: "greater_than_block",
         ast.Lt: "less_than_block", ast.GtE: "greater_than_equal_block", ast.LtE: "less_than_equal_block"}
    block_type = m.get(type(node.ops[0]))
    if block_type:
        return _make_binary(block_type, node.left, node.comparators[0])
    return None

def convert_call_expr(node):
    func_name = _get_func_name(node)
    if func_name == "input":
        prompt = ""
        if node.args and isinstance(node.args[0], ast.Constant):
            prompt = node.args[0].value
        return {"type": "input_block", "id": _uid(), "fields": {"input": prompt}}
    if func_name == "range":
        block = {"type": "range_block", "id": _uid(), "inputs": {}}
        args = node.args
        if len(args) == 1:
            e = convert_expr(args[0])
            if e: block["inputs"]["end"] = {"block": e}
        elif len(args) == 2:
            s = convert_expr(args[0])
            e = convert_expr(args[1])
            if s: block["inputs"]["start"] = {"block": s}
            if e: block["inputs"]["end"] = {"block": e}
        elif len(args) >= 3:
            s = convert_expr(args[0])
            e = convert_expr(args[1])
            st = convert_expr(args[2])
            if s: block["inputs"]["start"] = {"block": s}
            if e: block["inputs"]["end"] = {"block": e}
            if st: block["inputs"]["step"] = {"block": st}
        return block
    if func_name == "str":
        if node.args and isinstance(node.args[0], ast.Constant):
            return {"type": "int_str_conv_block", "id": _uid(), "fields": {"number": node.args[0].value}}
        return None
    if func_name and func_name in tracker.func_defs:
        info = tracker.func_defs[func_name]
        if info.get("has_return"):
            var_id = tracker.get_var_id(func_name)
            block = {"type": "procedures_callreturn", "id": _uid(),
                     "fields": {"NAME": {"id": var_id, "name": func_name, "type": ""}}, "inputs": {}}
            for i, a in enumerate(node.args):
                ab = convert_expr(a)
                if ab: block["inputs"]["ARG" + str(i)] = {"block": ab}
            return block
    return None

def convert_subscript(node):
    sl = node.slice
    if isinstance(sl, ast.Constant) and isinstance(sl.value, int):
        block = {"type": "list_index_get_block", "id": _uid(), "fields": {"index": sl.value}, "inputs": {}}
        v = convert_expr(node.value)
        if v: block["inputs"]["input"] = {"block": v}
        return block
    return None

def _get_func_name(node):
    if isinstance(node.func, ast.Name):
        return node.func.id
    elif isinstance(node.func, ast.Attribute):
        if isinstance(node.func.value, ast.Name):
            return node.func.value.id + "." + node.func.attr
        elif isinstance(node.func.value, ast.Attribute):
            inner = node.func.value
            if isinstance(inner.value, ast.Name):
                return inner.value.id + "." + inner.attr + "." + node.func.attr
    return None

def convert_stmt(node):
    if isinstance(node, ast.Expr):
        call = node.value
        if isinstance(call, ast.Call):
            return convert_call_stmt(call)
        return None
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
    elif isinstance(node, (ast.Import, ast.ImportFrom)):
        return None
    return None

def convert_call_stmt(node):
    func_name = _get_func_name(node)
    if func_name == "print":
        block = {"type": "print_block", "id": _uid(), "inputs": {}}
        if node.args:
            v = convert_expr(node.args[0])
            if v: block["inputs"]["value"] = {"block": v}
        return block
    if func_name == "time.sleep":
        val = 0
        if node.args and isinstance(node.args[0], ast.Constant):
            val = node.args[0].value
        return {"type": "time_sleep", "id": _uid(), "fields": {"time": val}}
    if isinstance(node.func, ast.Attribute):
        var_node = node.func.value
        method = node.func.attr
        if isinstance(var_node, ast.Name):
            vn = var_node.id
            if method in ("On", "Off"):
                tracker.pin_vars.add(vn)
                vi = tracker.get_var_id(vn, "Pin")
                return {"type": "pin_state", "id": _uid(),
                        "fields": {"pin_variable": {"id": vi, "name": vn, "type": "Pin"}, "pin_states": method}}
            if method == "value" and len(node.args) == 1:
                tracker.pin_vars.add(vn)
                vi = tracker.get_var_id(vn, "Pin")
                val = "0"
                if isinstance(node.args[0], ast.Constant): val = str(node.args[0].value)
                return {"type": "pin_value", "id": _uid(),
                        "fields": {"pin_variable": {"id": vi, "name": vn, "type": "Pin"}, "pin_values": val}}
            if method == "duty_u16" and len(node.args) == 1:
                tracker.pwm_vars.add(vn)
                vi = tracker.get_var_id(vn, "PWM")
                val = 32768
                if isinstance(node.args[0], ast.Constant): val = node.args[0].value
                return {"type": "set_pwm_duty", "id": _uid(),
                        "fields": {"PWM": {"id": vi, "name": vn, "type": "PWM"}, "duty_cycle": val}}
            if method == "init":
                tracker.pwm_vars.add(vn)
                vi = tracker.get_var_id(vn, "PWM")
                freq, duty = 50, 8000
                for kw in node.keywords:
                    if kw.arg == "freq" and isinstance(kw.value, ast.Constant): freq = kw.value.value
                    elif kw.arg == "duty_ns" and isinstance(kw.value, ast.Constant): duty = kw.value.value
                return {"type": "init_pwm", "id": _uid(),
                        "fields": {"PWM": {"id": vi, "name": vn, "type": "PWM"}, "frequency": freq, "duty": duty}}
            if method == "deinit":
                tracker.pwm_vars.add(vn)
                vi = tracker.get_var_id(vn, "PWM")
                return {"type": "deinitilize_pwm", "id": _uid(),
                        "fields": {"PWM": {"id": vi, "name": vn, "type": "PWM"}}}
            if method == "duty_ns" and len(node.args) == 1:
                tracker.pwm_vars.add(vn)
                vi = tracker.get_var_id(vn, "PWM")
                val = 5000
                if isinstance(node.args[0], ast.Constant): val = node.args[0].value
                return {"type": "set_duty_ns", "id": _uid(),
                        "fields": {"PWM": {"id": vi, "name": vn, "type": "PWM"}, "duty_ns": val}}
            if method == "freq" and len(node.args) == 1:
                tracker.pwm_vars.add(vn)
                vi = tracker.get_var_id(vn, "PWM")
                val = 50
                if isinstance(node.args[0], ast.Constant): val = node.args[0].value
                return {"type": "set_frequency", "id": _uid(),
                        "fields": {"PWM": {"id": vi, "name": vn, "type": "PWM"}, "frequency": val}}
            if method == "deint":
                tracker.i2c_vars.add(vn)
                vi = tracker.get_var_id(vn, "I2C")
                return {"type": "deint_i2c", "id": _uid(),
                        "fields": {"i2c": {"id": vi, "name": vn, "type": "I2C"}}}
            if method == "scan":
                tracker.i2c_vars.add(vn)
                vi = tracker.get_var_id(vn, "I2C")
                return {"type": "i2c_scan", "id": _uid(),
                        "fields": {"I2C": {"id": vi, "name": vn, "type": "I2C"}}}
            if method == "append" and len(node.args) == 1:
                vi = tracker.get_var_id(vn)
                block = {"type": "list_append_block", "id": _uid(),
                         "inputs": {"list": {"block": {"type": "variables_get", "id": _uid(),
                                   "fields": {"VAR": {"id": vi, "name": vn, "type": ""}}}}}}
                v = convert_expr(node.args[0])
                if v: block["inputs"]["value"] = {"block": v}
                return block
            if method == "remove" and len(node.args) == 1:
                vi = tracker.get_var_id(vn)
                block = {"type": "list_remove_block", "id": _uid(),
                         "inputs": {"list": {"block": {"type": "variables_get", "id": _uid(),
                                   "fields": {"VAR": {"id": vi, "name": vn, "type": ""}}}}}}
                v = convert_expr(node.args[0])
                if v: block["inputs"]["value"] = {"block": v}
                return block
    if func_name and func_name in tracker.func_defs:
        vi = tracker.get_var_id(func_name)
        block = {"type": "procedures_callnoreturn", "id": _uid(),
                 "fields": {"NAME": {"id": vi, "name": func_name, "type": ""}}, "inputs": {}}
        for i, a in enumerate(node.args):
            ab = convert_expr(a)
            if ab: block["inputs"]["ARG" + str(i)] = {"block": ab}
        return block
    if isinstance(node.func, ast.Name):
        fn = node.func.id
        if fn not in ("print", "input", "range", "str", "int", "float"):
            vi = tracker.get_var_id(fn)
            block = {"type": "procedures_callnoreturn", "id": _uid(),
                     "fields": {"NAME": {"id": vi, "name": fn, "type": ""}}, "inputs": {}}
            for i, a in enumerate(node.args):
                ab = convert_expr(a)
                if ab: block["inputs"]["ARG" + str(i)] = {"block": ab}
            return block
    return None

def convert_assign(node):
    if len(node.targets) != 1:
        return None
    target = node.targets[0]
    value = node.value
    if isinstance(target, ast.Subscript):
        idx = 0
        sl = target.slice
        if isinstance(sl, ast.Constant): idx = sl.value
        val_str = ""
        if isinstance(value, ast.Constant): val_str = str(value.value)
        block = {"type": "list_index_set_block", "id": _uid(), "fields": {"index": idx, "value": val_str}, "inputs": {}}
        le = convert_expr(target.value)
        if le: block["inputs"]["input"] = {"block": le}
        return block
    if not isinstance(target, ast.Name):
        return None
    vn = target.id
    if isinstance(value, ast.Call):
        func = _get_func_name(value)
        if func == "machine.Pin":
            tracker.pin_vars.add(vn)
            vi = tracker.get_var_id(vn, "Pin")
            pn, pm = 0, "OUT"
            if value.args and isinstance(value.args[0], ast.Constant): pn = value.args[0].value
            if len(value.args) >= 2 and isinstance(value.args[1], ast.Attribute): pm = value.args[1].attr
            return {"type": "pin_mode", "id": _uid(),
                    "fields": {"pin_number": pn, "pinVariable": {"id": vi, "name": vn, "type": "Pin"}, "pinMode": pm}}
        if func == "machine.ADC":
            tracker.adc_vars.add(vn)
            ai = tracker.get_var_id(vn, "ADC")
            pin_name = "pin"
            if value.args and isinstance(value.args[0], ast.Name): pin_name = value.args[0].id
            pi = tracker.get_var_id(pin_name, "Pin")
            tracker.pin_vars.add(pin_name)
            return {"type": "create_adc", "id": _uid(),
                    "fields": {"pin_variable": {"id": pi, "name": pin_name, "type": "Pin"},
                               "adc_variable": {"id": ai, "name": vn, "type": "ADC"}}}
        if func == "machine.PWM":
            tracker.pwm_vars.add(vn)
            wi = tracker.get_var_id(vn, "PWM")
            pin_name = "pin"
            freq, duty = 50, 8000
            if value.args and isinstance(value.args[0], ast.Name): pin_name = value.args[0].id
            pi = tracker.get_var_id(pin_name, "Pin")
            tracker.pin_vars.add(pin_name)
            for kw in value.keywords:
                if kw.arg == "freq" and isinstance(kw.value, ast.Constant): freq = kw.value.value
                elif kw.arg == "duty_u16" and isinstance(kw.value, ast.Constant): duty = kw.value.value
            return {"type": "create_pwm", "id": _uid(),
                    "fields": {"PWM": {"id": wi, "name": vn, "type": "PWM"},
                               "Pin": {"id": pi, "name": pin_name, "type": "Pin"},
                               "frequency": freq, "duty": duty}}
        if func == "machine.I2C":
            tracker.i2c_vars.add(vn)
            ii = tracker.get_var_id(vn, "I2C")
            scl, sda, freq = "scl_pin", "sda_pin", 400000
            for kw in value.keywords:
                if kw.arg == "scl" and isinstance(kw.value, ast.Name): scl = kw.value.id
                elif kw.arg == "sda" and isinstance(kw.value, ast.Name): sda = kw.value.id
                elif kw.arg == "freq" and isinstance(kw.value, ast.Constant): freq = kw.value.value
            si = tracker.get_var_id(scl, "Pin")
            di = tracker.get_var_id(sda, "Pin")
            tracker.pin_vars.add(scl)
            tracker.pin_vars.add(sda)
            return {"type": "i2c", "id": _uid(),
                    "fields": {"sclPin": {"id": si, "name": scl, "type": "Pin"},
                               "sdaPin": {"id": di, "name": sda, "type": "Pin"},
                               "frequency": freq, "i2c": {"id": ii, "name": vn, "type": "I2C"}}}
        if isinstance(value.func, ast.Attribute):
            attr = value.func.attr
            if attr == "read_u16" and isinstance(value.func.value, ast.Name):
                an = value.func.value.id
                tracker.adc_vars.add(an)
                ai = tracker.get_var_id(an, "ADC")
                vi = tracker.get_var_id(vn)
                return {"type": "read_adc", "id": _uid(),
                        "fields": {"adc_variable": {"id": ai, "name": an, "type": "ADC"}},
                        "inputs": {"adc_value": {"block": {"type": "variables_get", "id": _uid(),
                                   "fields": {"VAR": {"id": vi, "name": vn, "type": ""}}}}}}
            if attr == "read_uv" and isinstance(value.func.value, ast.Name):
                an = value.func.value.id
                tracker.adc_vars.add(an)
                ai = tracker.get_var_id(an, "ADC")
                vi = tracker.get_var_id(vn)
                return {"type": "read_micro_volt", "id": _uid(),
                        "fields": {"ADC": {"id": ai, "name": an, "type": "ADC"},
                                   "Var": {"id": vi, "name": vn, "type": ""}}}
    vi = tracker.get_var_id(vn)
    block = {"type": "variables_set", "id": _uid(),
             "fields": {"VAR": {"id": vi, "name": vn, "type": ""}}, "inputs": {}}
    v = convert_expr(value)
    if v: block["inputs"]["VALUE"] = {"block": v}
    return block

def convert_if(node):
    has_else = node.orelse and len(node.orelse) > 0
    if has_else:
        block = {"type": "if_else_block", "id": _uid(), "inputs": {}}
        c = convert_expr(node.test)
        if c: block["inputs"]["condition"] = {"block": c}
        b = _chain(node.body)
        if b: block["inputs"]["statement"] = {"block": b}
        e = _chain(node.orelse)
        if e: block["inputs"]["else"] = {"block": e}
        return block
    else:
        block = {"type": "if_block", "id": _uid(), "inputs": {}}
        c = convert_expr(node.test)
        if c: block["inputs"]["condition"] = {"block": c}
        b = _chain(node.body)
        if b: block["inputs"]["statement"] = {"block": b}
        return block

def convert_while(node):
    block = {"type": "while_block", "id": _uid(), "inputs": {}}
    c = convert_expr(node.test)
    if c: block["inputs"]["condition"] = {"block": c}
    b = _chain(node.body)
    if b: block["inputs"]["statement"] = {"block": b}
    return block

def convert_for(node):
    block = {"type": "for_block", "id": _uid(), "inputs": {}, "fields": {}}
    if isinstance(node.target, ast.Name):
        vi = tracker.get_var_id(node.target.id)
        block["fields"]["variable"] = {"id": vi, "name": node.target.id, "type": ""}
    it = convert_expr(node.iter)
    if it: block["inputs"]["value"] = {"block": it}
    b = _chain(node.body)
    if b: block["inputs"]["statement"] = {"block": b}
    return block

def _has_return(body):
    for s in body:
        if isinstance(s, ast.Return): return True
        if isinstance(s, ast.If):
            if _has_return(s.body) or _has_return(s.orelse): return True
    return False

def _find_return(body):
    for s in body:
        if isinstance(s, ast.Return): return s
    return None

def convert_funcdef(node):
    fn = node.name
    args = [a.arg for a in node.args.args]
    has_ret = _has_return(node.body)
    tracker.func_defs[fn] = {"args": args, "has_return": has_ret}
    tracker.get_var_id(fn)
    for a in args: tracker.get_var_id(a)
    bt = "procedures_defreturn" if has_ret else "procedures_defnoreturn"
    block = {"type": bt, "id": _uid(), "fields": {"NAME": fn}, "inputs": {}}
    body_stmts = [s for s in node.body if not isinstance(s, ast.Return)]
    b = _chain(body_stmts)
    if b: block["inputs"]["STACK"] = {"block": b}
    if has_ret:
        rn = _find_return(node.body)
        if rn and rn.value:
            rv = convert_expr(rn.value)
            if rv: block["inputs"]["RETURN"] = {"block": rv}
    return block

def _chain(stmts):
    blocks = []
    for s in stmts:
        b = convert_stmt(s)
        if b: blocks.append(b)
    if not blocks: return None
    for i in range(len(blocks) - 1):
        blocks[i]["next"] = {"block": blocks[i + 1]}
    return blocks[0]

def python_to_blockly_json(code):
    global tracker
    tracker = VarTracker()
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return json.dumps({"error": f"SyntaxError: {e.msg} (line {e.lineno})"})
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            args = [a.arg for a in node.args.args]
            tracker.func_defs[node.name] = {"args": args, "has_return": _has_return(node.body)}
    top_blocks = []
    for stmt in tree.body:
        block = convert_stmt(stmt)
        if block: top_blocks.append(block)
    positioned = []
    chain_start = None
    chain_tail = None
    y_offset = 50
    for b in top_blocks:
        btype = b.get("type", "")
        is_stmt = btype not in ("variables_get", "number_block", "string_block", "true_block", "false_block")
        if is_stmt and chain_start is not None:
            chain_tail["next"] = {"block": b}
            chain_tail = b
        else:
            b["x"] = 50
            b["y"] = y_offset
            y_offset += 200
            positioned.append(b)
            if is_stmt:
                chain_start = b
                chain_tail = b
            else:
                chain_start = None
                chain_tail = None
    workspace = {"blocks": {"languageVersion": 0, "blocks": positioned}, "variables": tracker.get_variables_json()}
    return json.dumps(workspace)
`;

/**
 * Convert Python code to Blockly workspace JSON using Pyodide.
 *
 * Creates a dedicated worker, loads Pyodide, runs the AST parser,
 * and returns the resulting JSON string.
 */
export function convertPythonToBlocks(pythonCode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Safely encode the user code as a JSON string so it survives any
    // special characters (quotes, backslashes, newlines, etc.)
    const jsonEncoded = JSON.stringify(pythonCode);

    const runScript = `
${PARSER_SOURCE}

_user_code = json.loads(${JSON.stringify(jsonEncoded)})
_result = python_to_blockly_json(_user_code)
_result
`;

    // Use a temporary inline worker so we don't interfere with the main code runner
    const workerBlob = new Blob(
      [
        `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

let pyodide = null;

async function init() {
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/' });
}

self.onmessage = async function(event) {
  try {
    if (!pyodide) await init();
    const result = pyodide.runPython(event.data.script);
    self.postMessage({ success: true, result: result });
  } catch (err) {
    self.postMessage({ success: false, error: err.message || String(err) });
  }
};
`,
      ],
      { type: "application/javascript" }
    );

    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);

    const timeout = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error("Python-to-blocks conversion timed out (30s)"));
    }, 30000);

    worker.onmessage = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      if (event.data.success) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error));
      }
    };

    worker.onerror = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error(event.message));
    };

    worker.postMessage({ script: runScript });
  });
}
