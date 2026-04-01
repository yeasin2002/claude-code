// Stub for @ant/computer-use-swift
module.exports = {
  screenshot: () => Promise.resolve({ data: Buffer.alloc(0), width: 1920, height: 1080 }),
  apps: {
    listInstalled: () => Promise.resolve([])
  },
  resolvePrepareCapture: () => Promise.resolve(),
  captureExcluding: () => Promise.resolve({ data: Buffer.alloc(0), width: 1920, height: 1080 }),
  captureRegion: () => Promise.resolve({ data: Buffer.alloc(0), width: 1920, height: 1080 })
};