// Browser JS functions for code generation
// Ported from downloads/browser_js_funcs.txt

export function getImportBrowserJs(): string {
  return `class BrowserManager {
  constructor() {
    this.pendingRequests = 0;
  }

  trackRequests(page) {
    page.on('request', (request) => {
      if (['xhr', 'fetch'].includes(request.resourceType())) {
        this.pendingRequests++;
      }
    });

    const decrement = (request) => {
      if (['xhr', 'fetch'].includes(request.resourceType())) {
        this.pendingRequests = Math.max(0, this.pendingRequests - 1);
      }
    };

    page.on('requestfinished', decrement);
    page.on('requestfailed', decrement);
  }

  async waitForAppIdle(timeout = 10000, idleTime = 500) {
    const start = Date.now();
    let idleStart = null;

    while (true) {
      if (this.pendingRequests === 0) {
        if (!idleStart) {
          idleStart = Date.now();
        } else if (Date.now() - idleStart >= idleTime) {
          return;
        }
      } else {
        // if (idleStart) console.log('Pending requests detected, resetting idle timer.');
        idleStart = null;
      }

      if (Date.now() - start > timeout) {
        return;
      }

      await new Promise((r) => setTimeout(r, 100));
    }
  }
}
`;
}
