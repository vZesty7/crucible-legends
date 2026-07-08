// Runs before every test file.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.__CL_TEST_HOOK__ = true;

// jsdom has no scrollIntoView; the game may call it on feed updates.
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
