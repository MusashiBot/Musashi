# Matcher Evaluation README

This document explains how to evaluate Musashi's keyword matcher for:

- performance (runtime latency)
- accuracy
- false positives
- false negatives

## 1. What This Evaluator Tests

The evaluator runs `KeywordMatcher.match(tweetText)` against a labeled tweet set.

Each labeled case defines:

- `tweetText` (or `tweet` / `text`)
- `relevantMarketIds` (array of market IDs considered correct for that tweet)

It reports two classes of metrics:

1. Binary tweet-level metrics:
- `TP`: tweet has relevant markets and matcher returns at least one relevant market
- `FP`: tweet has no relevant markets but matcher still returns results
- `FN`: tweet has relevant markets but matcher returns none of them
- `TN`: tweet has no relevant markets and matcher returns none

Derived:
- Accuracy
- Precision
- Recall
- F1
- FPR (false positive rate)
- FNR (false negative rate)

2. Ranking metrics (for top-k output):
- HitRate@1
- HitRate@k
- Precision@k (macro over all cases)
- Recall@k (macro over positive cases)
- MRR

It also measures `match()` runtime latency:
- mean ms/case
- p50
- p95

## 2. Why This Works

The production behavior you care about is:

- Given a tweet, does the matcher show relevant markets?
- Are top-ranked markets correct?
- Is matching fast enough for real-time feed scanning?

This evaluator measures exactly that by:

- using the real matcher implementation (`src/analysis/keyword-matcher.ts`)
- replaying labeled tweets with known expected market IDs
- computing standard retrieval/classification metrics
- timing the same `match()` call used by the extension

Because labels are explicit, FP/FN are objectively counted and can be compared across code changes and threshold settings.

## 3. Data Format

Use JSONL (one JSON object per line).

Example:

```json
{"id":"p1","tweetText":"Bitcoin could hit 100k this year","relevantMarketIds":["kalshi-bitcoin-100k"]}
{"id":"n1","tweetText":"Just posted my travel vlog","relevantMarketIds":[]}
```

Notes:

- Empty `relevantMarketIds` means this is a negative example (no market should match).
- Positive examples should include all market IDs that you would consider acceptable.

## 4. Run Instructions

From repo root (`/Users/ty/Documents/Musashi/Musashi`):

1. Run with mock-market labels (default):

```bash
npm run matcher:eval
```

This uses:
- `scripts/data/matcher-eval-mock-markets.jsonl`
- labels generated from `src/data/mock-markets.ts`
- one labeled case per market (`tweetText` = market title, `relevantMarketIds` = that market ID)

2. Run with your own labels (override default):

```bash
npm run matcher:eval -- --labels path/to/your-eval.jsonl
```

3. Optional runtime controls:

```bash
npm run matcher:eval -- \
  --labels path/to/your-eval.jsonl \
  --threshold 0.22 \
  --max-results 5 \
  --k 3 \
  --show-errors 15
```

4. Optional custom markets file:

```bash
npm run matcher:eval -- \
  --markets path/to/markets.json
```

`--markets` accepts:
- `Market[]`
- `{ "markets": Market[] }`

If omitted, it uses `mockMarkets`.

## 5. Interpreting Results

Use this as a practical guide:

- Precision high, Recall low:
  - strict matcher; few bad matches, but misses relevant ones (more FN)
- Recall high, Precision low:
  - permissive matcher; catches more positives, but adds noise (more FP)

Threshold tuning:

- increase `--threshold` to reduce FP
- decrease `--threshold` to reduce FN

Do not use only one metric. Watch:

- Precision + Recall + F1
- FP/FN examples printed by the evaluator
- p95 latency for UX stability

## 6. Suggested Evaluation Workflow

1. Build a balanced labeled set:
- positives across major categories
- negatives with generic chatter and promo spam

2. Run baseline:
- store metrics and FP/FN examples

3. Change matcher logic (weights, synonym map, stop words, threshold).

4. Re-run evaluator on the same dataset.

5. Accept changes only if:
- key metrics improve or remain acceptable
- no unacceptable regression in p95 latency

## 7. Current Scope and Limits

- This evaluates the matcher logic, not end-to-end UI rendering.
- Metrics are only as good as your label quality.
- If your labels are skewed toward one category, results will be biased.
- Use a separate holdout set to avoid overfitting matcher changes to one sample.
