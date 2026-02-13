# @nexus-tools/esp32-uploader

A shared package for ESP32 code uploading functionality. This package provides components and utilities for uploading Python/MicroPython code to ESP32 devices via the Web Serial API.

## Features

- **ESP32 Device Support**: Multiple ESP32 variants (ESP32, ESP32-S2, ESP32-S3, ESP32-C3, ESP32-C6)  
- **Web Serial API Integration**: Browser-based USB connection to ESP32 devices
- **MicroPython Upload**: Direct file upload to ESP32 internal filesystem
- **Persistent Connections**: Reuse connections between uploads for faster workflow
- **React Components**: Ready-to-use sidebar and modal components

## Usage

### Components

```tsx
import { ESP32Uploader, ESP32UploaderSidebar } from "@nexus-tools/esp32-uploader";

// Basic uploader component
<ESP32Uploader 
  code={pythonCode}
  onStatusUpdate={(status) => console.log(status)}
  onError={(error) => console.error(error)}
/>
```

### Hooks

```tsx
import { useESP32Uploader } from "@nexus-tools/esp32-uploader";

const { uploadCode, connectToDevice, isConnected } = useESP32Uploader({
  code: myPythonCode,
  onStatusUpdate: (status) => setStatus(status),
  onError: (error) => setError(error),
});
```

### Styles

Import the styles in your CSS:

```css
@import '@nexus-tools/esp32-uploader/styles';
```

## Requirements

- Chrome 89+ or Edge 89+ (for Web Serial API support)
- HTTPS connection or localhost development environment
- ESP32 device with MicroPython firmware

## File Upload Process

1. Code is converted to MicroPython format (currently pass-through)
2. Connection established to ESP32 via Web Serial API  
3. File written as `main.py` to ESP32 internal filesystem
4. ESP32 soft-reset to automatically run the uploaded code

## Supported ESP32 Devices

- ESP32 Dev Module (115200 baud)
- ESP32-S2 (115200 baud)  
- ESP32-S3 (115200 baud)
- ESP32-C3 (115200 baud)
- ESP32-C6 (115200 baud)