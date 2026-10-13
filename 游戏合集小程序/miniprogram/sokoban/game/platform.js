// Browser dependencies are scoped to a renderer instance; no globals are patched.
function createPlatform(wxApi, canvas, pixelRatio) {
  const listeners = {};
  const performance = wxApi.getPerformance ? wxApi.getPerformance() : { now: () => Date.now() };
  const requestAnimationFrame = callback => canvas.requestAnimationFrame(callback);
  const cancelAnimationFrame = id => canvas.cancelAnimationFrame(id);
  const facade = {
    get width() { return canvas.width; }, set width(value) { canvas.width = value; },
    get height() { return canvas.height; }, set height(value) { canvas.height = value; },
    style: {},
    getContext: (type, attrs) => canvas.getContext(type === 'webgl2' ? 'webgl' : type, attrs),
    addEventListener(type, callback) { (listeners[type] || (listeners[type] = [])).push(callback); },
    removeEventListener(type, callback) { listeners[type] = (listeners[type] || []).filter(fn => fn !== callback); },
    setAttribute() {}
  };
  const createCanvas = (width, height) => wxApi.createOffscreenCanvas({ type: '2d', width: width || 1, height: height || 1 });
  const document = {
    createElement(name) { if (name === 'canvas') return createCanvas(); if (name === 'img') return canvas.createImage(); throw new Error('不支持的元素 ' + name); },
    createElementNS(namespace, name) { return this.createElement(name); }
  };
  const window = { devicePixelRatio: pixelRatio || 1, requestAnimationFrame, cancelAnimationFrame, performance };
  return { canvas: facade, rawCanvas: canvas, createCanvas, document, window, self: window, performance, navigator: { userAgent: 'WechatMiniProgram' }, requestAnimationFrame, cancelAnimationFrame };
}
module.exports = { createPlatform };
