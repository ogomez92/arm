/**
 * Service for generating and managing axe-core console snippets
 * The snippet loads axe-core from CDN and sends results back to the web app via postMessage
 */

export class AxeSnippetService {
	/**
	 * The origin of the web app (used for secure postMessage communication)
	 */
	private static readonly APP_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

	/**
	 * Generate the console snippet code that users paste into the browser console
	 * This code:
	 * 1. Loads axe-core from CDN
	 * 2. Runs axe.run() on the current page
	 * 3. Sends results back to the web app via postMessage
	 */
	static generateSnippet(): string {
		const appOrigin = this.APP_ORIGIN;

		return `(function() {
  console.log('🔍 Loading axe-core accessibility scanner...');

  // Load axe-core from CDN
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
  script.crossOrigin = 'anonymous';

  script.onload = function() {
    console.log('✅ axe-core loaded successfully');
    console.log('🔍 Running accessibility scan...');

    // Run axe-core scan
    axe.run(document, {
      resultTypes: ['violations'],
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
      }
    }).then(function(results) {
      console.log('✅ Scan complete!');
      console.log('Found ' + results.violations.length + ' violation(s)');

      const scanData = {
        type: 'AXE_SCAN_RESULTS',
        url: window.location.href,
        pageTitle: document.title,
        results: results,
        timestamp: new Date().toISOString()
      };

      // Try to send results via BroadcastChannel (works for same-origin only)
      try {
        const channel = new BroadcastChannel('axe-scan-results');
        channel.postMessage(scanData);
        console.log('📤 Results sent to web app via BroadcastChannel');
        channel.close();
      } catch (error) {
        console.warn('⚠️ BroadcastChannel not available:', error);
      }

      // Also download results as JSON file (works for all origins)
      const blob = new Blob([JSON.stringify(scanData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'axe-scan-results-' + new Date().getTime() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('💾 Results downloaded as JSON file');
      console.log('📥 Import this file in the accessibility reporter app');
    }).catch(function(error) {
      console.error('❌ Error running axe scan:', error);
    });
  };

  script.onerror = function() {
    console.error('❌ Failed to load axe-core from CDN');
  };

  document.head.appendChild(script);
})();`;
	}

	/**
	 * Copy the snippet to clipboard
	 */
	static async copyToClipboard(): Promise<boolean> {
		try {
			const snippet = this.generateSnippet();
			await navigator.clipboard.writeText(snippet);
			return true;
		} catch (error) {
			console.error('Failed to copy snippet to clipboard:', error);
			return false;
		}
	}
}

/**
 * Type definition for the message sent from the scanned page back to the web app
 */
export interface AxeScanMessage {
	type: 'AXE_SCAN_RESULTS';
	url: string;
	pageTitle: string;
	results: AxeResults;
	timestamp: string;
}

/**
 * Axe-core result types (simplified)
 */
export interface AxeResults {
	violations: AxeViolation[];
	timestamp: string;
	url: string;
}

export interface AxeViolation {
	id: string;
	impact: 'minor' | 'moderate' | 'serious' | 'critical';
	tags: string[];
	description: string;
	help: string;
	helpUrl: string;
	nodes: AxeNode[];
}

export interface AxeNode {
	html: string;
	target: string[];
	failureSummary?: string;
	impact?: string;
	any?: AxeCheck[];
	all?: AxeCheck[];
	none?: AxeCheck[];
}

export interface AxeCheck {
	id: string;
	data: any;
	relatedNodes?: AxeRelatedNode[];
	impact: string;
	message: string;
}

export interface AxeRelatedNode {
	html: string;
	target: string[];
}
