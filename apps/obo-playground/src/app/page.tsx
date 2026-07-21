"use client";

import { SharedCodePanel } from "@nexus-tools/ui";
import { useCallback, useState } from "react";

import { ConsolePanel } from "@/components/console-panel";
import { useObocarRunner } from "@/hooks/use-obocar-runner";

const DEFAULT_CODE = `from obocar import OboCar

car = OboCar()

for i in range(3):
    car.forward(speed=100)
    car.sleep(5)
    car.right(speed=100)
    car.sleep(5)
    print(car.sensor("front"))

print(car.status())
`;

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);

  const { runCode, stopCode, isRunning, output, clearOutput } = useObocarRunner({
    workerUrl: "/worker.js",
    onError: (error: string) => console.error("OboCar execution error:", error),
  });

  const handleRun = useCallback(() => {
    if (!code.trim() || isRunning) return;
    runCode(code);
  }, [code, isRunning, runCode]);

  return (
    <main className="obo-playground-container">
      <div className="obo-playground-panel">
        <SharedCodePanel
          code={code}
          isEditing
          onCodeChange={setCode}
          onRun={handleRun}
          showEditButton={false}
          showRunInESP32Button={false}
          showSaveDeviceButton={false}
          className="code-panel"
        />
      </div>
      <div className="obo-playground-panel">
        <ConsolePanel output={output} isRunning={isRunning} onClear={clearOutput} onStop={stopCode} />
      </div>
    </main>
  );
}
