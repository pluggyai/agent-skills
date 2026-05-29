---
title: AI Skills
slug: ai-skills
excerpt: Official Pluggy Agent Skills that help AI coding agents build, review, and ship Pluggy integrations more accurately.
---

# Pluggy AI Skills

**Agent Skills** are folders of instructions, best practices, and resources that AI coding agents — like Claude Code, Cursor, and GitHub Copilot — can discover and load on demand. Pluggy maintains a set of official skills so that, when you ask your agent to build or review a Pluggy integration, it follows Pluggy's documented patterns instead of guessing.

The skills follow the open [Agent Skills](https://agentskills.io/) format and are open source at [`pluggyai/agent-skills`](https://github.com/pluggyai/agent-skills).

> 📘 **Skills vs. MCP**
>
> The **[MCP Server](https://docs.pluggy.ai/docs/mcp)** gives an agent live access to Pluggy's documentation and API reference at runtime. **Skills** give the agent the know-how — the patterns, do's, and don'ts — for using Pluggy correctly. They're independent: skills work on their own, with no MCP required. They also work great together — Pluggy Doctor, for example, validates against the docs through the MCP when it's connected (and falls back to the public web docs when it isn't).

## Installation

Install all Pluggy skills into your project with a single command:

```bash
npx skills add pluggyai/agent-skills
```

Once installed, the skills are available automatically. Your agent loads the relevant one whenever it detects a matching task — you don't need to invoke them by hand. **No MCP is required** — the skills are self-contained.

> 💡 **Optional, recommended for Pluggy Doctor:** connect the Pluggy Docs MCP so the reviewer validates against the live docs. If you skip this, Pluggy Doctor falls back to the public docs over the web.
>
> ```bash
> claude mcp add --transport http pluggy-docs https://docs.pluggy.ai/mcp
> ```

## Available skills

| Skill | What it does | Use it to… |
| ----- | ------------ | ---------- |
| [`pluggy-integration`](#pluggy-integration) | Core integration patterns | Build authentication, the Connect Widget, Items, and webhooks |
| [`pluggy-open-finance`](#pluggy-open-finance) | Open Finance data retrieval | Fetch accounts, transactions, investments, loans, and identity |
| [`pluggy-payments`](#pluggy-payments) | Payment initiation | Implement PIX, Boleto, and Smart Transfers |
| [`pluggy-doctor`](#pluggy-doctor) | Integration code review | Diagnose an existing integration before going to production |

---

## pluggy-integration

Core Pluggy integration patterns and best practices — the foundation for any implementation.

**Use when you're:**

- Setting up the Pluggy SDK and authentication
- Implementing the Connect Widget in a frontend app
- Creating, updating, or deleting Items (connections)
- Configuring webhooks for real-time data sync
- Handling MFA flows and connection errors

**Areas covered:**

| Category | Impact |
| -------- | ------ |
| Authentication & API Keys | Critical |
| Connect Widget Integration | Critical |
| Webhook Configuration | Critical |
| Item Lifecycle Management | High |
| Error Handling | Medium |

**Example prompts:**

```
Help me integrate the Pluggy Connect Widget in my React app
Set up webhooks to sync transaction data
How should I handle MFA when an Item is WAITING_USER_INPUT?
```

---

## pluggy-open-finance

Best practices for retrieving and managing Open Finance data through Pluggy.

**Use when you're:**

- Selecting the right connector for a financial institution
- Retrieving account balances and details
- Fetching and processing transactions
- Accessing investment portfolios, loans, or identity data
- Designing a data synchronization strategy

**Areas covered:**

| Category | Impact |
| -------- | ------ |
| Connector Selection | Critical |
| Data Synchronization | High |
| Data Retrieval & Pagination | High |
| Transaction Handling & Enrichment | High |
| Account Management | Medium |

**Example prompts:**

```
Fetch and store transactions with pagination for an Item
Enrich transactions with categories
What's the right sync strategy after an item/updated webhook?
```

---

## pluggy-payments

Payment initiation with PIX, Boleto, and Smart Transfers.

**Use when you're:**

- Initiating PIX payments
- Creating and managing Boletos
- Setting up Smart Transfers with preauthorization
- Managing the payment intent lifecycle
- Handling scheduled payments (PIX Agendado)

**Areas covered:**

| Category | Impact |
| -------- | ------ |
| PIX Integration | Critical |
| Smart Transfers | High |
| Payment Intent Lifecycle | High |
| Boleto Management | Medium |
| Scheduled Payments | Medium |

**Example prompts:**

```
Implement PIX payment initiation end to end
Set up a Smart Transfer with preauthorization
Track payment status with webhooks
```

---

## pluggy-doctor

A reviewer skill that **code-reviews an existing Pluggy integration** and tells you whether it's ready for production. Unlike the other skills (which help you *build*), Pluggy Doctor *evaluates* code you already wrote.

It diagnoses against Pluggy's **official documentation** — never from memory or a frozen checklist — and returns a structured report with a fix for each issue. It reads the docs through the [Pluggy MCP](https://docs.pluggy.ai/docs/mcp) when it's connected, and **falls back to reading the same public docs over the web** (`docs.pluggy.ai`) when it isn't — so **the skill works with or without the MCP**. If it can't confirm a criterion against the docs, it marks it "not verified" instead of guessing.

**Use when you:**

- Want to review or validate an existing integration
- Ask "is this ready for production?"
- Want to check credential security, connect tokens, or webhook handling
- Upload integration files (webhook handler, connect-token generation, config) for diagnosis

**Areas covered:**

- Credential security (`clientId`/`clientSecret` on the backend only)
- Connect Token & `clientUserId`
- Webhooks — configuration
- Webhooks — correct handling (item status, `PARTIAL_SUCCESS`, two-way sync)
- Sync strategy — rely on auto-sync, no self-driven updates
- Environment (sandbox vs. production)

**What you get back:** a per-area report classifying each item as ✅ correct, ❌ problem (with file, line, and a paste-ready fix), ⚠️ heads-up, or ➖ not applicable — closing with a clear 🟢 production-ready or 🔴 not-yet verdict.

> 📘 The diagnostic report mirrors the dev's language.

**Example prompts:**

```
Review my Pluggy integration before I ship it
Check my webhook handler — is it correct?
Is this integration secure and production-ready?
Analisa minha integração da Pluggy
```

---

## Supported agents

The skills use Claude Code tool naming but work with any agent that supports the Agent Skills format, including:

- **Claude Code**
- **Cursor**
- **GitHub Copilot**

## Resources

- [Agent Skills repository (`pluggyai/agent-skills`)](https://github.com/pluggyai/agent-skills)
- [Pluggy MCP Server](https://docs.pluggy.ai/docs/mcp)
- [Pluggy Documentation](https://docs.pluggy.ai)
- [API Reference](https://docs.pluggy.ai/reference)
- [pluggy-js SDK](https://github.com/pluggyai/pluggy-js)
