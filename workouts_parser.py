import os
import frontmatter
from config import BASE_DIR
from exercises import get_exercise


WORKOUTS_DIR = os.path.join(BASE_DIR, "workouts")


def _slug_from_filename(filename):
    name = os.path.splitext(filename)[0]
    parts = name.split("-", 1)
    if parts[0].isdigit() and len(parts) > 1:
        return parts[1]
    return name


def load_workouts(resolve_exercises=False):
    """Load all workouts from the workouts/ directory."""
    workouts = []
    if not os.path.isdir(WORKOUTS_DIR):
        return workouts

    for filename in sorted(os.listdir(WORKOUTS_DIR)):
        if not filename.endswith(".md"):
            continue

        filepath = os.path.join(WORKOUTS_DIR, filename)
        post = frontmatter.load(filepath)
        slug = _slug_from_filename(filename)

        exercise_refs = post.get("exercises", [])
        exercises = []
        for ref in exercise_refs:
            if resolve_exercises:
                ex = get_exercise(ref["category"], ref["slug"])
                if ex:
                    exercises.append(ex)
            else:
                exercises.append(ref)

        workout = {
            "slug": slug,
            "title": post.get("title", slug.replace("-", " ").title()),
            "description": post.get("description", ""),
            "icon": post.get("icon", "🏋️"),
            "order": int(post.get("order", 0)),
            "exercise_count": len(exercise_refs),
            "exercises": exercises,
        }
        workouts.append(workout)

    workouts.sort(key=lambda w: w["order"])
    return workouts


def get_workout(slug, resolve_exercises=True):
    """Return a single workout by slug with resolved exercises."""
    for w in load_workouts(resolve_exercises=resolve_exercises):
        if w["slug"] == slug:
            return w
    return None
