# Pluggy Agent Skills

Agent Skills to help developers integrate [Pluggy](https://pluggy.ai) Open Finance solutions using AI agents. Agent Skills are folders of instructions, scripts, and resources that agents like Claude Code, Cursor, GitHub Copilot, etc. can discover and use to implement Pluggy integrations more accurately and efficiently.

The skills in this repo follow the [Agent Skills](https://agentskills.io/) format.

## Installation

```bash
npx skills add pluggyai/agent-skills
```

## Available Skills

<details>
<summary><strong>pluggy-integration</strong></summary>

Core Pluggy integration patterns and best practices. Essential for any Pluggy implementation.

**Use when:**

- Setting up Pluggy SDK and authentication
- Implementing the Connect Widget
- Managing Item lifecycle (create, update, delete)
- Configuring webhooks for real-time updates
- Handling MFA and connection errors

**Categories covered:**

- Authentication & API Keys (Critical)
- Connect Widget Integration (Critical)
- Item Lifecycle Management (High)
- Webhook Configuration (High)
- Error Handling (Medium)

</details>

<details>
<summary><strong>pluggy-open-finance</strong></summary>

Best practices for Open Finance data retrieval and management.

**Use when:**

- Connecting user bank accounts
- Retrieving account balances and transactions
- Accessing investment portfolios
- Fetching loan and identity data
- Working with Open Finance connectors

**Categories covered:**

- Connector Selection (Critical)
- Data Retrieval Patterns (High)
- Transaction Handling (High)
- Account Management (Medium)
- Data Synchronization (Medium)

</details>

<details>
<summary><strong>pluggy-payments</strong></summary>

Payment initiation with PIX, Boleto, and Smart Transfers.

**Use when:**

- Initiating PIX payments
- Creating Boleto payment slips
- Setting up Smart Transfers with preauthorization
- Managing payment intents and lifecycle
- Handling scheduled payments

**Categories covered:**

- PIX Integration (Critical)
- Smart Transfers (High)
- Payment Intent Lifecycle (High)
- Boleto Management (Medium)
- Scheduled Payments (Medium)

</details>

<details>
<summary><strong>pluggy-doctor</strong></summary>

Code-reviews an existing Pluggy integration against Pluggy's official documentation (queried in real time via the Pluggy MCP) and returns a diagnostic report (✅/❌/⚠️) with file, line, and a paste-ready fix for each issue.

**Use when:**

- Reviewing or diagnosing an existing Pluggy integration before going live
- Asking "is this ready for production?" / "tá tudo certo pra ir pra produção?"
- Validating credential security, connect tokens, and webhook handling
- Checking whether webhooks, health checks, and environments follow the docs

**Areas covered:**

- Credential security
- Connect Token & clientUserId
- Webhooks configuration & correct handling
- Health check (no polling)
- Individual processing (no batch)
- Environment (sandbox vs production)

> Output is delivered in Brazilian Portuguese (PT-BR).

</details>

## Usage

Skills are automatically available once installed. The agent will use them when relevant tasks are detected.

**Examples:**

```
Help me integrate Pluggy Connect Widget in my React app
```

```
Set up webhooks to sync transaction data
```

```
Implement PIX payment initiation
```

## Skill Structure

Each skill contains:

- `SKILL.md` - Instructions for the agent
- `AGENTS.md` - Compiled rules document (generated)
- `rules/` - Individual rule files
- `metadata.json` - Version and metadata

## Resources

- [Pluggy Documentation](https://docs.pluggy.ai)
- [Pluggy API Reference](https://docs.pluggy.ai/reference)
- [pluggy-js SDK](https://github.com/pluggyai/pluggy-js)
- [Pluggy Dashboard](https://dashboard.pluggy.ai)

## License

MIT
