# BTRIX Knowledge Brain 🧠

**Version:** 1.0.0  
**Status:** Production  
**Purpose:** Single Source of Truth for all BTRIX operations

---

## Overview

The **BTRIX Knowledge Brain** is the central repository of all knowledge, specifications, pricing, and operational guidelines for the BTRIX AI-powered business operating system.

This repository serves as the **Single Source of Truth** for:

- **Bot systems** (WhatsApp, website chatbot)
- **AI Agents** (Sales, Marketing, Finance, etc.)
- **Support operations** (24/7 AI + human escalation)
- **Website content** (packs, agents, FAQ)
- **Sales and onboarding** (qualification, demos, proposals)

---

## Philosophy: Single Source of Truth

> **Rule:** Any information must live first in the Brain, and only then be distributed.

This ensures:
- ✅ Consistency across all channels
- ✅ No divergence between website, bot, and support
- ✅ Version control and audit trail
- ✅ Easy updates (change once, propagate everywhere)

---

## Repository Structure

```
btrix-brain/
├── core/                    # Core knowledge documents
│   ├── BTRIX_CORE.md       # Complete system overview
│   ├── BTRIX_PACKS.md      # Service packages & pricing
│   ├── BTRIX_AGENTS.md     # AI agents specifications
│   ├── BTRIX_FAQ.md        # Frequently asked questions
│   └── BTRIX_LIMITS.md     # What we DON'T do
├── changelog/               # Version history
│   └── CHANGELOG.md        # All changes log
├── scripts/                 # Automation scripts
│   ├── ingest_brain.py     # (Future) RAG indexing
│   └── validate_brain.py   # (Future) Consistency checks
└── README.md               # This file
```

---

## Core Documents

### 📘 [BTRIX_CORE.md](core/BTRIX_CORE.md)
Complete overview of what BTRIX is, how it works, philosophy, and operational principles.

**Use for:** Bot system prompts, onboarding, general understanding.

---

### 💰 [BTRIX_PACKS.md](core/BTRIX_PACKS.md)
Detailed specifications of all service packs (Essential, Pro, Enterprise), pricing, bundles, and comparison matrix.

**Use for:** Sales, proposals, website pricing pages, bot responses about pricing.

---

### 🤖 [BTRIX_AGENTS.md](core/BTRIX_AGENTS.md)
Complete specifications of all AI agents (Sales, Marketing, Finance, etc.), including functions, limitations, and pricing.

**Use for:** Agent configuration, website agent pages, bot responses about agents.

---

### ❓ [BTRIX_FAQ.md](core/BTRIX_FAQ.md)
Frequently asked questions covering general, pricing, technical, and business questions.

**Use for:** Support bot, website FAQ, customer onboarding.

---

### 🚫 [BTRIX_LIMITS.md](core/BTRIX_LIMITS.md)
Clear boundaries of what BTRIX does NOT do. Essential for filtering bad-fit clients and managing expectations.

**Use for:** Sales qualification, support boundaries, bot guardrails.

---

## Versioning

The Brain follows **semantic versioning**: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes (e.g., complete pricing overhaul)
- **MINOR:** New features or significant additions (e.g., new agent)
- **PATCH:** Small fixes or clarifications

**Current version:** 1.0.0

All changes are logged in [CHANGELOG.md](changelog/CHANGELOG.md).

---

## How to Use This Repository

### For Bot Developers

1. Use **BTRIX_CORE.md** as the base system prompt
2. Use **BTRIX_FAQ.md** for common questions
3. Use **BTRIX_LIMITS.md** to set guardrails
4. Use **BTRIX_PACKS.md** and **BTRIX_AGENTS.md** for pricing queries

### For Website Developers

1. Pull content from **BTRIX_PACKS.md** for pricing pages
2. Pull content from **BTRIX_AGENTS.md** for agent pages
3. Pull content from **BTRIX_FAQ.md** for FAQ section
4. Ensure website content stays in sync with the Brain

### For Sales & Support

1. Reference **BTRIX_PACKS.md** for proposals
2. Use **BTRIX_FAQ.md** to answer common questions
3. Use **BTRIX_LIMITS.md** to filter bad-fit clients
4. Always check the Brain before making promises

### For Operations

1. Use **BTRIX_CORE.md** for onboarding new team members
2. Use **BTRIX_LIMITS.md** to manage scope
3. Use **CHANGELOG.md** to track what changed

---

## Making Changes

### Process

1. **Create a branch** for your changes
2. **Edit the relevant document(s)**
3. **Update the version number** in the document header
4. **Add an entry to CHANGELOG.md**
5. **Create a Pull Request**
6. **Get approval** from the team
7. **Merge to main**

### Rules

- ✅ All changes require a PR (no direct commits to main)
- ✅ All changes must be logged in CHANGELOG.md
- ✅ Pricing changes require explicit approval
- ✅ Breaking changes require MAJOR version bump

---

## Future Enhancements

### Phase 2: RAG Integration

- **ingest_brain.py:** Automatically chunk documents and generate embeddings
- **Vector store:** Store embeddings in Supabase pgvector
- **Semantic search:** Enable bots to find relevant information quickly

### Phase 3: Validation

- **validate_brain.py:** Check for inconsistencies, duplicate pricing, broken links
- **CI/CD:** Automated validation on every PR

### Phase 4: Multi-language

- Translate core documents to Portuguese, Spanish, etc.
- Maintain language-specific versions

---

## Contributing

### Who Can Contribute?

- BTRIX team members
- Approved contractors
- External contributors (with approval)

### What to Contribute?

- ✅ Clarifications and improvements
- ✅ New FAQ entries
- ✅ Updated pricing (with approval)
- ✅ New agent specifications
- ❌ Breaking changes without discussion

---

## Contact

For questions about the Brain:

- **Internal:** Slack #btrix-brain
- **External:** WhatsApp +353 89 940 0960

---

## License

**Proprietary.** This repository contains confidential business information.

Do not share, distribute, or use outside of authorized BTRIX operations.

---

**Maintained by:** BTRIX Team  
**Last Updated:** 2025-01-02  
**Next Review:** 2025-04-01
