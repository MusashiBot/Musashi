/**
 * Feed Panel Component
 *
 * Latest analyzed tweets from the feed
 */

import blessed from 'blessed';
import { AppState } from '../app-state';
import { BaseComponent } from './base';
import { formatTimeAgo, getUrgencyColor, truncate } from '../utils';

export class FeedPanel extends BaseComponent {
  constructor(screen: blessed.Widgets.Screen) {
    const container = blessed.box({
      top: 4,
      left: 0,
      width: '50%',
      height: 18,
      border: { type: 'line' },
      label: ' Feed (Latest Tweets) ',
      tags: true,
      style: {
        border: { fg: 'green' },
      },
      scrollable: true,
      alwaysScroll: true,
    });

    screen.append(container);
    super(container);
  }

  render(state: AppState) {
    const tweets = state.feed.slice(0, 5); // Show top 5 tweets

    if (tweets.length === 0) {
      this.box.setContent('{gray-fg}No tweets in feed yet...\nWaiting for data...{/gray-fg}');
      return;
    }

    const lines: string[] = [];

    tweets.forEach((tweet, idx) => {
      if (idx > 0) {
        lines.push('{gray-fg}────────────────────────────────{/gray-fg}');
      }

      const timeAgo = formatTimeAgo(tweet.tweet.created_at);
      const urgencyColor = getUrgencyColor(tweet.urgency);
      const text = truncate(tweet.tweet.text.replace(/\n/g, ' '), 40);
      const confidence = Math.round(tweet.confidence * 100);

      lines.push(`{bold}@${tweet.tweet.author}{/bold} {gray-fg}•{/gray-fg} ${timeAgo}`);
      lines.push(text);
      lines.push(
        `{gray-fg}→{/gray-fg} ${tweet.matches.length} markets {gray-fg}•{/gray-fg} ` +
        `{${urgencyColor}}${tweet.urgency.toUpperCase()}{/${urgencyColor}} {gray-fg}•{/gray-fg} ${confidence}%`
      );
    });

    this.box.setContent(lines.join('\n'));
  }
}
