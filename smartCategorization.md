# Smart categorization

## Layer 1: Global Keyword Matching (The "Low Hanging Fruit")
- Hardcode a list of obvious keywords that work for everyone
- Examples: "Grab" --> Transport, "McDonalds" --> Food

## Layer 2: User-Specific Memory (The "Learning Engine")
- When the user manually categorizes "GENERATION HAWK 2" as "Food", save a rule locally.
- Next time, check this local rule list first

## Layer 3: The "Uncategorized" Fallback
- If no rules match, mark it as "Uncategorized" and ask the user.