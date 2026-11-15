"""StreakForge sync API: real accounts + per-user streak data, built for the PWA.

Auth: bcrypt password hashes, itsdangerous signed bearer tokens (30-day TTL).
Storage: SQLite in WAL mode. Data: solves per day, spaced-repetition review state.
"""
import datetime as dt
import os
import sqlite3
import threading
import time
from functools import wraps

import bcrypt
from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS
from itsdangerous import BadSignature, URLSafeTimedSerializer

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, "streakforge.db")
SECRET = os.environ.get("STREAKFORGE_SECRET_KEY") or os.urandom(32).hex()

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024  # 512 KB body cap

_ALLOWED_ORIGINS = {
    "https://shlokgit-04.github.io",
    "https://shlok.is-a.dev",
    "http://localhost:8081",
    "http://localhost:8080",
    "http://127.0.0.1:8081",
}
CORS(app, origins=list(_ALLOWED_ORIGINS),
     allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     max_age=86400)

serializer = URLSafeTimedSerializer(SECRET, salt="streakforge-auth")
TOKEN_TTL_SECONDS = 30 * 24 * 3600

_lock = threading.Lock()


def db():
    if "db" not in g:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA busy_timeout=8000")
        g.db = conn
    return g.db


@app.teardown_appcontext
def _close(_exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                pw_hash TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS solves (
                user_id TEXT NOT NULL,
                iso_date TEXT NOT NULL,
                slug TEXT NOT NULL,
                PRIMARY KEY (user_id, iso_date, slug),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS reviews (
                user_id TEXT NOT NULL,
                slug TEXT NOT NULL,
                level INTEGER NOT NULL DEFAULT 0,
                due TEXT NOT NULL,
                PRIMARY KEY (user_id, slug),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS rate_limits (
                bucket TEXT PRIMARY KEY,
                window_start REAL NOT NULL,
                count INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_solves_user ON solves(user_id);
            """
        )
        conn.commit()
    finally:
        conn.close()


# --- security headers -------------------------------------------------------
@app.after_request
def _headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault("Content-Security-Policy",
                            "default-src 'none'; frame-ancestors 'none'")
    resp.headers.setdefault("Cache-Control", "no-store")
    return resp


# --- rate limiting ----------------------------------------------------------
LIMITS = {  # name -> (max_requests, window_seconds)
    "auth": (20, 300),      # register/login per IP per 5 min
    "read": (120, 60),      # reads per IP per minute
    "write": (60, 60),      # writes per IP per minute
}


def _rate_bucket(name, window_s, max_n):
    ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.remote_addr or "unknown"
    bucket = f"{name}:{ip}"
    now = time.time()
    with _lock:
        conn = db()
        row = conn.execute("SELECT window_start, count FROM rate_limits WHERE bucket=?", (bucket,)).fetchone()
        if row is None or now - row["window_start"] > window_s:
            conn.execute("INSERT INTO rate_limits(bucket, window_start, count) VALUES(?,?,1) "
                         "ON CONFLICT(bucket) DO UPDATE SET window_start=excluded.window_start, count=1", (bucket, now))
            conn.commit()
            return True
        if row["count"] >= max_n:
            return False
        conn.execute("UPDATE rate_limits SET count=count+1 WHERE bucket=?", (bucket,))
        conn.commit()
        return True


def rate_limited(name):
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            max_n, window_s = LIMITS[name]
            if not _rate_bucket(name, window_s, max_n):
                return jsonify(error="Too many requests. Try again shortly."), 429
            return fn(*a, **kw)
        return wrapper
    return deco


# --- helpers ----------------------------------------------------------------
def _valid_email(email):
    return isinstance(email, str) and 3 <= len(email) <= 254 and "@" in email and " " not in email


def _new_user_id():
    return os.urandom(16).hex()


def _token_for(user_id):
    return serializer.dumps({"uid": user_id})


def _user_from_token():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    token = header[7:].strip()
    try:
        payload = serializer.loads(token, max_age=TOKEN_TTL_SECONDS)
    except BadSignature:
        return None
    row = db().execute("SELECT id, email, name, created_at FROM users WHERE id=?", (payload.get("uid"),)).fetchone()
    return row


def require_auth(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        user = _user_from_token()
        if user is None:
            return jsonify(error="Not signed in."), 401
        g.user = user
        return fn(*a, **kw)
    return wrapper


# --- static companion pages (login/register/privacy/about live on the site;
#     serving them here too keeps one URL working) ---------------------------
@app.route("/")
def _root():
    return jsonify(service="streakforge-api", ok=True), 200


@app.route("/api/health")
def _health():
    try:
        db().execute("SELECT 1")
        return jsonify(ok=True, db="up"), 200
    except sqlite3.Error:
        return jsonify(ok=False, db="down"), 503


# --- auth -------------------------------------------------------------------
@app.post("/api/auth/register")
@rate_limited("auth")
def _register():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name = (body.get("name") or "").strip()[:60]
    if not _valid_email(email):
        return jsonify(error="Enter a valid email address."), 400
    if len(password) < 8:
        return jsonify(error="Password must be at least 8 characters."), 400
    if len(password) > 200:
        return jsonify(error="Password too long."), 400
    conn = db()
    if conn.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        return jsonify(error="That email already has an account. Sign in instead."), 409
    uid = _new_user_id()
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()
    conn.execute("INSERT INTO users(id, email, pw_hash, name, created_at) VALUES(?,?,?,?,?)",
                 (uid, email, pw_hash, name, dt.datetime.utcnow().isoformat(timespec="seconds")))
    conn.commit()
    return jsonify(token=_token_for(uid), user={"id": uid, "email": email, "name": name}), 201


@app.post("/api/auth/login")
@rate_limited("auth")
def _login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    row = db().execute("SELECT id, email, pw_hash, name FROM users WHERE email=?", (email,)).fetchone()
    if row is None or not bcrypt.checkpw(password.encode(), row["pw_hash"].encode()):
        return jsonify(error="Wrong email or password."), 401
    return jsonify(token=_token_for(row["id"]), user={"id": row["id"], "email": row["email"], "name": row["name"]}), 200


@app.get("/api/auth/me")
@require_auth
def _me():
    u = g.user
    return jsonify(user={"id": u["id"], "email": u["email"], "name": u["name"]}), 200


# --- data sync --------------------------------------------------------------
def _load_state(uid):
    conn = db()
    done = {}
    for r in conn.execute("SELECT iso_date, slug FROM solves WHERE user_id=?", (uid,)):
        done.setdefault(r["iso_date"], []).append(r["slug"])
    review = {r["slug"]: {"level": r["level"], "due": r["due"]}
              for r in conn.execute("SELECT slug, level, due FROM reviews WHERE user_id=?", (uid,))}
    return {"done": done, "review": review}


def _valid_slug(slug):
    return isinstance(slug, str) and 0 < len(slug) <= 120 and all(c.isalnum() or c == "-" for c in slug)


def _valid_date(iso):
    if not isinstance(iso, str) or len(iso) != 10 or iso[4] != "-" or iso[7] != "-":
        return False
    try:
        dt.date.fromisoformat(iso)
        return True
    except ValueError:
        return False


@app.get("/api/data")
@require_auth
def _get_data():
    return jsonify(_load_state(g.user["id"])), 200


@app.post("/api/data/sync")
@require_auth
@rate_limited("write")
def _sync():
    body = request.get_json(silent=True) or {}
    done_in = body.get("done")
    review_in = body.get("review")
    if not isinstance(done_in, dict) or not isinstance(review_in, dict):
        return jsonify(error="Body must be {done: {...}, review: {...}}."), 400
    uid = g.user["id"]
    conn = db()
    add_rows = []
    for iso, slugs in done_in.items():
        if not _valid_date(iso):
            return jsonify(error=f"Bad date {iso!r}."), 400
        if not isinstance(slugs, list) or len(slugs) > 50:
            return jsonify(error=f"Bad slug list for {iso}."), 400
        for slug in slugs:
            if not _valid_slug(slug):
                return jsonify(error=f"Bad slug {slug!r}."), 400
            add_rows.append((uid, iso, slug))
    if add_rows:
        conn.executemany("INSERT OR IGNORE INTO solves(user_id, iso_date, slug) VALUES(?,?,?)", add_rows)
    for slug, r in review_in.items():
        if not _valid_slug(slug) or not isinstance(r, dict):
            return jsonify(error=f"Bad review entry {slug!r}."), 400
        level = r.get("level")
        due = r.get("due")
        if not isinstance(level, int) or level < 0 or level > 50 or not _valid_date(due):
            return jsonify(error=f"Bad review state for {slug!r}."), 400
        # server keeps the higher level and the further due date (monotonic progression)
        conn.execute(
            "INSERT INTO reviews(user_id, slug, level, due) VALUES(?,?,?,?) "
            "ON CONFLICT(user_id, slug) DO UPDATE SET "
            "level=max(level, excluded.level), due=max(due, excluded.due)",
            (uid, slug, level, due))
    conn.commit()
    return jsonify(state=_load_state(uid)), 200


# --- account data rights ----------------------------------------------------
@app.get("/api/auth/export")
@require_auth
@rate_limited("read")
def _export():
    u = g.user
    return jsonify(user={"email": u["email"], "name": u["name"], "created_at": u["created_at"]},
                   state=_load_state(u["id"])), 200


@app.delete("/api/auth/me")
@require_auth
def _delete_account():
    conn = db()
    conn.execute("DELETE FROM solves WHERE user_id=?", (g.user["id"],))
    conn.execute("DELETE FROM reviews WHERE user_id=?", (g.user["id"],))
    conn.execute("DELETE FROM users WHERE id=?", (g.user["id"],))
    conn.commit()
    return jsonify(ok=True), 200


# Initialize the schema on every import, so gunicorn workers get it too.
init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
