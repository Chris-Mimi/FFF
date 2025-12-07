# Git: Local Commit vs Push (Reference)
Cmd+Shift+V to see preview

## How it works

1. **Working File**
   - Your actual file lives in the project folder:
     ```
     components/athlete/AthleteWorkoutsTab.tsx
     ```
   - You can open, edit, move, or delete it — Git will track changes.

2. **Local Git Commit**
   - When you run:
     ```bash
     git add <file>
     git commit -m "message"
     ```
   - Git stores a **snapshot** of your file **inside the hidden `.git/` folder**.
   - Your working file **does not move**; it stays where it is.
   - This commit is **local only**, safe on your computer.

3. **Push to GitHub (or remote)**
   - When you run:
     ```bash
     git push origin <branch>
     ```
   - Git sends your local commits to the **remote repository**, making them visible online and available to others.

---

## Visual Diagram

Your Project Folder
└── components/athlete/AthleteWorkoutsTab.tsx <-- Working file

Git Local Repository (.git/)
└── objects/... <-- Snapshot of file stored here after commit

Remote (GitHub)
└── origin/augment-refactor
└── AthleteWorkoutsTab.tsx <-- File appears here after push


**Summary:**
- **Commit = save snapshot locally in `.git/`**
- **Push = send snapshot to remote repository**
- Moving files in your project is safe; Git tracks changes in `.git`.
