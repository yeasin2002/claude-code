// Stub for @ant/computer-use-input
module.exports = {
  isSupported: false,
  key: () => Promise.resolve(),
  keys: () => Promise.resolve(),
  click: () => Promise.resolve(),
  scroll: () => Promise.resolve(),
  frontmostApp: () => Promise.resolve({ bundleId: 'unknown' })
};