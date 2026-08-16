from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from flask_login import UserMixin
from sqlalchemy import CheckConstraint, Index, UniqueConstraint

from extensions import db


# =========================================================
# HORÁRIO
# =========================================================

def agora_utc():
    return datetime.now(timezone.utc)


# =========================================================
# USUÁRIO
# =========================================================

class Usuario(
    db.Model,
    UserMixin,
):

    __tablename__ = "usuarios"

    __table_args__ = (
        Index(
            "ix_usuarios_usuario",
            "usuario",
        ),
    )


    id = db.Column(
        db.Integer,
        primary_key=True,
    )


    uuid = db.Column(
        db.String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid4()),
    )


    usuario = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
    )


    senha = db.Column(
        db.String(255),
        nullable=False,
    )


    cargo = db.Column(
        db.String(30),
        nullable=False,
        default="Funcionário",
    )


    ativo = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
    )


    ultimo_login = db.Column(
        db.DateTime(timezone=True),
        nullable=True,
    )


    criado_em = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=agora_utc,
    )


    atualizado_em = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=agora_utc,
        onupdate=agora_utc,
    )


    configuracao = db.relationship(
        "ConfiguracaoUsuario",
        back_populates="usuario",
        uselist=False,
        cascade="all, delete-orphan",
    )

    logs = db.relationship(
        "LogAuditoria",
        back_populates="usuario",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    operacoes = db.relationship(
        "Operacao",
        back_populates="usuario",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )


    def __repr__(self):
        return (
            f"<Usuario "
            f"id={self.id} "
            f"usuario={self.usuario}>"
        )


# =========================================================
# OPERAÇÃO OCR
# =========================================================

class Operacao(db.Model):

    __tablename__ = "operacoes"

    __table_args__ = (
        CheckConstraint(
            "valor > 0",
            name="ck_operacoes_valor_positivo",
        ),
        CheckConstraint(
            "porcentagem >= -40 "
            "AND porcentagem <= -20",
            name="ck_operacoes_porcentagem",
        ),
        Index(
            "ix_operacoes_usuario_data",
            "usuario_id",
            "criado_em",
        ),
        Index(
            "ix_operacoes_jogador",
            "id_jogador",
        ),
    )


    id = db.Column(
        db.Integer,
        primary_key=True,
    )


    uuid = db.Column(
        db.String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid4()),
    )


    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "usuarios.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    nome_jogador = db.Column(
        db.String(100),
        nullable=False,
    )


    id_jogador = db.Column(
        db.String(50),
        nullable=False,
    )


    valor = db.Column(
        db.Numeric(
            precision=18,
            scale=2,
            asdecimal=True,
        ),
        nullable=False,
        default=Decimal("0.00"),
    )


    porcentagem = db.Column(
        db.Numeric(
            precision=5,
            scale=2,
            asdecimal=True,
        ),
        nullable=False,
        default=Decimal("-20.00"),
    )


    valor_porcentagem = db.Column(
        db.Numeric(
            precision=18,
            scale=2,
            asdecimal=True,
        ),
        nullable=False,
        default=Decimal("0.00"),
    )


    valor_envio = db.Column(
        db.Numeric(
            precision=18,
            scale=2,
            asdecimal=True,
        ),
        nullable=True,
    )


    ocr_confianca = db.Column(
        db.Numeric(
            precision=5,
            scale=2,
            asdecimal=True,
        ),
        nullable=True,
    )


    leitura_ocr = db.Column(
        db.String(100),
        nullable=True,
    )


    status = db.Column(
        db.String(30),
        nullable=False,
        default="concluida",
    )


    observacoes = db.Column(
        db.Text,
        nullable=True,
    )


    # Mantidos por compatibilidade com versões anteriores.
    print_envio = db.Column(
        db.String(500),
        nullable=True,
    )

    print_recebimento = db.Column(
        db.String(500),
        nullable=True,
    )

    # Versão final: imagens persistem no próprio banco.
    print_envio_dados = db.Column(
        db.LargeBinary,
        nullable=True,
    )

    print_envio_mime = db.Column(
        db.String(80),
        nullable=True,
    )

    print_recebimento_dados = db.Column(
        db.LargeBinary,
        nullable=True,
    )

    print_recebimento_mime = db.Column(
        db.String(80),
        nullable=True,
    )


    criado_em = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=agora_utc,
    )


    atualizado_em = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=agora_utc,
        onupdate=agora_utc,
    )


    usuario = db.relationship(
        "Usuario",
        back_populates="operacoes",
    )


    @property
    def data(self):
        """
        Mantém compatibilidade com os templates atuais,
        que ainda usam op.data.
        """

        return self.criado_em


    def __repr__(self):
        return (
            f"<Operacao "
            f"id={self.id} "
            f"jogador={self.nome_jogador} "
            f"valor={self.valor}>"
        )


# =========================================================
# CONFIGURAÇÃO DO USUÁRIO
# =========================================================

class ConfiguracaoUsuario(db.Model):

    __tablename__ = "configuracoes_usuario"

    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            name="uq_configuracoes_usuario_id",
        ),
    )


    id = db.Column(
        db.Integer,
        primary_key=True,
    )


    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "usuarios.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )


    porcentagem_padrao = db.Column(
        db.Numeric(
            precision=5,
            scale=2,
            asdecimal=True,
        ),
        nullable=False,
        default=Decimal("-20.00"),
    )


    tema = db.Column(
        db.String(30),
        nullable=False,
        default="escuro",
    )


    precisao_ocr = db.Column(
        db.String(30),
        nullable=False,
        default="alta",
    )


    salvar_prints = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
    )


    criado_em = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=agora_utc,
    )


    atualizado_em = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=agora_utc,
        onupdate=agora_utc,
    )


    usuario = db.relationship(
        "Usuario",
        back_populates="configuracao",
    )


# =========================================================
# LOG DE AUDITORIA
# =========================================================

class LogAuditoria(db.Model):

    __tablename__ = "logs_auditoria"

    __table_args__ = (
        Index(
            "ix_logs_usuario_data",
            "usuario_id",
            "criado_em",
        ),
        Index(
            "ix_logs_acao",
            "acao",
        ),
    )


    id = db.Column(
        db.Integer,
        primary_key=True,
    )


    uuid = db.Column(
        db.String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid4()),
    )


    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "usuarios.id",
            ondelete="CASCADE",
        ),
        nullable=True,
    )


    acao = db.Column(
        db.String(100),
        nullable=False,
    )


    entidade = db.Column(
        db.String(100),
        nullable=True,
    )


    entidade_id = db.Column(
        db.String(100),
        nullable=True,
    )


    detalhes = db.Column(
        db.Text,
        nullable=True,
    )


    endereco_ip = db.Column(
        db.String(100),
        nullable=True,
    )


    user_agent = db.Column(
        db.String(500),
        nullable=True,
    )


    criado_em = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=agora_utc,
    )


    usuario = db.relationship(
        "Usuario",
        back_populates="logs",
    )


    def __repr__(self):
        return (
            f"<LogAuditoria "
            f"id={self.id} "
            f"acao={self.acao}>"
        )

# =========================================================
# META SEMANAL DO USUÁRIO
# =========================================================

class MetaSemanalUsuario(db.Model):

    __tablename__ = "metas_semanais_usuario"

    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "inicio_semana",
            name="uq_meta_usuario_semana",
        ),
        Index(
            "ix_meta_usuario_semana",
            "usuario_id",
            "inicio_semana",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    inicio_semana = db.Column(
        db.Date,
        nullable=False,
    )

    meta_entregue = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
    )

    impulsos = db.Column(db.Integer, nullable=False, default=0)

    criado_em = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=agora_utc,
    )

    atualizado_em = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=agora_utc,
        onupdate=agora_utc,
    )
