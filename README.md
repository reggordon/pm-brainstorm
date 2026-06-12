# PM Brainstorm

A complexity assessment tool for payment system feature requests. 
Paste a ticket or feature description and get a structured breakdown 
of where the complexity actually lives — before you walk into an 
engineering conversation.

---

## What this is for

Payments systems are unusually hard to reason about from the outside. 
A feature that looks like a UI change might touch scheme certification. 
A "simple" data field addition might expand PCI scope. A new integration 
might require legal sign-off that takes months. None of this is obvious 
from a ticket.

This tool is designed to make that complexity legible early — not to 
replace engineering judgement, but to surface the right questions before 
engineering is formally engaged. The intended user is a Senior PM who 
understands payments but needs structured help thinking through twelve 
specific complexity dimensions before walking into a cross-functional 
scoping conversation.

The output is not an estimate. It is a reasoned complexity profile.

---

## What it assesses

Each submission is analysed across twelve dimensions specific to 
payments infrastructure:

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

Each dimension gets a rating (LOW / MEDIUM / HIGH / UNKNOWN), a 
confidence level, and a short reasoning paragraph.

---

## Output

- **Brief Quality Assessment** — rates the input as DETAILED, ADEQUATE, 
  or WEAK before analysis begins. WEAK stops the analysis and tells the 
  PM exactly what is missing and why it matters.
- **Recommended Action** — one of three verdicts: `PROCEED TO ENGINEERING`, 
  `REQUEST MORE DETAIL FIRST`, or `FLAG FOR SCRUTINY`
- **Complexity Breakdown** — a card grid, one card per dimension, with 
  rating, confidence, and collapsible reasoning
- **What Is Genuinely Uncertain** — explicit gaps tagged as either 
  BRIEF GAP (information the PM needs to find) or PM DECISION (a product 
  decision the PM needs to make)
- **Questions to Take Into Engineering** — 5–8 sharp, specific questions 
  where a vague answer is itself a signal

---

## Running locally

Open index.html via a local server — required because the app fetches 
system-prompt.txt and flows.txt as local files and browsers block 
direct file fetches for security reasons.

The easiest way is the Live Server extension in VS Code. Click 
"Go Live" in the bottom bar and the app opens automatically.

Add your Anthropic API key when prompted in the app.

---

## How the tool reasons

The tool reasons from two sources:

**General payments knowledge** — the system prompt encodes twelve 
complexity dimensions specific to payments infrastructure, with 
calibrated reasoning instructions that distinguish between what 
the scheme sees versus what happens inside the platform, and between 
expanding a PCI boundary versus handling a new credential type within 
an existing compliant vault.

**Platform flow diagrams** — flows.txt contains documented integration 
flows for this specific platform. The tool uses these to assess blast 
radius — which systems a change touches, which dependencies are hard 
sequential gates, and which changes affect multiple flows simultaneously. 
As more flows are populated in flows.txt, the output becomes more 
platform-specific and less reliant on general payments pattern matching.

The quality of the output scales directly with the quality of the brief 
and the completeness of flows.txt. A vague brief produces a hedged 
assessment. A well-scoped brief against a fully populated flows.txt 
produces something close to a staff engineer's first read of a ticket.

---

## What this is not

- Not an estimating tool — it produces no numbers, no story points, 
  no timelines
- Not a replacement for engineering judgement — it surfaces questions, 
  not answers
- Not a static knowledge base — it gets more useful as flows.txt grows

---

## Design intent

The FLAG FOR SCRUTINY verdict is the most telling part of the design. 
It is not a rejection — it is a signal that the PM should pressure-test 
scope before accepting any estimate. That framing reflects an environment 
where complexity signals are often discovered too late, and where the gap 
between what a ticket describes and what engineering actually touches is 
consistently larger than expected.

The BRIEF GAP / PM DECISION distinction in the uncertainty section is 
equally deliberate. A tool that only surfaces information gaps trains PMs 
to write better briefs. A tool that also surfaces decision gaps trains PMs 
to think more completely before engineering is engaged. Both behaviours 
reduce downstream rework.
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

