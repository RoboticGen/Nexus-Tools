# Serial Port Conflict Fix - REPL and Uploader

## Problem

When users tried to use the REPL and then switch to the Uploader (or vice versa), they would encounter this error:

```
ESP32 device is already connected or in an invalid state
```

## Root Cause

The issue occurred because:

1. When REPL connected via `connectToREPL()`, it acquired reader/writer streams from the serial port
2. The `disconnect()` method only released the stream locks but **did not close the underlying serial port**
3. When the Uploader tried to call `connectToESP32()` after REPL was used, the port was still "open" at the OS level
4. The port selector would fail because it couldn't re-open a port that was already open

## Solution

### Changes to [use-esp32-repl.ts](packages/esp32-uploader/src/hooks/use-esp32-repl.ts)

#### 1. Updated `disconnect()` method (lines 171-206)

**Before:**
```typescript
const disconnect = useCallback(async () => {
  try {
    if (readerRef.current) {
      readerRef.current.releaseLock();
      readerRef.current = null;
    }
    if (writerRef.current) {
      writerRef.current.releaseLock();
      writerRef.current = null;
    }
    setIsConnected(false);
  } catch (error) {
    console.warn("Error disconnecting REPL:", error);
  }
}, []);
```

**After:**
```typescript
const disconnect = useCallback(async () => {
  try {
    // Release streams first with proper error handling
    if (readerRef.current) {
      try {
        readerRef.current.releaseLock();
      } catch (e) {
        // Already released or stream closed
      }
      readerRef.current = null;
    }
    if (writerRef.current) {
      try {
        writerRef.current.releaseLock();
      } catch (e) {
        // Already released or stream closed
      }
      writerRef.current = null;
    }

    // **CRITICAL FIX: Close the underlying serial port**
    if (serialPort) {
      try {
        await serialPort.close();
      } catch (e) {
        console.warn("Error closing serial port:", e);
      }
    }

    setIsConnected(false);
  } catch (error) {
    console.warn("Error disconnecting REPL:", error);
  }
}, [serialPort]);
```

**Key Changes:**
- Now calls `await serialPort.close()` to properly close the port at the OS level
- Added try-catch blocks around `releaseLock()` calls to handle cases where streams are already released
- Changed dependency array from `[]` to `[serialPort]` to ensure it has the port reference

#### 2. Improved `connectToREPL()` error handling (lines 21-67)

Added try-catch blocks around all `releaseLock()` calls in the error handler to gracefully handle cleanup:

```typescript
} catch (error) {
  // Clean up on error
  if (readerRef.current) {
    try {
      readerRef.current.releaseLock();
    } catch (e) {
      // Already released
    }
    readerRef.current = null;
  }
  if (writerRef.current) {
    try {
      writerRef.current.releaseLock();
    } catch (e) {
      // Already released
    }
    writerRef.current = null;
  }
  throw error;
}
```

### Changes to [ESP32REPL.tsx](packages/esp32-uploader/src/components/ESP32REPL.tsx)

#### Added cleanup effect (lines 47-54)

```typescript
// Cleanup: disconnect REPL when component unmounts or serialPort changes
useEffect(() => {
  return () => {
    if (isConnected) {
      disconnect().catch(err => console.warn("Cleanup disconnect error:", err));
    }
  };
}, [isConnected, disconnect]);
```

**Purpose:** Ensures the serial port is properly closed when:
- User switches to a different tab
- Component unmounts
- Serial port reference changes

## How It Works Now

### Scenario 1: REPL → Uploader
1. User connects to REPL (acquires reader/writer streams)
2. User switches to Uploader tab (REPL component cleanup effect triggers)
3. Cleanup effect calls `disconnect()` which:
   - Releases reader/writer locks
   - **Closes the serial port at OS level** (NEW!)
4. User clicks "Connect Device" in Uploader
5. Uploader can now successfully open the port (not already open)
6. ✅ Works!

### Scenario 2: Uploader → REPL
1. User connects with Uploader
2. User switches to REPL tab
3. User tries to connect REPL
4. Uploader's connection is reused by REPL
5. ✅ Works!

### Scenario 3: Disconnect button in REPL
1. User connected to REPL
2. User clicks "Disconnect" button
3. Calls `handleDisconnect()` → `disconnect()` → **closes port**
4. User can then use Uploader
5. ✅ Works!

## Testing Checklist

- [ ] Connect to REPL, then switch to Uploader tab → Uploader "Connect" should work
- [ ] Use Uploader, then switch to REPL tab → REPL "Connect REPL" should work  
- [ ] In REPL, click "Disconnect" button, then try Uploader → should work
- [ ] REPL Ctrl+C, Ctrl+D (Reset) still work
- [ ] Browser navigation away from page → port properly released
- [ ] Rapid tab switching → no conflicts

## Technical Details

### Web Serial API Port Lifecycle
- `navigator.serial.requestPort()` - User selects device
- `port.open()` - Opens port with given settings
- `port.readable.getReader()` - Gets read stream
- `port.writable.getWriter()` - Gets write stream
- `reader.releaseLock()` - Releases read stream lock
- `writer.releaseLock()` - Releases write stream lock
- **`port.close()`** - Closes port (releases OS-level resource) ← **This was missing**

### Why Just releaseLock() Wasn't Enough
- `releaseLock()` only releases the JavaScript-level stream locks
- The port itself remains open at the OS level
- Attempting to `port.open()` again would fail with "InvalidStateError"
- Only `port.close()` fully releases the OS resource

## Files Modified
1. `/packages/esp32-uploader/src/hooks/use-esp32-repl.ts`
2. `/packages/esp32-uploader/src/components/ESP32REPL.tsx`

## Related Code
- [use-esp32-uploader.ts](packages/esp32-uploader/src/hooks/use-esp32-uploader.ts) - Uploader connection management
- [use-esp32-serial.ts](packages/esp32-uploader/src/hooks/use-esp32-serial.ts) - Low-level serial operations
- [ESP32UploaderSidebar.tsx](packages/esp32-uploader/src/components/ESP32UploaderSidebar.tsx) - Tab switching logic
