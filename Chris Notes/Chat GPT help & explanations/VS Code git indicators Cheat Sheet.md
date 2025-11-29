# VS Code Git Indicators Cheat Sheet 📝

## 1. Colored Gutter Bars 🎨
- 🟢 **Green bar**: New lines added.
- 🔵 **Blue bar**: Lines modified.
- 🔴 **Red bar**: Lines deleted.
- 🟠 **Yellow/Orange bar**: Lines staged for commit (depends on theme).

> Shows changes line by line compared to the last Git commit.

---

## 2. Numbers on the Right 🔢
- Number (e.g., `2`) = count of **lines changed** in the file since last commit.
- ➕ Adding lines → number increases.
- ✏️ Modifying lines → number increases.
- ✅ Disappears after **staging and committing** the file.

---

## 3. File Icon in Explorer 📂
- ❌ **U (Untracked)**: File exists but Git is not tracking it.
- ✏️ **M (Modified)**: Tracked file with uncommitted changes.
- ➕ **A (Added)**: File staged for commit.
- 🗑️ **D (Deleted)**: File staged for deletion.

---

## 4. Source Control Panel (Cmd+Shift+G / Ctrl+Shift+G) 🖥️
- Shows all changed files in the project.
- You can:
  - ➕ Stage files
  - ➖ Unstage files
  - 📝 Commit staged files
  - 🔍 See diffs for each file

---

## 5. Quick Workflow for New Files from Augment ⚡
1. Create the file and paste code → **green bar & number appear**.
2. Stage the file:
```bash
git add <file>
