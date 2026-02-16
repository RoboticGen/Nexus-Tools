/**
 * ESP32 File System Manager
 * Handles file operations in MicroPython REPL mode (based on Viper IDE implementation)
 */
import { WebSerialPortAdapter } from './web-serial-adapter';

export interface FileSystemNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  content?: FileSystemNode[];
}

export interface DeviceInfo {
  machine: string;
  release: string;
  sysname: string;
  version: string;
  mpy_arch: string | null;
  mpy_ver: string | number;
  mpy_sub: number;
  sys_path: string[];
}

export interface FileSystemStats {
  used: number;
  free: number;
  total: number;
}

export class FileSystemManager {
  private port: WebSerialPortAdapter;
  private endFn: (() => Promise<void>) | null = null;

  constructor(serialPort: any) {
    this.port = new WebSerialPortAdapter(serialPort);
  }

  /**
   * Initialize file system manager with port in raw REPL mode
   */
  static async begin(port: any, soft_reboot = false): Promise<FileSystemManager> {
    const manager = new FileSystemManager(port);
    
    try {
      // Wait for port to be available if it's currently locked
      await manager.port.waitForAvailable();
      
      await manager.enterRawRepl(soft_reboot);
      await manager.exec(`import sys,os`);
    } catch (err) {
      await manager.end();
      throw err;
    }
    return manager;
  }

  /**
   * Force begin - attempts cleanup and retry if initial connection fails
   */
  static async forceBegin(port: any, soft_reboot = false): Promise<FileSystemManager> {
    try {
      return await FileSystemManager.begin(port, soft_reboot);
    } catch (error) {
      console.log('Initial connection failed, attempting force cleanup...');
      
      const manager = new FileSystemManager(port);
      await manager.port.forceCleanup();
      
      // Wait a bit after cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try again
      try {
        await manager.enterRawRepl(soft_reboot);
        await manager.exec(`import sys,os`);
        return manager;
      } catch (retryErr) {
        await manager.end();
        throw retryErr;
      }
    }
  }

  /**
   * Interrupt any running program on the device
   */
  async interruptProgram(timeout = 20000): Promise<void> {
    const endTime = Date.now() + timeout;
    while (timeout <= 0 || Date.now() < endTime) {
      await this.port.write('\x03'); // Ctrl-C: interrupt
      try {
        const banner = await this.port.readUntil('>>> ', 500);
        if (this.port.prevRecvCbk && banner !== '\r\n>>> ') {
          this.port.prevRecvCbk(banner);
        }
        await this.port.flushInput();
        return;
      } catch (err) {
        // Continue trying
      }
    }
    throw new Error('Board is not responding');
  }

  /**
   * Enter raw REPL mode on the device
   */
  async enterRawRepl(soft_reboot = false): Promise<void> {
    const release = await this.port.startTransaction();
    try {
      await this.interruptProgram();
      await this.port.write('\r\x01'); // Ctrl-A: enter raw REPL
      await this.port.readUntil('raw REPL; CTRL-B to exit\r\n');

      if (soft_reboot) {
        await this.port.write('\x04\x03'); // soft reboot
        await this.port.readUntil('raw REPL; CTRL-B to exit\r\n');
      }

      this.endFn = async () => {
        try {
          await this.port.write('\x02'); // Ctrl-B: exit raw REPL
          await this.port.readUntil('>\r\n');
          await this.port.readUntil('>>> ');
        } finally {
          release();
        }
      };
    } catch (err) {
      release();
      throw err;
    }
  }

  /**
   * Execute command in raw REPL mode
   */
  async exec(cmd: string, timeout = 5000, emit = false): Promise<string> {
    await this.port.readUntil('>');
    await this.port.write(cmd);
    await this.port.write('\x04'); // Ctrl-D: execute

    const status = await this.port.readExactly(2, timeout);
    if (status !== 'OK') {
      throw new Error(`Execution error: ${status}`);
    }

    this.port.emit = emit;
    if (emit && this.port.prevRecvCbk) {
      this.port.prevRecvCbk(this.port.receivedData);
    }

    const res = (await this.port.readUntil('\x04', timeout)).slice(0, -1);
    const err = (await this.port.readUntil('\x04', timeout)).slice(0, -1);

    if (err.length) {
      throw new Error(err);
    }

    return res;
  }

  /**
   * Read file from ESP32
   */
  async readFile(filename: string): Promise<Uint8Array> {
    const rsp = await this.exec(`
try:
 import binascii
 h=lambda x: binascii.hexlify(x).decode()
 h(b'')
except:
 h=lambda b: ''.join('{:02x}'.format(byte) for byte in b)
with open('${filename}','rb') as f:
 while 1:
  b=f.read(64)
  if not b:break
  print(h(b),end='')
`);

    if (rsp.length) {
      const matches = rsp.match(/../g);
      if (matches) {
        return new Uint8Array(matches.map((h) => parseInt(h, 16)));
      }
    }
    return new Uint8Array();
  }

  /**
   * Write file to ESP32
   */
  async writeFile(
    filename: string,
    data: string | Uint8Array,
    chunk_size = 128,
    direct = false
  ): Promise<void> {
    console.log(`Writing ${filename}`);

    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      data = new Uint8Array(encoder.encode(data));
    }

    const hexlify = (data: Uint8Array): string => {
      return [...data].map((x) => x.toString(16).padStart(2, '0')).join('');
    };

    const repr = (arr: Uint8Array): string => {
      let result = "b'";
      for (const byte of arr) {
        if (byte >= 32 && byte <= 126) {
          if (byte === 92 || byte === 39) {
            result += '\\' + String.fromCharCode(byte);
          } else {
            result += String.fromCharCode(byte);
          }
        } else {
          result += '\\x' + byte.toString(16).padStart(2, '0');
        }
      }
      result += "'";
      return result;
    };

    const dest = direct ? filename : '.viper.tmp';

    await this.exec(`
try:
 import binascii
 h=binascii.unhexlify
 h('')
except:
 h=lambda s: bytes(int(s[i:i+2], 16) for i in range(0, len(s), 2))
f=open('${dest}','wb')
w=lambda d: f.write(h(d))
o=f.write
`);

    // Write data in chunks
    for (let i = 0; i < data.byteLength; i += chunk_size) {
      const chunk = data.slice(i, i + chunk_size);
      const cmdHex = "w('" + hexlify(chunk) + "')";
      const cmdRepr = 'o(' + repr(chunk) + ')';

      // Use optimal command (shorter)
      const cmd = cmdHex.length < cmdRepr.length ? cmdHex : cmdRepr;
      await this.exec(cmd);
    }

    if (direct) {
      await this.exec(`f.close()`);
    } else {
      await this.exec(`f.close()
try: os.remove('${filename}')
except: pass
os.rename('${dest}','${filename}')
`);
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const rsp = await this.exec(`
try: u=os.uname()
except: u=('','','','',sys.platform)
try: v=sys.version.split(';')[1].strip()
except: v='MicroPython '+u[2]
mpy=getattr(sys.implementation, '_mpy', 0)
sp=':'.join(sys.path)
d=[u[4],u[2],u[0],v,mpy>>10,mpy&0xFF,(mpy>>8)&3,sp]
print('|'.join(str(x) for x in d))
`);

    const parts = rsp.trim().split('|');
    const [machine, release, sysname, version, mpy_arch_num, mpy_ver_str, mpy_sub_str, sys_path_str] = parts;

    const mpy_arch_names = [
      null, 'x86', 'x64', 'armv6', 'armv6m', 'armv7m', 'armv7em', 'armv7emsp', 'armv7emdp',
      'xtensa', 'xtensawin', 'rv32imc'
    ];

    let mpy_arch = null;
    try {
      const idx = parseInt(mpy_arch_num, 10);
      if (idx >= 0 && idx < mpy_arch_names.length) {
        mpy_arch = mpy_arch_names[idx];
      }
    } catch (_err) {
      // Keep null
    }

    return {
      machine,
      release,
      sysname,
      version,
      mpy_arch,
      mpy_ver: parseInt(mpy_ver_str, 10) || 'py',
      mpy_sub: parseInt(mpy_sub_str, 10),
      sys_path: (sys_path_str || '').split(':'),
    };
  }

  /**
   * Create empty file
   */
  async touchFile(filename: string): Promise<void> {
    await this.exec(`
f=open('${filename}','wb')
f.close()
`);
  }

  /**
   * Create directory path (recursively)
   */
  async makePath(path: string): Promise<void> {
    await this.exec(`
p=''
for d in '${path}'.split('/'):
 if not d: continue
 p += '/'+d
 try: os.mkdir(p)
 except OSError as e:
  if e.args[0] not in (17, 20): raise
`);
  }

  /**
   * Remove file
   */
  async removeFile(filepath: string): Promise<void> {
    await this.exec(`
try:
 os.remove('${filepath}')
except OSError as e:
 if e.args[0] == 39:
  raise Exception('Directory not empty')
 else:
  raise
`);
  }

  /**
   * Remove directory
   */
  async removeDir(path: string): Promise<void> {
    await this.exec(`
try:
 os.rmdir('${path}')
except OSError as e:
 if e.args[0] == 39:
  raise Exception('Directory not empty')
 else:
  raise
`);
  }

  /**
   * Get filesystem stats
   */
  async getFsStats(path = '/'): Promise<FileSystemStats> {
    const rsp = await this.exec(`
s = os.statvfs('${path}')
fs = s[1] * s[2]
ff = s[3] * s[0]
fu = fs - ff
print('%s|%s|%s'%(fu,ff,fs))
`);

    const [used, free, total] = rsp.trim().split('|');
    return {
      used: parseInt(used, 10),
      free: parseInt(free, 10),
      total: parseInt(total, 10),
    };
  }

  /**
   * Walk filesystem tree
   */
  async walkFs(): Promise<FileSystemNode[]> {
    const rsp = await this.exec(`
def walk(p):
 for n in os.listdir(p if p else '/'):
  fn=p+'/'+n
  try: s=os.stat(fn)
  except: s=(0,)*7
  try:
   if s[0] & 0x4000 == 0:
    print('f|'+fn+'|'+str(s[6]))
   elif n not in ('.','..'):
    print('d|'+fn+'|'+str(s[6]))
    walk(fn)
  except:
   print('f|'+p+'/???|'+str(s[6]))
walk('')
`);

    const result: FileSystemNode[] = [];

    // Build file tree
    for (const line of rsp.split('\n')) {
      if (!line.trim()) continue;

      const [type, fullpath, sizeStr] = line.trim().split('|');
      let current = result;
      const pathSegments = fullpath.split('/').filter((s) => s);
      let filename = '';

      if (type === 'f') {
        filename = pathSegments.pop() || '';
      }

      // Navigate/create directory structure
      for (const segment of pathSegments) {
        let next = current.find((x) => x.name === segment && x.type === 'directory');
        if (next) {
          current = next.content || [];
        } else {
          const newNode: FileSystemNode = {
            name: segment,
            path: pathSegments.join('/'),
            type: 'directory',
            content: [],
          };
          current.push(newNode);
          current = newNode.content || [];
        }
      }

      // Add file or directory
      if (type === 'f' && filename) {
        current.push({
          name: filename,
          path: fullpath,
          type: 'file',
          size: parseInt(sizeStr, 10),
        });
      }
    }

    return result;
  }

  /**
   * Read system info in markdown format
   */
  async readSysInfoMD(): Promise<string> {
    return await this.exec(`
import gc
gc.collect()
mu = gc.mem_alloc()
mf = gc.mem_free()
ms = mu + mf
uname=os.uname()
p=print
def size_fmt(size):
 suffixes = ['B','KiB','MiB','GiB','TiB']
 i = 0
 while size > 1024 and i < len(suffixes)-1:
  i += 1
  size //= 1024
 return "%d%s" % (size, suffixes[i])
p('## Machine')
p('- Name: \`'+uname.machine+'\`')
try:
 gc.collect()
 import microcontroller as uc
 p('- CPU: \`%s @ %s MHz\`' % (sys.platform, uc.cpu.frequency // 1_000_000))
 p('- UID: \`%s\`' % (uc.cpu.uid.hex(),))
 p('- Temp.: \`%s °C\`' % (uc.cpu.temperature,))
 p('- Voltage: \`%s V\`' % (uc.cpu.voltage,))
except:
 try:
  gc.collect()
  import machine
  p('- CPU: \`%s @ %s MHz\`' % (sys.platform, machine.freq() // 1_000_000))
 except:
  p('- CPU: \`'+sys.platform+'\`')
p()
p('## System')
p('- Version: \`'+sys.version.split(";")[1].strip()+'\`')
if ms:
 p('- Memory use:  \`%s / %s, free: %d%%\`' % (size_fmt(mu), size_fmt(ms), (mf * 100) // ms))
`);
  }

  /**
   * End session and exit raw REPL mode
   */
  async end(): Promise<void> {
    if (this.endFn) {
      await this.endFn();
    }
  }
}
