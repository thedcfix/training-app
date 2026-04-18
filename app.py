from flask import Flask, jsonify, render_template, abort
from exercises import get_categories, get_exercise
from workouts_parser import load_workouts, get_workout

app = Flask(__name__)


# ── Pages ──────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


# ── API ────────────────────────────────────────────────
@app.route("/api/exercises")
def api_exercises():
    return jsonify(get_categories())


@app.route("/api/exercises/<category>/<slug>")
def api_exercise(category, slug):
    ex = get_exercise(category, slug)
    if ex is None:
        abort(404)
    return jsonify(ex)


@app.route("/api/workouts")
def api_workouts():
    return jsonify(load_workouts(resolve_exercises=False))


@app.route("/api/workouts/<slug>")
def api_workout(slug):
    w = get_workout(slug, resolve_exercises=True)
    if w is None:
        abort(404)
    # Strip body_md from exercises in listing to keep payload small
    for ex in w.get("exercises", []):
        ex.pop("body_md", None)
    return jsonify(w)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
