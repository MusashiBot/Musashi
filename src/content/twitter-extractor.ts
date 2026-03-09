// Twitter/X Tweet Extractor
// Detects and extracts tweet text from Twitter/X pages

export interface Tweet {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  element: HTMLElement;
}

export class TwitterExtractor {
  private processedTweets = new Set<string>();
  private observer: MutationObserver | null = null;
  private processingQueue: HTMLElement[] = [];
  private processingTimer: number | null = null;
  private onTweetsDetected: ((tweets: Tweet[]) => void) | null = null;

  constructor() {
    console.log('[Musashi] Twitter extractor initialized');
  }

  /**
   * Start observing the page for tweets
   */
  public start(callback: (tweets: Tweet[]) => void): void {
    this.onTweetsDetected = callback;

    // Process existing tweets on the page
    this.processExistingTweets();

    // Set up MutationObserver to watch for new tweets
    this.setupObserver();

    console.log('[Musashi] Started monitoring for tweets');
  }

  /**
   * Stop observing
   */
  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    console.log('[Musashi] Stopped monitoring');
  }

  /**
   * Process tweets already on the page
   */
  private processExistingTweets(): void {
    const tweetElements = this.findTweetElements();
    console.log(`[Musashi] Found ${tweetElements.length} existing tweets`);

    if (tweetElements.length > 0) {
      this.processingQueue.push(...tweetElements);
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Set up MutationObserver to detect new tweets
   */
  private setupObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      const newTweetElements: HTMLElement[] = [];

      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // Check if this is a tweet element
            if (this.isTweetElement(element)) {
              newTweetElements.push(element);
            }

            // Check children for tweet elements
            const childTweets = element.querySelectorAll('[data-testid="tweet"]');
            childTweets.forEach((tweet) => {
              newTweetElements.push(tweet as HTMLElement);
            });
          }
        });
      }

      if (newTweetElements.length > 0) {
        console.log(`[Musashi] Detected ${newTweetElements.length} new tweets`);
        this.processingQueue.push(...newTweetElements);
        this.scheduleBatchProcessing();
      }
    });

    // Observe the main timeline container
    const timelineContainer = document.querySelector('main[role="main"]') || document.body;
    this.observer.observe(timelineContainer, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Schedule batch processing (wait 3 seconds to collect tweets for better batching)
   */
  private scheduleBatchProcessing(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }

    this.processingTimer = window.setTimeout(() => {
      this.processBatch();
      this.processingTimer = null;
    }, 3000); // Increased from 2s to 3s to batch more tweets together
  }

  /**
   * Process a batch of tweets
   */
  private processBatch(): void {
    if (this.processingQueue.length === 0) return;

    const tweets: Tweet[] = [];
    const elementsToProcess = [...this.processingQueue];
    this.processingQueue = [];

    for (const element of elementsToProcess) {
      const tweet = this.extractTweetData(element);
      if (tweet) {
        // Always process tweets - the injection logic will check if card exists
        // This handles Twitter re-rendering tweets when expanding/collapsing
        tweets.push(tweet);
        this.processedTweets.add(tweet.id);
      }
    }

    if (tweets.length > 0 && this.onTweetsDetected) {
      console.log(`[Musashi] Processing ${tweets.length} new tweets`);
      this.onTweetsDetected(tweets);
    }
  }

  /**
   * Find all tweet elements on the page
   */
  private findTweetElements(): HTMLElement[] {
    const tweets = document.querySelectorAll('[data-testid="tweet"]');
    return Array.from(tweets) as HTMLElement[];
  }

  /**
   * Check if an element is a tweet
   */
  private isTweetElement(element: HTMLElement): boolean {
    return element.getAttribute('data-testid') === 'tweet';
  }

  /**
   * Extract tweet data from a tweet element
   */
  private extractTweetData(element: HTMLElement): Tweet | null {
    try {
      // Extract tweet text
      const tweetTextElement = element.querySelector('[data-testid="tweetText"]');
      if (!tweetTextElement) {
        return null;
      }

      const text = tweetTextElement.textContent?.trim() || '';
      if (text.length === 0) {
        return null;
      }

      // Generate a simple ID based on text content and position
      const id = this.generateTweetId(element);

      // Try to extract author (may not always be available)
      const authorElement = element.querySelector('[data-testid="User-Name"]');
      const author = authorElement?.textContent?.trim() || 'Unknown';

      return {
        id,
        text,
        author,
        timestamp: Date.now(),
        element,
      };
    } catch (error) {
      console.error('[Musashi] Error extracting tweet:', error);
      return null;
    }
  }

  /**
   * Generate a unique ID for a tweet
   */
  private generateTweetId(element: HTMLElement): string {
    // Try to get tweet ID from URL in the element
    const timeLink = element.querySelector('a[href*="/status/"]');
    if (timeLink) {
      const href = timeLink.getAttribute('href') || '';
      const match = href.match(/\/status\/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    // Fallback: use a hash of the element's position and content
    const rect = element.getBoundingClientRect();
    const textContent = element.textContent?.slice(0, 50) || '';
    return `${Math.round(rect.top)}-${textContent.length}-${Date.now()}`;
  }

  /**
   * Clear processed tweets cache (useful for testing)
   */
  public clearCache(): void {
    this.processedTweets.clear();
    console.log('[Musashi] Cleared processed tweets cache');
  }
}
