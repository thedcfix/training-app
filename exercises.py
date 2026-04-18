import os
import frontmatter
import markdown
from config import EXERCISES_DIR


def _slug_from_filename(filename):
    name = os.path.splitext(filename)[0]
    # Strip leading digits + dash (e.g. "01-hip-flexor" -> "hip-flexor")
    parts = name.split("-", 1)
    if parts[0].isdigit() and len(parts) > 1:
        return parts[1]
    return name


def load_exercises():
    """Load all exercises from the exercises/ directory tree."""
    exercises = []
    if not os.path.isdir(EXERCISES_DIR):
        return exercises

    for category_name in sorted(os.listdir(EXERCISES_DIR)):
        category_path = os.path.join(EXERCISES_DIR, category_name)
        if not os.path.isdir(category_path):
            continue

        for filename in sorted(os.listdir(category_path)):
            if not filename.endswith(".md"):
                continue

            filepath = os.path.join(category_path, filename)
            post = frontmatter.load(filepath)
            slug = _slug_from_filename(filename)

            exercise = {
                "slug": slug,
                "category": category_name,
                "title": post.get("title", slug.replace("-", " ").title()),
                "target": post.get("target", ""),
                "duration": int(post.get("duration", 30)),
                "recovery": int(post.get("recovery", 15)),
                "repetitions": int(post.get("repetitions", 1)),
                "difficulty": post.get("difficulty", "beginner"),
                "icon": post.get("icon", "💪"),
                "order": int(post.get("order", 0)),
                "body_md": post.content,
                "body_html": markdown.markdown(post.content),
            }
            exercises.append(exercise)

    # Sort by category, then order
    exercises.sort(key=lambda e: (e["category"], e["order"]))
    return exercises


def get_exercise(category, slug):
    """Return a single exercise by category and slug, or None."""
    for ex in load_exercises():
        if ex["category"] == category and ex["slug"] == slug:
            return ex
    return None


def get_categories():
    """Return a list of unique categories with their exercises (metadata only)."""
    exercises = load_exercises()
    cats = {}
    for ex in exercises:
        cat = ex["category"]
        if cat not in cats:
            cats[cat] = {
                "slug": cat,
                "name": cat.replace("-", " ").title(),
                "exercises": [],
            }
        # Don't include HTML body in listing
        summary = {k: v for k, v in ex.items() if k not in ("body_md", "body_html")}
        cats[cat]["exercises"].append(summary)
    return list(cats.values())
