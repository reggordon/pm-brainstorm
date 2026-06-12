# PM Brainstorm

A complexity assessment tool for payment system feature requests. Paste a ticket or feature description and get a structured breakdown of where the complexity actually lives — before you walk into an engineering conversation.

---

## What this is for

Payments systems are unusually hard to reason about from the outside. A feature that looks like a UI change might touch scheme certification. A "simple" data field addition might expand PCI scope. A new integration might require legal sign-off that takes months. None of this is obvious from a ticket.

This tool is designed to make that complexity legible early — not to replace engineering judgement, but to surface the right questions before engineering is formally engaged. The intended user is a Senior PM who understands payments but needs structured help thinking through twelve specific complexity dimensions before walking into a cross-functional scoping conversation.

The output is not an estimate. It is a reasoned complexity profile.

---

## What it assesses

Each submission is analysed across twelve dimensions specific to payments infrastructure:

1. **Tokenisation Layer** — VTS/MDES, merchant tokens, token lifecycle risk
2. **Scheme Involvement** — certification, compliance sign-off, Visa/Mastercard timelines
3. **Regulatory and Mandate Scope** — SCA, network mandates, non-negotiable deadlines
4. **PCI Scope** — cardholder data, token vaults, key management boundary changes
5. **Integration Surface** — internal systems, external partners, third-party APIs
6. **Third-Party Dependencies** — Apple Pay, Google Pay, wallet providers, partner approval cycles
7. **Legal and Contractual Exposure** — new contracts, DPAs, commercial relationships
8. **Downstream Consumers** — merchant APIs, wallet partners, internal services affected
9. **Onboarding and Merchant Impact** — documentation, communication, support readiness
10. **Testing Environment Constraints** — 3DS simulation gaps, DPAN mocking limits, production-as-real-test risk
11. **Data Migration or State Risk** — schema changes, persistent state, token and card record impact
12. **Contract-Driven Development** — cross-team API contracts, white-label partner alignment

Each dimension gets a rating (LOW / MEDIUM / HIGH / UNKNOWN), a confidence level, and a short reasoning paragraph.

---

## Output

- **Recommended Action** — one of three verdicts: `PROCEED TO ENGINEERING`, `REQUEST MORE DETAIL FIRST`, or `FLAG FOR SCRUTINY`
- **Complexity Breakdown** — a card grid, one card per dimension, with rating, confidence, and collapsible reasoning
- **What Is Genuinely Uncertain** — explicit gaps with direct questions to fill them
- **Questions to Take Into Engineering** — 5–8 sharp, specific questions where a vague answer is itself a signal

---

## Running locally

Requires Node.js. Set your Anthropic API key in the shell before starting:

```bash
export ANTHROPIC_API_KEY=your-key-here
node server.js
```

Then open [http://localhost:8080](http://localhost:8080).

To switch between system prompts, edit the `SYSTEM_PROMPT_PATH` line in `server.js`.

---

## My read on what this is

The tool is doing something specific: it is trying to close the information gap between a PM and a payments engineering team at the moment a feature is proposed — before estimates, before sprint planning, before anyone has committed to scope.

The twelve dimensions are not generic complexity dimensions. They are the twelve ways that payments work consistently surprises teams who don't specialise in it: scheme timelines that add months, PCI boundary changes that nobody flagged, token lifecycle edge cases that only surface in production, legal review processes that compress everything else. The system prompt encodes hard-won institutional knowledge about where the gotchas live.

The `FLAG FOR SCRUTINY` verdict is the most telling part of the design. It is not a rejection — it is a signal that the PM should pressure-test scope before accepting any estimate. That framing suggests this is a tool built for an environment where engineering estimates are often accepted without enough upfront challenge, and where complexity signals are discovered too late.
