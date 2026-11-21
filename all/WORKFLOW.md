# Notion → Git workflow

Scheduled automation, not a GitHub Action and not a deploy.

| Field | Value |
| --- | --- |
| Name | notion-to-git-flow |
| Automation id | `269b428a-2932-4232-8da7-451ae1dc5555` |
| Cadence | Mondays 09:00 Africa/Lagos |
| Next run observed at creation | 2026-11-16T08:00:00Z |
| Notion source | https://app.notion.com/p/41949ca435a281398db3df67e702f876 |
| Git target | branch `flow/notion-github-singularity` only |
| Files it may update | `all/MEANING.md`, `all/INDEX.md` |

Rules: no push to `main`, no Notion page moves or deletes, no secrets, no commit when the meaning did not change. A run that finds no material change reports `NOT_EXECUTED`. Coverage stays PARTIAL unless a full crawl actually happened.

This file does not prove the next run succeeded.
