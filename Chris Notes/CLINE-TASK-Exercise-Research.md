# Cline Task: Exercise Data Enhancement via Research

**Task:** Research and enhance exercise data for the exercises by adding specific muscle details, descriptions, and tags.

**Source File:** `database\testing-area\exercises-backup-2025-11-23.md`
**Output File:** `database\testing-area\exercises-[Category Name] 2025-11-24.md` (Markdown format for easy review)

---

## CRITICAL: What to Skip

**DO NOT process these exercises:**

1. **Subcategory: "Team, Partner & Games"** - Skip ALL exercises with this subcategory (custom names created by gym owner)
2. **Custom/unclear names** - If exercise name doesn't return clear Google results, skip it
3. **Proprietary gym terminology** - Names that seem gym-specific or made-up

**For skipped exercises:**
- Include in MD with original data
- Add note: `⚠️ NEEDS MANUAL REVIEW` after exercise name

---

## Research Methodology

### For Each Researchable Exercise:

**Step 1: Evaluate if researchable**
- ✅ YES: Standard exercise names (Box Jump, Peterson Step Up, Burpee, Pull-Up)
- ❌ NO: Custom names, team exercises, unclear terms

**Step 2: Google Search**
- Search query: `"[exercise name]" muscles used`
- Example: `"ATG Peterson Step Up" muscles used`

**Step 3: Extract Information**

From search results, extract:

a) **Specific muscles used** (be precise, not generic):
   - ✅ Good: "quadriceps", "VMO", "glutes", "hamstrings", "calves", "core"
   - ❌ Bad: "legs", "lower body"

b) **Brief description** (1-3 sentences):
   - Focus on muscles engaged
   - Include movement pattern info if available
   - Keep concise and factual

**Step 4: Determine appropriate tags**

Add tags based on:
- **Movement type:** mobility, explosive, plyometric, isometric, power, dynamic
- **Context:** warm-up, metcon, skill-work, strength-building
- **Equipment:** bodyweight, barbell, dumbbell, kettlebell, box, rings
- **Attributes:** unilateral, bilateral, compound, isolation, full-body
- **Difficulty:** beginner-friendly, intermediate, advanced
- **Function:** stability, balance, coordination, endurance, cardio

**Keep existing good tags**, add new relevant ones, remove vague ones like just "strength"

---

## Update Rules

### body_parts Array
- Replace with specific muscles from research
- Use anatomical terms in lowercase
- Examples: "quadriceps", "glutes", "hamstrings", "VMO", "gastrocnemius", "soleus", "core", "pectorals", "deltoids"

### description Field
- Write 1-3 sentences based on research findings
- Format: "[Primary muscles] are engaged. [Secondary muscles] provide [function]. [Additional context]."
- Example: "Targets VMO (tear-drop muscle) for knee stability and patellar tracking. Engages glutes and hamstrings for hip extension, calves for ankle stability, core for balance in unilateral movement."

### tags Array
- Keep existing functional tags (mobility, warm-up, plyometric)
- Remove vague tags (just "strength" without context)
- Add 3-8 descriptive tags based on research
- Use lowercase for consistency

### Fields to NEVER change:
- name
- display_name
- category
- subcategory
- equipment (only update if research reveals equipment needed)
- difficulty (unless research suggests otherwise)
- is_warmup
- is_stretch
- video_url

---

## Quality Standards

1. **Specificity:** Use precise muscle names, not generic terms
2. **Consistency:** Use same terminology across similar exercises
3. **Completeness:** All three fields (body_parts, description, tags) should be enhanced
4. **Accuracy:** If unsure from Google results, skip the exercise
5. **Brevity:** Descriptions should be 1-3 sentences max

---

## Markdown Output Format

**Structure:**
```markdown
# Exercise Library - Enhanced with Research

**Total Exercises:** 447
**Researched:** [count]
**Skipped for Manual Review:** [count]
**Last Updated:** [date]

---

## 1. [Category Name] (X exercises)

### Subcategory: [Subcategory Name] (X exercises)

#### **Exercise Name**
- **Body Parts:** muscle1, muscle2, muscle3
- **Tags:** tag1, tag2, tag3
- **Description:** [1-3 sentence description from research]

#### **Next Exercise**
...
```

---

## Examples

### Example 1: Good Research Result (in MD)

**Before (from JSON):**
- ATG Peterson Step Up
- body_parts: ["legs"]
- tags: ["strength", "warm-up"]
- description: null

**After (in MD output):**
```markdown
#### **ATG Peterson Step Up**
- **Body Parts:** quadriceps, VMO, glutes, hamstrings, calves, core
- **Tags:** mobility, warm-up, unilateral, knee-stability, hip-extension, balance
- **Description:** Targets VMO (tear-drop muscle) for knee stability and patellar tracking. Engages glutes and hamstrings for hip extension, calves for ankle stability, core for balance in unilateral movement.
```

### Example 2: Skip - Team Exercise (in MD)

**After (in MD output):**
```markdown
#### **Team: WB Bunny Hop Throw & Catch** ⚠️ NEEDS MANUAL REVIEW
- **Body Parts:** [original data if any]
- **Tags:** team
- **Description:** [Custom exercise - requires manual entry]
```

### Example 3: Standard Exercise (in MD)

**After (in MD output):**
```markdown
#### **Box Jump**
- **Body Parts:** quadriceps, glutes, hamstrings, calves, hip-flexors, core
- **Tags:** plyometric, explosive, power, cardio, lower-body, jump-training
- **Description:** Explosive lower-body movement targeting quadriceps, glutes, and hamstrings for power generation. Hip flexors drive knee lift, calves provide push-off force, and core stabilizes landing.
```

---

## Processing Instructions

1. **Read entire file:** `database\testing-area\exercises-backup-2025-11-23.md`

2. **Process each exercise by Category:**
   - Check if should skip (Team/Partner/Games subcategory or unclear name)
   - If skip: Include with `⚠️ NEEDS MANUAL REVIEW` flag and original data
   - If process: Research → Extract → Write enhanced MD entry
   - Stop after each category and create a file for each

3. **Write output:** `database\testing-area\exercises-[Category Name] 2025-11-24.md`
   - Follow the markdown structure shown in examples
   - Complete each of the 8 categories (in workout flow order):
     1. Warm-up & Mobility
     2. Olympic Lifting & Barbell Movements
     3. Compound Exercises
     4. Gymnastics & Bodyweight
     5. Core, Abs & Isometric Holds
     6. Cardio & Conditioning
     7. Specialty
     8. Recovery & Stretching
   - Within each category: Group by subcategory (alphabetically)
   - Within each subcategory: List exercises alphabetically by display_name

4. **Include summary at top:**
   - Total exercises in Category [Category name]: 50
   - Researched: [count]
   - Skipped: [count]
   - Breakdown by category

---

## Expected Results

**Coverage:**
- ~350-400 exercises researched (80-90%)
- ~50-150 exercises skipped for manual review

**Output file:**
- `database\testing-area\exercises-[Category Name] 2025-11-24.md` - Complete markdown document with all exercises from the original file in separate markdown category files
  - Researched exercises have enhanced body_parts, descriptions, and tags
  - Skipped exercises marked with ⚠️ and original data shown

---

## Final Checks

Before completing:
- ✅ All 540 exercises present in MD output (none lost)
- ✅ All "Team, Partner & Games" exercises marked with ⚠️ NEEDS MANUAL REVIEW
- ✅ No generic terms like "legs" or "upper body" in body_parts for researched exercises
- ✅ All descriptions are 1-3 sentences for researched exercises
- ✅ Tags are descriptive and specific for researched exercises
- ✅ Markdown is properly formatted and readable
- ✅ Categories follow workout flow order (Warm-up first, Recovery last)

---

## Notes

- **Quality over speed:** If Google results are unclear or conflicting, skip the exercise
- **Use primary sources:** Fitness/anatomy websites are better than random blogs
- **Be consistent:** Use same muscle terminology across similar exercises
- **When in doubt:** Skip and flag for manual review

---

**Ready to start? Read the source file and begin processing!**
