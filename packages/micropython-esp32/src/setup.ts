import { PythonGenerator } from "blockly/python";

import * as Blockly from "blockly/core";

class MicropythonGenerator extends PythonGenerator {
  constructor() {
    super();
    this.addReservedWords("time");
    this.addReservedWords("Pin");
  }

  init(workspace: any) {
    if (!this.definitions_) {
      this.definitions_ = {};
    }
    if (!this.nameDB_) {
      this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
    } else {
      this.nameDB_.reset();
    }

    this.nameDB_.setVariableMap(workspace.getVariableMap());
    this.nameDB_.populateVariables(workspace);
    this.nameDB_.populateProcedures(workspace);
  }

  finish(code: string) {
    if(code == "") return "";
    console.log("this is from generator class")
    console.log(code)
    const imports: any[] = [];
    for (const name in this.definitions_) {
      imports.push((this.definitions_ as any)[name]);
    }
    return imports.join("\n") + "\n" + code;
  }
}

export const pythonGenerator = new MicropythonGenerator();
