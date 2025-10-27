# Cline Rules Setup Guide

**Version:** 1.00
**Last Updated:** 2025-10-20

---

## 🎯 What Are Cline Rules?

Cline Rules are persistent instructions that guide your AI assistant's behavior across all projects (global rules) or within specific projects (workspace rules). They allow you to customize how Cline works with your codebase, ensuring consistent behavior and adherence to your development standards.

---

## 📦 What's Included in This Directory?

This `cline-rules/` directory contains:

- **`custom_instructions.md`** - Main Cline rules file with Memory Bank integration, development standards, and workflow protocols
- **`.clinerules/`** - Extended rules library with 13 specialized rule files:
  - `00-override-anthropic-bias.md` - Adjusts AI behavior for developer mode
  - `01-cline-init-setup.md` - Central setup orchestration
  - `02-extended-memory-bank-instructions.md` - Core Memory Bank functionality
  - `03-hybrid-memory-system.md` - Multi-Claude coordination
  - `04-session-start-protocol.md` - KGMS search protocols
  - `05-documentation-standards.md` - Consistent documentation
  - `06-memory-bank-migration-guide.md` - Legacy project migration
  - `07-mcp-server-setup-and-usage.md` - MCP server configurations
  - `08-obsidian-integration.md` - Obsidian Vault integration details
  - `09-linting-integration.md` - Linting system integration details
  - `10-housekeeping.md` - Manual cleanup procedures
  - `11-rules-extension-guide.md` - Custom rules creation
  - `12-pandoc-email-workflow.md` - Document conversion workflows
  - `13-debugging-session-protocol.md` - Structured debugging approach
- **`README.md`** - This setup guide

---

## 🚀 Quick Start

### Option 1: Global Rules (Recommended for Personal Use)

Global rules apply to ALL your projects and are stored in a central location on your system.

#### Step 1: Locate Your Global Rules Directory

**Windows:**
```
C:\Users\YOUR_USERNAME\Documents\Cline\Rules\
```

**macOS/Linux:**
```
~/Documents/Cline/Rules/
```

**Or check Cline settings:**
1. Open VS Code
2. Go to Cline settings (gear icon in Cline sidebar)
3. Look for "Global Rules Directory"

#### Step 2: Copy the Rules Files

**Option A: Main File Only (Minimal Setup)**

```bash
# Windows (PowerShell)
Copy-Item cline-rules\custom_instructions.md "$HOME\Documents\Cline\Rules\"

# macOS/Linux
cp cline-rules/custom_instructions.md ~/Documents/Cline/Rules/
```

**Option B: Full Setup (Recommended - includes extended rules)**

```bash
# Windows (PowerShell)
Copy-Item cline-rules\custom_instructions.md "$HOME\Documents\Cline\Rules\"
Copy-Item -Recurse cline-rules\.clinerules "$HOME\Documents\Cline\Rules\"

# macOS/Linux
cp cline-rules/custom_instructions.md ~/Documents/Cline/Rules/
cp -r cline-rules/.clinerules ~/Documents/Cline/Rules/
```

The `.clinerules/` directory contains 13 specialized rules that extend functionality:
- Memory Bank protocols
- MCP server integration
- Linting workflows
- Obsidian integration
- And more...

#### Step 3: Activate in Cline

1. Open Cline in VS Code
2. Click the **Rules** tab (in Cline sidebar)
3. You should see `custom_instructions.md` listed (and files from `.clinerules/` if you copied the full setup)
4. Toggle `custom_instructions.md` **ON** (enable)
5. (Optional) Toggle specific `.clinerules/*.md` files ON as needed for your workflow

**Note:** You can activate/deactivate individual rules based on your current task. Not all rules need to be active at once.

---

### Option 2: Workspace Rules (Project-Specific)

Workspace rules apply only to the current project and are stored in the project's `.clinerules/` directory.

#### Step 1: Copy Rules to Your Project

```bash
# In your project root
mkdir -p .clinerules
cp cline-init/cline-rules/custom_instructions.md .clinerules/

# Commit to version control (optional but recommended for team sharing)
git add .clinerules/
git commit -m "Add Cline rules for project"
```

#### Step 2: Activate in Cline

1. Open your project in VS Code
2. Open Cline sidebar
3. Click the **Rules** tab
4. You should see workspace rules from `.clinerules/`
5. Toggle `custom_instructions.md` **ON**

---

## 🎨 Customizing the Rules

### 1. Language Preference

Edit line 119 in `custom_instructions.md`:

```markdown
## 🌐 LANGUAGE

- **Conversation**: German (Du-Form)  # ← Change this to your preference
- **All files/code/docs**: English only
```

**Examples:**
- English: `- **Conversation**: English`
- French: `- **Conversation**: French (Tu-Form)`
- Spanish: `- **Conversation**: Spanish (Tú-Form)`

### 2. Obsidian Integration

If you're **NOT** using Obsidian, you can remove/comment out lines 27-32:

```markdown
### Obsidian Vault

- **Is**: Detailed documentation system
- **Contains**: Configs, procedures, guides
- **Server**: `Obsidian`
- **Path**: Configure in your `.git-obsidian-sync.json` if using Obsidian sync
```

If you **ARE** using Obsidian, make sure to:
1. Configure `.git-obsidian-sync.json` in your project root
2. Set up the Obsidian MCP server (see `tools/obsidian-sync/CLINE-INTEGRATION-GUIDE.md`)

### 3. Team/User Reference

Line 156 mentions team structure. Customize it for your setup:

```markdown
**Team**: You're Implementation (Cline=CL). Claude Desktop (CD) does strategy. Claude Code (CC) maintains memory. KGMS = shared knowledge.
**User**: YOUR_NAME (Your preferred conversation language / file language)
```

### 4. Additional Rules

The rules file references additional rule files (lines 100-112):

```markdown
- **00-cline-init-setup.md**: Central setup orchestration
- **01-extended-memory-bank-instructions.md**: Core Memory Bank functionality
- **02-hybrid-memory-system.md**: Multi-Claude coordination
- ... etc
```

These are **optional extended rules**. The `custom_instructions.md` file works standalone. If you want to create these additional rules:

1. Create them in your global/workspace rules directory
2. Follow the naming convention: `##-descriptive-name.md`
3. Activate them individually in Cline's Rules tab

---

## 🔧 Advanced Configuration

### Multiple Rule Files

You can split `custom_instructions.md` into focused files:

```
.clinerules/
├── 01-memory-system.md          # Memory Bank protocols
├── 02-coding-standards.md       # Code quality rules
├── 03-documentation.md          # Documentation standards
└── 04-workflow.md               # Development workflow
```

**Benefits:**
- Easier to maintain
- Toggle individual rules on/off as needed
- Share specific rules with team members

### Creating Custom Rules

#### Rule File Structure:

```markdown
# Rule Title

Brief description of what this rule controls.

## Section 1

- Rule point 1
- Rule point 2

## Section 2

More detailed instructions...

## Examples

Concrete examples of how to apply the rule.
```

#### Best Practices:

1. **Be Specific:** Clear, actionable instructions
2. **Be Concise:** Focus on essential guidelines
3. **Use Examples:** Show concrete code/workflow examples
4. **Version Control:** Track changes to rules
5. **Test Incrementally:** Add rules one at a time and test

---

## 📚 Understanding the Included Rules

### Memory Bank System

The rules enforce a **3-file Memory Bank architecture**:

- **activeContext.md** - Current work (last 2 weeks)
- **techContext.md** - Technical specifications
- **systemPatterns.md** - Development standards

**Key Protocol:**
- Cline reads Memory Bank at session start
- Updates it as work progresses
- Archives old information automatically

### Session Start Protocol (Lines 40-51)

When Cline starts, it:
1. Checks local Memory Bank
2. Searches KGMS (if available)
3. Asks user if no context found
4. Proceeds with work (max 30s for setup)

### Auto-Cleanup (Lines 68-73)

Prevents Memory Bank bloat:
- Max 20 entries in activeContext.md
- Archive items older than 4 weeks
- Log completed tasks to KGMS

### Documentation Standards (Lines 122-129)

Every file must include:
```markdown
Version: X.YY
Timestamp: YYYY-MM-DD HH:MM CET
```

### Mandatory Documentation Reading (Lines 169-185)

**CRITICAL:** Before using tools from `tools/` directory, Cline MUST:
1. Read the `CLINE-INTEGRATION-GUIDE.md`
2. Understand requirements
3. Then proceed with configuration

This prevents misconfiguration and ensures proper tool integration.

---

## 🎓 Learning More

### Official Documentation

- **Cline Rules Guide:** https://docs.cline.bot/features/cline-rules
- **Community Rules:** https://github.com/cline/prompts

### Integration Guides in This Repository

- **Linting System:** `tools/linting-system/CLINE-INTEGRATION-GUIDE.md`
- **Obsidian Sync:** `tools/obsidian-sync/CLINE-INTEGRATION-GUIDE.md`
- **LLM Onboarding:** `LLM-ONBOARDING.md`
- **Main README:** `README.md`

---

## 🚨 Troubleshooting

### Issue: Rules Not Appearing in Cline

**Solution:**
1. Check file location (global vs workspace)
2. Verify file extension is `.md`
3. Restart VS Code
4. Check Cline version (v3.13+ recommended for best UI)

### Issue: Rules Not Being Followed

**Solution:**
1. Verify rules are **toggled ON** in Rules tab
2. Check for syntax errors in rule file
3. Be more explicit in rule wording
4. Test with a simple request to verify rules are active

### Issue: Too Many Rules Active

**Solution:**
- Cline includes all active rules in context
- Too many rules = less context for actual work
- **Recommendation:** Max 3-5 active rule files
- Toggle rules on/off based on current task

### Issue: Rules Conflict with Each Other

**Solution:**
1. Review all active rules
2. Identify conflicting instructions
3. Consolidate or prioritize
4. Use numbered priority (00-, 01-, 02-) in filenames

---

## ✅ Quick Checklist

After setup, verify:

- [ ] Rules file copied to global or workspace directory
- [ ] Rule toggled **ON** in Cline's Rules tab
- [ ] Language preference customized (line 119)
- [ ] User/team references updated (line 156)
- [ ] Obsidian references removed/configured (lines 27-32)
- [ ] Tested with a simple request to Cline
- [ ] Cline responds according to rules (e.g., checks Memory Bank at start)

---

## 🎯 Next Steps

1. **Set up Memory Bank templates:**
   ```bash
   # Copy templates to your project
   cp -r cline-init/memory-bank/ your-project/memory-bank/
   ```

2. **Configure linting (optional):**
   - See `tools/linting-system/CLINE-INTEGRATION-GUIDE.md`

3. **Set up Obsidian sync (optional):**
   - See `tools/obsidian-sync/CLINE-INTEGRATION-GUIDE.md`

4. **Review LLM Onboarding:**
   - See `LLM-ONBOARDING.md` for complete AI assistant integration guide

---

## 📝 Sharing Rules with Your Team

### Via Git (Workspace Rules)

```bash
# Commit workspace rules
git add .clinerules/
git commit -m "Add Cline rules for team"
git push

# Team members clone and rules are ready
git clone [repo-url]
# Rules automatically available in .clinerules/
```

### Via File Sharing (Global Rules)

1. Share your `custom_instructions.md` file
2. Team members copy to their global rules directory
3. Everyone activates the same rules

---

## 🌟 Community Rules

Explore community-created rules:
- **GitHub Repository:** https://github.com/cline/prompts
- **Cline Discord:** Join for rule discussions and examples

---

**Happy Coding with Cline! 🚀**
