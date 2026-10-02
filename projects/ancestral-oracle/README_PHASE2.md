# Ancestral AI Oracle — Phase 2

## Purpose

Ancestral AI Oracle is a Telegram bot for exploring African cultural references through respectful, practical reflections in Nigerian Pidgin and clear English. The catalogue is a **symbolic educational resource**; it does not claim supernatural power, replace living traditions, or speak for every African community.

Phase 2 delivers a searchable pantheon, random reflections, domain lookup, and an AI-guided command reserved for the registered project owner. It is intentionally transparent about what is implemented and what remains a placeholder.

## Delivered scope

| Capability | Status | Notes |
|---|---:|---|
| Expanded catalogue | Complete | 61 catalogue entries across Yoruba, Igbo, Akan, Fon/Ewe, Dinka, Oromo, Maasai, Shona, Kongo, and diaspora traditions. Names and groupings need ongoing scholarly/community review. |
| Random symbolic reflection | Complete | `/random` returns one entry with tradition, domain, and Pidgin wisdom. |
| Domain search | Complete | `/domain <word>` searches domains such as justice, water, work, love, and change. |
| Name search | Complete | `/god <name>` finds matching entries. |
| Grounded guidance | Complete | `/ask <question>` pairs a symbolic lens with one practical next step. |
| Supreme Activator AI | Complete with configuration | `/deepwisdom <question>` is restricted to Telegram user ID `8632545391` and calls the configured OpenAI-compatible endpoint. |
| NanoBanana vision | Placeholder | `/imagine <idea>` records the integration boundary and returns a creative brief; it does not generate an image yet. |
| 24/7 hosting | Not included | The code is polling-ready, but continuous hosting, secrets, monitoring, and restart policy must be configured separately. |

## Installation

Use Python 3.10 or newer. From this directory:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set `TELEGRAM_BOT_TOKEN` in `.env`. To enable `/deepwisdom`, set `OPENAI_API_KEY`; optionally set `OPENAI_API_BASE` and `OPENAI_MODEL`. Never commit `.env` or bot tokens.

Run locally:

```bash
python ancestral_oracle_bot.py
```

## Commands

| Command | Purpose |
|---|---|
| `/start` | Show the welcome message and usage. |
| `/random` | Receive one symbolic entry. |
| `/gods` | Show catalogue count and available domains. |
| `/domain justice` | Search entries by domain. |
| `/god Ogun` | Search entries by name. |
| `/ask How do I begin?` | Receive a non-prophetic symbolic reflection and practical next step. |
| `/deepwisdom question` | Owner-only AI reflection for Telegram ID `8632545391`. |
| `/imagine a river of light` | Owner-only NanoBanana integration placeholder. |

## Cultural and safety boundaries

The bot uses “activation” as a project metaphor for enabling software features, not as a claim that a deity has been summoned or given authority. It should not present any tradition as monolithic, invent ritual instructions as fact, or claim to represent living practitioners. Future catalogue additions should record source, region, spelling variants, pronunciation notes, and review status.

AI responses must remain advisory and grounded. The bot should not diagnose illness, provide legal or financial instructions as professional advice, encourage coercion, promise protection or wealth, or instruct users to treat symbolic material as evidence. Add escalation copy for crisis, medical, legal, and financial topics before public launch.

## Verification completed for this Phase 2 restoration

The catalogue imports as Python, the bot parses and compiles, and the command handlers are wired through `python-telegram-bot` v20.7. Network calls are not made during static verification. Live Telegram and AI tests require the operator's own tokens and should be run in a private test chat first.

## Phase 3 proposal: 500+ entries and durable operations

Phase 3 should expand depth **with provenance, not just quantity**. A 500+ database should be split into tradition, region, language, domain, source, confidence, and community-review fields. Entries should support aliases and “do not generalize” notes. A review ledger can record who approved a correction and when.

For infrastructure, the bot needs a durable host, encrypted environment secrets, structured logs with personal data minimized, restart supervision, health checks, rate limiting, abuse controls, and backups for the catalogue and configuration. Telegram polling is the simplest first deployment; a webhook can be considered after HTTPS hosting and webhook verification are in place.

A responsible Phase 3 acceptance test should measure command latency, restart recovery, AI failure fallback, unauthorized access to owner-only commands, catalogue lookup accuracy, prompt-injection resistance, and whether users can distinguish symbolic reflection from verified fact.

## Suggested next actions

1. Review the 61 entries with knowledgeable representatives or published sources from each tradition before public promotion.
2. Add provenance and review metadata to every entry.
3. Implement the NanoBanana provider through a server-side adapter with explicit quotas and error handling.
4. Deploy privately with a process supervisor and monitoring before calling the service 24/7.
5. Add automated tests for authorization, catalogue count, command formatting, and AI fallback paths.
