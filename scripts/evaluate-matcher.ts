import { KeywordMatcher } from '../src/analysis/keyword-matcher';
import { mockMarkets } from '../src/data/mock-markets';
import { Market } from '../src/types/market';

declare const require: any;
declare const process: any;
const fs = require('fs');
const path = require('path');

interface EvalCase {
  id?: string;
  category?: string;
  tweetText?: string;
  tweet?: string;
  text?: string;
  relevantMarketIds?: string[];
  relevant_market_ids?: string[];
  notes?: string;
}

interface CliOptions {
  labelsPath: string;
  marketsPath?: string;
  threshold: number;
  maxResults: number;
  k: number;
  showErrors: number;
}

function usage(): void {
  console.error(
    [
      'Usage:',
      '  node .tmp/matcher-eval/scripts/evaluate-matcher.js [options]',
      '',
      'Options:',
      '  --labels <path>       JSONL labels path (default: scripts/data/matcher-eval-mock-markets.jsonl)',
      '  --markets <path>       Optional JSON file containing Market[] or { markets: Market[] }',
      '  --threshold <number>   Min confidence threshold (default: 0.22)',
      '  --max-results <int>    Max matches returned per tweet (default: 5)',
      '  --k <int>              K for ranking metrics (default: 3)',
      '  --show-errors <int>    Number of FP/FN examples to print (default: 10)',
    ].join('\n')
  );
  process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    labelsPath: 'scripts/data/matcher-eval-mock-markets.jsonl',
    threshold: 0.22,
    maxResults: 5,
    k: 3,
    showErrors: 10,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--labels' && next) {
      opts.labelsPath = next;
      i++;
    } else if (a === '--markets' && next) {
      opts.marketsPath = next;
      i++;
    } else if (a === '--threshold' && next) {
      opts.threshold = Number(next);
      i++;
    } else if (a === '--max-results' && next) {
      opts.maxResults = Number(next);
      i++;
    } else if (a === '--k' && next) {
      opts.k = Number(next);
      i++;
    } else if (a === '--show-errors' && next) {
      opts.showErrors = Number(next);
      i++;
    } else if (a === '-h' || a === '--help') {
      usage();
    }
  }

  if (!Number.isFinite(opts.threshold) || opts.threshold < 0 || opts.threshold > 1) usage();
  if (!Number.isInteger(opts.maxResults) || opts.maxResults < 1) usage();
  if (!Number.isInteger(opts.k) || opts.k < 1) usage();
  if (!Number.isInteger(opts.showErrors) || opts.showErrors < 0) usage();
  return opts;
}

function readJsonl(filePath: string): EvalCase[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));
  return lines.map((line, idx) => {
    try {
      return JSON.parse(line) as EvalCase;
    } catch (e) {
      throw new Error(`Invalid JSON on line ${idx + 1}: ${line}`);
    }
  });
}

function loadMarkets(filePath?: string): Market[] {
  if (!filePath) return mockMarkets;
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  const arr = Array.isArray(raw) ? raw : (raw as { markets?: unknown[] }).markets;
  if (!Array.isArray(arr)) {
    throw new Error(`Markets file must be Market[] or { "markets": Market[] }: ${filePath}`);
  }
  return arr as Market[];
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function safeDiv(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const labelsPath = path.resolve(cwd, opts.labelsPath);
  const marketsPath = opts.marketsPath ? path.resolve(cwd, opts.marketsPath) : undefined;

  const cases = readJsonl(labelsPath);
  const markets = loadMarkets(marketsPath);
  const matcher = new KeywordMatcher(markets, opts.threshold, opts.maxResults);

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  let sumPAtK = 0;
  let sumRAtK = 0;
  let sumRR = 0;
  let hitsAt1 = 0;
  let hitsAtK = 0;

  let positives = 0;
  const latenciesMs: number[] = [];

  const fpExamples: Array<{ id: string; tweet: string; topId?: string; topTitle?: string }> = [];
  const fnExamples: Array<{ id: string; tweet: string; relevant: string[] }> = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const id = c.id ?? `case-${i + 1}`;
    const tweet = (c.tweetText ?? c.tweet ?? c.text ?? '').trim();
    const relevantIds = (c.relevantMarketIds ?? c.relevant_market_ids ?? []).map(String);

    if (!tweet) {
      throw new Error(`Missing tweet text for ${id}. Use tweetText, tweet, or text.`);
    }

    const relevant = new Set(relevantIds);
    const isPositive = relevant.size > 0;
    if (isPositive) positives++;

    const start = process.hrtime.bigint();
    const matches = matcher.match(tweet);
    const elapsedNs = process.hrtime.bigint() - start;
    latenciesMs.push(Number(elapsedNs) / 1_000_000);

    const predictedIds = matches.map(m => m.market.id);
    const hasPrediction = predictedIds.length > 0;
    const hasRelevantPrediction = predictedIds.some(idv => relevant.has(idv));

    if (isPositive) {
      if (hasRelevantPrediction) tp++;
      else fn++;
    } else {
      if (hasPrediction) fp++;
      else tn++;
    }

    if (!isPositive && hasPrediction && fpExamples.length < opts.showErrors) {
      fpExamples.push({
        id,
        tweet,
        topId: matches[0]?.market.id,
        topTitle: matches[0]?.market.title,
      });
    }
    if (isPositive && !hasRelevantPrediction && fnExamples.length < opts.showErrors) {
      fnExamples.push({ id, tweet, relevant: [...relevant] });
    }

    const topK = matches.slice(0, opts.k).map(m => m.market.id);
    const relevantInK = topK.filter(mid => relevant.has(mid)).length;

    const pAtK = safeDiv(relevantInK, opts.k);
    const rAtK = isPositive ? safeDiv(relevantInK, relevant.size) : 0;
    sumPAtK += pAtK;
    sumRAtK += rAtK;

    if (matches.length > 0 && relevant.has(matches[0].market.id)) hitsAt1++;
    if (relevantInK > 0) hitsAtK++;

    let rr = 0;
    for (let rank = 0; rank < matches.length; rank++) {
      if (relevant.has(matches[rank].market.id)) {
        rr = 1 / (rank + 1);
        break;
      }
    }
    sumRR += rr;
  }

  const total = cases.length;
  const precision = safeDiv(tp, tp + fp);
  const recall = safeDiv(tp, tp + fn);
  const f1 = safeDiv(2 * precision * recall, precision + recall);
  const accuracy = safeDiv(tp + tn, total);
  const fpr = safeDiv(fp, fp + tn);
  const fnr = safeDiv(fn, fn + tp);

  const avgPAtK = safeDiv(sumPAtK, total);
  const avgRAtK = safeDiv(sumRAtK, Math.max(1, positives));
  const mrr = safeDiv(sumRR, Math.max(1, positives));
  const hitRateAt1 = safeDiv(hitsAt1, total);
  const hitRateAtK = safeDiv(hitsAtK, total);

  const meanLatency = safeDiv(latenciesMs.reduce((a, b) => a + b, 0), latenciesMs.length);
  const p50 = percentile(latenciesMs, 50);
  const p95 = percentile(latenciesMs, 95);

  console.log('\n=== Matcher Evaluation Report ===');
  console.log(`labels: ${labelsPath}`);
  console.log(`markets: ${marketsPath ?? '[default mockMarkets]'}`);
  console.log(`threshold: ${opts.threshold}`);
  console.log(`maxResults: ${opts.maxResults}`);
  console.log(`k: ${opts.k}`);
  console.log(`cases: ${total}`);
  console.log(`positive cases: ${positives}`);
  console.log('');
  console.log('Binary Classification (tweet-level)');
  console.log(`TP=${tp}  FP=${fp}  FN=${fn}  TN=${tn}`);
  console.log(`Accuracy:  ${fmtPct(accuracy)}`);
  console.log(`Precision: ${fmtPct(precision)}`);
  console.log(`Recall:    ${fmtPct(recall)}`);
  console.log(`F1:        ${fmtPct(f1)}`);
  console.log(`FPR:       ${fmtPct(fpr)}`);
  console.log(`FNR:       ${fmtPct(fnr)}`);
  console.log('');
  console.log(`Ranking (top-${opts.k})`);
  console.log(`HitRate@1: ${fmtPct(hitRateAt1)}`);
  console.log(`HitRate@${opts.k}: ${fmtPct(hitRateAtK)}`);
  console.log(`Precision@${opts.k} (macro over all cases): ${fmtPct(avgPAtK)}`);
  console.log(`Recall@${opts.k} (macro over positive cases): ${fmtPct(avgRAtK)}`);
  console.log(`MRR (positive cases): ${fmtPct(mrr)}`);
  console.log('');
  console.log('Runtime');
  console.log(`mean match() latency: ${meanLatency.toFixed(3)} ms/case`);
  console.log(`p50: ${p50.toFixed(3)} ms  p95: ${p95.toFixed(3)} ms`);

  if (fpExamples.length > 0) {
    console.log('\nFalse Positive Examples');
    for (const ex of fpExamples) {
      console.log(`- ${ex.id}: top=${ex.topId ?? 'n/a'} "${ex.topTitle ?? ''}"`);
      console.log(`  tweet: ${ex.tweet}`);
    }
  }

  if (fnExamples.length > 0) {
    console.log('\nFalse Negative Examples');
    for (const ex of fnExamples) {
      console.log(`- ${ex.id}: expected one of [${ex.relevant.join(', ')}]`);
      console.log(`  tweet: ${ex.tweet}`);
    }
  }
}

main();
