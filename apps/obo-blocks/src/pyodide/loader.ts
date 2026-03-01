/**
 * Pyodide Loader
 * Initialize and manage Python execution environment
 */

let worker: Worker | null = null;

function getTerminalElement(): HTMLTextAreaElement | null {
    if (typeof window !== 'undefined') {
        return document.getElementById('terminal-output') as HTMLTextAreaElement;
    }
    return null;
}

function appendToTerminal(text: string) {
    const terminal = getTerminalElement();
    if (terminal) {
        terminal.value += text + '\n';
        terminal.scrollTop = terminal.scrollHeight;
    }
}

function startWorker() {
    worker = new Worker(new URL('../../public/worker.js', import.meta.url), {
        type: 'module'
    })
    
    worker.onerror = function (event: ErrorEvent) {
        console.error("Worker error:", event.message);
        appendToTerminal("Error: " + event.message);
    };

    worker.onmessage = function (event: MessageEvent) {
        console.log("Worker message received:", event.data);
        const responce = event.data.responce
        if (responce === 'result') {
            console.log("Result:", event.data.result);
            appendToTerminal(event.data.result || "");
        } else if (responce === 'request') {
            const input = prompt('Enter the input');
            if (worker && input) {
                worker.postMessage({ command: 'input', code: input });
            }
        }
        else if (responce === 'error') {
            console.log("Error:", event.data.error);
            appendToTerminal("Error: " + (event.data.error || event.data));
        }
        else {
            console.log("Unknown response:", event.data)
        }
    };
}

export function stopWorker(): void {
    if (confirm('Do you want to stop the code ?')) {
        if (worker) {
            worker.terminate();
        }
        const terminal = getTerminalElement();
        if (terminal) {
            terminal.value = 'Python 3.10 \n>>> ';
        }
        startWorker();
    }
}

export function getWorker(): Worker | null {
    if (!worker && typeof window !== 'undefined') {
        startWorker();
    }
    return worker;
}

export function getTerminal(): HTMLTextAreaElement | null {
    return getTerminalElement();}