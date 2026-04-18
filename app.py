from flask import Flask, jsonify, render_template, abort
from exercises import get_categories, get_exercise

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


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
