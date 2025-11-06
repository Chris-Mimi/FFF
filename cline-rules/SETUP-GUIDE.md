# Cline Rules Setup Guide

**Last Updated:** 2025-11-06

**Note:** This is documentation only. The actual working rules file is `cline-rules.md`.

---

## 🎯 What Are Cline Rules?

Cline Rules are persistent instructions that guide your AI assistant's behavior. They allow you to customize how Cline works with your codebase, ensuring consistent behavior and adherence to your development standards.

---

## 📦 Current Setup

This project uses a **single rules file**:

- **`cline-rules.md`** - Main Cline rules with:
  - Memory Bank integration protocols
  - Development workflow standards
  - Forbidden actions (git operations, documentation editing)
  - Session start protocols
  - Task completion requirements

---

## 🚀 How It Works

### Activation

Cline automatically reads `cline-rules/cline-rules.md` when working in this project (workspace rules).

**To verify it's active:**
1. Open Cline in VS Code
2. Click the **Rules** tab (in Cline sidebar)
3. You should see `cline-rules.md` listed
4. Ensure it's **toggled ON**

### What It Does

- Enforces Memory Bank system (reads `memory-bank/*.md` files at session start)
- Prevents Cline from running git commands (Claude Code handles commits)
- Prevents Cline from editing documentation/protocol files
- Ensures consistent communication style
- Manages context usage thresholds

---

## 🎨 Customizing the Rules

### 1. Edit Language Preference

Find this section in `cline-rules.md`:

```markdown
## 🌐 LANGUAGE

- **Conversation**: English
- **All files/code/docs**: English only
```

Change to your preference (e.g., German, French, Spanish).

### 2. Modify Forbidden Files List

If you add new documentation files that Cline should never edit, add them to the `FORBIDDEN ACTIONS` section:

```markdown
**YOU MUST NEVER edit these files:**
- ❌ `memory-bank/memory-bank-activeContext.md`
- ❌ `your-new-doc.md`  # Add here
```

### 3. Adjust Context Thresholds

Current triggers at 50%, 60%, 70%, 80% context usage. Modify if needed in the `TRIGGERS` section.

---

## 📚 Understanding the Memory Bank System

The rules enforce a **3-file Memory Bank architecture**:

- **memory-bank-activeContext.md** - Current work (last 2 weeks)
- **memory-bank-techContext.md** - Technical specifications
- **memory-bank-systemPatterns.md** - Development standards

**Key Protocol:**
- Cline reads Memory Bank at session start (30s max)
- Updates as work progresses
- Archives old information to `project-history/`

**Auto-Cleanup:**
- Max 2 weeks in activeContext
- Archive items older than 4 weeks
- Completed tasks → project-history/

---

## 🔮 Future Enhancements

### Obsidian Integration (Optional)

Obsidian is a knowledge management tool that can integrate with your development workflow:

**Potential Benefits:**
- Centralized documentation system
- Linked notes for project knowledge
- Visual graph of project relationships
- Sync documentation across tools

**How to Set Up (if you choose to explore):**
1. Install Obsidian (https://obsidian.md)
2. Create vault for project documentation
3. Configure MCP server for Cline-Obsidian sync
4. Add Obsidian references to Memory Bank system

**Resources:**
- Obsidian official docs: https://help.obsidian.md
- MCP (Model Context Protocol) servers: https://modelcontextprotocol.io

### Multiple Rule Files

You can split `cline-rules.md` into focused files:

```
cline-rules/
├── 01-memory-system.md          # Memory Bank protocols
├── 02-coding-standards.md       # Code quality rules
├── 03-documentation.md          # Documentation standards
└── 04-workflow.md               # Development workflow
```

**Benefits:**
- Easier to maintain
- Toggle individual rules on/off as needed
- Share specific rules with team members

**How:**
1. Create new `.md` files in `cline-rules/`
2. Move relevant sections from `cline-rules.md`
3. Use numbered prefixes for priority order
4. Activate individually in Cline's Rules tab

---

## 🚨 Troubleshooting

### Issue: Rules Not Being Followed

**Solution:**
1. Verify rule is **toggled ON** in Cline's Rules tab
2. Check for syntax errors in rule file
3. Restart VS Code
4. Test with simple request to verify rules are active

### Issue: Cline Still Tries to Commit

**Solution:**
- Check that `FORBIDDEN ACTIONS` section exists in `cline-rules.md`
- Verify section includes git operations
- Rule must be active in Rules tab
- May need to explicitly remind Cline: "Do not commit"

### Issue: Too Much Context Usage

**Solution:**
- Cline includes all active rules in context
- Current single file is optimized (~7.5KB)
- If adding multiple files, max 3-5 recommended
- Use Task agents for complex operations (reduces context)

---

## 🎓 Learning More

### Official Documentation

- **Cline Documentation:** https://docs.cline.bot
- **Cline Rules Guide:** https://docs.cline.bot/features/cline-rules
- **Community Rules:** https://github.com/cline/prompts

### Project Documentation

- **CLAUDE.md** - Instructions for Claude Code (meta-level protocols)
- **memory-bank/workflow-protocols.md** - Agent delegation and efficiency rules
- **memory-bank/memory-bank-activeContext.md** - Current project status

---

## ✅ Quick Checklist

When making changes:

- [ ] Rule modifications saved to `cline-rules.md`
- [ ] Rule still toggled **ON** in Cline's Rules tab
- [ ] Tested with a simple request to verify changes work
- [ ] Committed to git if changes should be shared/preserved

---

## 📝 Sharing with Team

Since this is a workspace rule (project-specific), it's already in git:

```bash
# Team members automatically get rules when they clone
git clone [repo-url]
# Rules ready in cline-rules/cline-rules.md
```

Team members just need to:
1. Open project in VS Code
2. Verify rule is active in Cline's Rules tab
3. Start working

---

**Remember:** This file (SETUP-GUIDE.md) is just documentation. The actual rules Cline follows are in `cline-rules.md`.
