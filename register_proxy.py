#!/usr/bin/env python3
"""Registration proxy for Prism Panel.

Handles two scenarios:
1. No users in DB → first registration becomes admin (role_id=0)
2. Users exist → check register_enabled, create as normal user (role_id=1)

Directly accesses MySQL since the backend /user/create requires JWT auth,
and for the first user there is no admin to authenticate with.
"""

import json
import hashlib
import time
import http.server
import pymysql

DB_HOST = "127.0.0.1"
DB_PORT = 3306
DB_USER = "prism_8sbfh0jF"
DB_PASS = "Q1dAVllKTQt1mkNYxa6Dja2c"
DB_NAME = "prism_HMHd951u"

# Default quota for self-registered users
DEFAULT_FLOW = 0         # GB
DEFAULT_NUM = 0          # max forwards
DEFAULT_EXP_TIME = 0     # no expiry
DEFAULT_FLOW_RESET = 0   # no reset

# Admin gets unlimited resources
ADMIN_FLOW = 99999
ADMIN_NUM = 99999
ADMIN_EXP_TIME = 9999999999999
ADMIN_FLOW_RESET = 9999999999999


def get_db():
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT,
        user=DB_USER, password=DB_PASS,
        database=DB_NAME, charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def get_user_count():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT COUNT(*) as cnt FROM `user`")
            return cur.fetchone()["cnt"]
    finally:
        db.close()


def is_register_enabled():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT value FROM vite_config WHERE name='register_enabled'")
            row = cur.fetchone()
            return row and row["value"] == "true"
    finally:
        db.close()


def user_exists(username):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id FROM `user` WHERE `user`=%s", (username,))
            return cur.fetchone() is not None
    finally:
        db.close()


def create_user_in_db(username, password, is_admin=False):
    """Insert user directly into MySQL with MD5 password hash."""
    pwd_md5 = hashlib.md5(password.encode()).hexdigest()
    now_ms = int(time.time() * 1000)

    role_id = 0 if is_admin else 1
    flow = ADMIN_FLOW if is_admin else DEFAULT_FLOW
    num = ADMIN_NUM if is_admin else DEFAULT_NUM
    exp_time = ADMIN_EXP_TIME if is_admin else DEFAULT_EXP_TIME
    flow_reset = ADMIN_FLOW_RESET if is_admin else DEFAULT_FLOW_RESET

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                """INSERT INTO `user`
                   (`user`, pwd, role_id, exp_time, flow, in_flow, out_flow,
                    flow_reset_time, num, created_time, updated_time, status)
                   VALUES (%s, %s, %s, %s, %s, 0, 0, %s, %s, %s, %s, 1)""",
                (username, pwd_md5, role_id, exp_time, flow,
                 flow_reset, num, now_ms, now_ms),
            )
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


class RegisterHandler(http.server.BaseHTTPRequestHandler):

    def do_POST(self):
        if self.path == "/api/v1/user/register":
            self._handle_register()
        elif self.path == "/api/v1/user/init-status":
            self._handle_init_status()
        else:
            self._json(404, {"code": 404, "msg": "Not Found"})

    def do_GET(self):
        if self.path == "/api/v1/user/init-status":
            self._handle_init_status()
        else:
            self._json(404, {"code": 404, "msg": "Not Found"})

    def _handle_init_status(self):
        """Return whether this is a fresh install (no users yet)."""
        try:
            count = get_user_count()
            self._json(200, {
                "code": 0,
                "data": {
                    "initialized": count > 0,
                    "register_enabled": is_register_enabled() if count > 0 else True,
                },
            })
        except Exception:
            self._json(200, {"code": -1, "msg": "服务异常"})

    def _handle_register(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length > 0 else {}
        except Exception:
            self._json(400, {"code": -1, "msg": "请求格式错误"})
            return

        username = (body.get("user") or "").strip()
        password = (body.get("pwd") or "").strip()
        confirm = (body.get("confirmPwd") or "").strip()

        if not username or not password:
            self._json(200, {"code": -1, "msg": "用户名和密码不能为空"})
            return
        if len(username) < 3 or len(username) > 20:
            self._json(200, {"code": -1, "msg": "用户名长度需在3-20位之间"})
            return
        if len(password) < 6:
            self._json(200, {"code": -1, "msg": "密码长度至少6位"})
            return
        if password != confirm:
            self._json(200, {"code": -1, "msg": "两次密码输入不一致"})
            return

        try:
            count = get_user_count()
        except Exception:
            self._json(200, {"code": -1, "msg": "注册服务异常"})
            return

        is_first_user = count == 0

        # If not the first user, check register_enabled
        if not is_first_user:
            if not is_register_enabled():
                self._json(200, {"code": -1, "msg": "注册功能已关闭"})
                return

        # Check username duplicate
        try:
            if user_exists(username):
                self._json(200, {"code": -1, "msg": "用户名已存在"})
                return
        except Exception:
            self._json(200, {"code": -1, "msg": "注册服务异常"})
            return

        # Create user
        try:
            create_user_in_db(username, password, is_admin=is_first_user)
            msg = "管理员账号创建成功" if is_first_user else "用户创建成功"
            self._json(200, {"code": 0, "msg": "操作成功", "data": msg})
        except Exception as e:
            self._json(200, {"code": -1, "msg": f"注册失败: {e}"})

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    server = http.server.HTTPServer(("127.0.0.1", 50002), RegisterHandler)
    print("Register proxy listening on 127.0.0.1:50002")
    server.serve_forever()
