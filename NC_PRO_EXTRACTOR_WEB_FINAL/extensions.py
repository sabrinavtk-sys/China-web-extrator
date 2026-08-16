from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy


# =========================================================
# BANCO DE DADOS
# =========================================================

db = SQLAlchemy()


# =========================================================
# MIGRAÇÕES
# =========================================================

migrate = Migrate(
    compare_type=True,
    render_as_batch=True,
)


# =========================================================
# CRIPTOGRAFIA
# =========================================================

bcrypt = Bcrypt()


# =========================================================
# LOGIN
# =========================================================

login_manager = LoginManager()

login_manager.login_view = "login"

login_manager.login_message = (
    "Faça login para acessar o sistema."
)

login_manager.login_message_category = "warning"

login_manager.session_protection = "strong"