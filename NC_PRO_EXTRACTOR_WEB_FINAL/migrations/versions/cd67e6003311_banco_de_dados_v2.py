"""Banco de dados v2

Revision ID: cd67e6003311
Revises:
Create Date: 2026-08-03 19:57:49.969131
"""

from datetime import datetime
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


# =========================================================
# IDENTIFICAÇÃO DA MIGRAÇÃO
# =========================================================

revision = "cd67e6003311"
down_revision = None
branch_labels = None
depends_on = None


# =========================================================
# FUNÇÕES AUXILIARES
# =========================================================

def agora():
    """
    Data utilizada para preencher registros antigos.

    datetime.utcnow() é usado aqui por compatibilidade com
    o SQLite atual.
    """

    return datetime.utcnow()


def gerar_uuid():
    return str(uuid4())


# =========================================================
# UPGRADE: BANCO V1 -> BANCO V2
# =========================================================

def upgrade():

    conexao = op.get_bind()

    # =====================================================
    # 1. ADICIONAR CAMPOS NOVOS EM USUÁRIOS
    #
    # Primeiro como nullable=True para não quebrar os
    # registros que já existem.
    # =====================================================

    with op.batch_alter_table(
        "usuarios",
        schema=None,
    ) as batch_op:

        batch_op.add_column(
            sa.Column(
                "uuid",
                sa.String(length=36),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "cargo",
                sa.String(length=30),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "ativo",
                sa.Boolean(),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "ultimo_login",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "atualizado_em",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )


    # =====================================================
    # 2. PREENCHER USUÁRIOS ANTIGOS
    # =====================================================

    usuarios = conexao.execute(
        sa.text(
            """
            SELECT
                id,
                criado_em
            FROM usuarios
            """
        )
    ).mappings().all()


    for usuario in usuarios:

        data_criacao = (
            usuario["criado_em"]
            or agora()
        )

        conexao.execute(
            sa.text(
                """
                UPDATE usuarios
                SET
                    uuid = :uuid,
                    cargo = :cargo,
                    ativo = :ativo,
                    criado_em = :criado_em,
                    atualizado_em = :atualizado_em
                WHERE id = :id
                """
            ),
            {
                "uuid": gerar_uuid(),
                "cargo": "usuario",
                "ativo": True,
                "criado_em": data_criacao,
                "atualizado_em": data_criacao,
                "id": usuario["id"],
            },
        )


    # =====================================================
    # 3. TORNAR CAMPOS DE USUÁRIOS OBRIGATÓRIOS
    # =====================================================

    with op.batch_alter_table(
        "usuarios",
        schema=None,
    ) as batch_op:

        batch_op.alter_column(
            "uuid",
            existing_type=sa.String(length=36),
            nullable=False,
        )

        batch_op.alter_column(
            "cargo",
            existing_type=sa.String(length=30),
            nullable=False,
        )

        batch_op.alter_column(
            "ativo",
            existing_type=sa.Boolean(),
            nullable=False,
        )

        batch_op.alter_column(
            "criado_em",
            existing_type=sa.DateTime(),
            nullable=False,
        )

        batch_op.alter_column(
            "atualizado_em",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )

        batch_op.create_index(
            "ix_usuarios_usuario",
            ["usuario"],
            unique=False,
        )

        batch_op.create_unique_constraint(
            "uq_usuarios_uuid",
            ["uuid"],
        )


    # =====================================================
    # 4. ADICIONAR CAMPOS NOVOS EM OPERAÇÕES
    #
    # Também começam como opcionais para permitir o
    # preenchimento dos registros antigos.
    # =====================================================

    with op.batch_alter_table(
        "operacoes",
        schema=None,
    ) as batch_op:

        batch_op.add_column(
            sa.Column(
                "uuid",
                sa.String(length=36),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "valor_envio",
                sa.Numeric(
                    precision=18,
                    scale=2,
                ),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "ocr_confianca",
                sa.Numeric(
                    precision=5,
                    scale=2,
                ),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "leitura_ocr",
                sa.String(length=100),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "status",
                sa.String(length=30),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "print_envio",
                sa.String(length=500),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "print_recebimento",
                sa.String(length=500),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "criado_em",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )

        batch_op.add_column(
            sa.Column(
                "atualizado_em",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )


    # =====================================================
    # 5. COPIAR DADOS ANTIGOS DAS OPERAÇÕES
    #
    # A data antiga é preservada em criado_em.
    # =====================================================

    operacoes = conexao.execute(
        sa.text(
            """
            SELECT
                id,
                data
            FROM operacoes
            """
        )
    ).mappings().all()


    for operacao in operacoes:

        data_operacao = (
            operacao["data"]
            or agora()
        )

        conexao.execute(
            sa.text(
                """
                UPDATE operacoes
                SET
                    uuid = :uuid,
                    status = :status,
                    criado_em = :criado_em,
                    atualizado_em = :atualizado_em
                WHERE id = :id
                """
            ),
            {
                "uuid": gerar_uuid(),
                "status": "concluida",
                "criado_em": data_operacao,
                "atualizado_em": data_operacao,
                "id": operacao["id"],
            },
        )


    # =====================================================
    # 6. ALTERAR TIPOS E CONSTRAINTS DAS OPERAÇÕES
    # =====================================================

    with op.batch_alter_table(
        "operacoes",
        schema=None,
    ) as batch_op:

        batch_op.alter_column(
            "uuid",
            existing_type=sa.String(length=36),
            nullable=False,
        )

        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=30),
            nullable=False,
        )

        batch_op.alter_column(
            "criado_em",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )

        batch_op.alter_column(
            "atualizado_em",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )

        batch_op.alter_column(
            "valor",
            existing_type=sa.Float(),
            type_=sa.Numeric(
                precision=18,
                scale=2,
            ),
            existing_nullable=False,
        )

        batch_op.alter_column(
            "porcentagem",
            existing_type=sa.Float(),
            type_=sa.Numeric(
                precision=5,
                scale=2,
            ),
            existing_nullable=False,
        )

        batch_op.alter_column(
            "valor_porcentagem",
            existing_type=sa.Float(),
            type_=sa.Numeric(
                precision=18,
                scale=2,
            ),
            existing_nullable=False,
        )

        batch_op.create_unique_constraint(
            "uq_operacoes_uuid",
            ["uuid"],
        )

        batch_op.create_check_constraint(
            "ck_operacoes_valor_positivo",
            "valor > 0",
        )

        batch_op.create_check_constraint(
            "ck_operacoes_porcentagem",
            (
                "porcentagem >= -40 "
                "AND porcentagem <= -20"
            ),
        )

        batch_op.create_index(
            "ix_operacoes_jogador",
            ["id_jogador"],
            unique=False,
        )

        batch_op.create_index(
            "ix_operacoes_usuario_data",
            [
                "usuario_id",
                "criado_em",
            ],
            unique=False,
        )

        batch_op.create_index(
            "ix_operacoes_usuario_id",
            ["usuario_id"],
            unique=False,
        )

        # A coluna antiga só é removida depois que todos
        # os valores foram copiados para criado_em.
        batch_op.drop_column(
            "data"
        )


    # =====================================================
    # 7. CONFIGURAÇÕES DOS USUÁRIOS
    # =====================================================

    op.create_table(
        "configuracoes_usuario",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "usuario_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "porcentagem_padrao",
            sa.Numeric(
                precision=5,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "tema",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "precisao_ocr",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "salvar_prints",
            sa.Boolean(),
            nullable=False,
        ),

        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            ondelete="CASCADE",
            name="fk_configuracoes_usuario",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "usuario_id",
            name="uq_configuracoes_usuario_id",
        ),
    )


    # =====================================================
    # 8. CRIAR CONFIGURAÇÃO PARA USUÁRIOS ANTIGOS
    # =====================================================

    usuarios_atuais = conexao.execute(
        sa.text(
            """
            SELECT id
            FROM usuarios
            """
        )
    ).mappings().all()


    for usuario in usuarios_atuais:

        data_atual = agora()

        conexao.execute(
            sa.text(
                """
                INSERT INTO configuracoes_usuario
                (
                    usuario_id,
                    porcentagem_padrao,
                    tema,
                    precisao_ocr,
                    salvar_prints,
                    criado_em,
                    atualizado_em
                )
                VALUES
                (
                    :usuario_id,
                    :porcentagem_padrao,
                    :tema,
                    :precisao_ocr,
                    :salvar_prints,
                    :criado_em,
                    :atualizado_em
                )
                """
            ),
            {
                "usuario_id": usuario["id"],
                "porcentagem_padrao": -20,
                "tema": "escuro",
                "precisao_ocr": "alta",
                "salvar_prints": True,
                "criado_em": data_atual,
                "atualizado_em": data_atual,
            },
        )


    # =====================================================
    # 9. LOGS DE AUDITORIA
    # =====================================================

    op.create_table(
        "logs_auditoria",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "uuid",
            sa.String(length=36),
            nullable=False,
        ),

        sa.Column(
            "usuario_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "acao",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "entidade",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "entidade_id",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "detalhes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "endereco_ip",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "user_agent",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            ondelete="CASCADE",
            name="fk_logs_usuario",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "uuid",
            name="uq_logs_uuid",
        ),
    )


    with op.batch_alter_table(
        "logs_auditoria",
        schema=None,
    ) as batch_op:

        batch_op.create_index(
            "ix_logs_acao",
            ["acao"],
            unique=False,
        )

        batch_op.create_index(
            "ix_logs_usuario_data",
            [
                "usuario_id",
                "criado_em",
            ],
            unique=False,
        )


# =========================================================
# DOWNGRADE: BANCO V2 -> BANCO V1
# =========================================================

def downgrade():

    conexao = op.get_bind()

    # =====================================================
    # 1. REMOVER TABELAS NOVAS
    # =====================================================

    with op.batch_alter_table(
        "logs_auditoria",
        schema=None,
    ) as batch_op:

        batch_op.drop_index(
            "ix_logs_usuario_data"
        )

        batch_op.drop_index(
            "ix_logs_acao"
        )


    op.drop_table(
        "logs_auditoria"
    )

    op.drop_table(
        "configuracoes_usuario"
    )


    # =====================================================
    # 2. RECRIAR DATA ANTIGA EM OPERAÇÕES
    # =====================================================

    with op.batch_alter_table(
        "operacoes",
        schema=None,
    ) as batch_op:

        batch_op.add_column(
            sa.Column(
                "data",
                sa.DateTime(),
                nullable=True,
            )
        )


    conexao.execute(
        sa.text(
            """
            UPDATE operacoes
            SET data = criado_em
            """
        )
    )


    # =====================================================
    # 3. RETORNAR OPERAÇÕES AO FORMATO ANTIGO
    # =====================================================

    with op.batch_alter_table(
        "operacoes",
        schema=None,
    ) as batch_op:

        batch_op.drop_constraint(
            "ck_operacoes_porcentagem",
            type_="check",
        )

        batch_op.drop_constraint(
            "ck_operacoes_valor_positivo",
            type_="check",
        )

        batch_op.drop_constraint(
            "uq_operacoes_uuid",
            type_="unique",
        )

        batch_op.drop_index(
            "ix_operacoes_usuario_id"
        )

        batch_op.drop_index(
            "ix_operacoes_usuario_data"
        )

        batch_op.drop_index(
            "ix_operacoes_jogador"
        )

        batch_op.alter_column(
            "valor",
            existing_type=sa.Numeric(
                precision=18,
                scale=2,
            ),
            type_=sa.Float(),
            existing_nullable=False,
        )

        batch_op.alter_column(
            "porcentagem",
            existing_type=sa.Numeric(
                precision=5,
                scale=2,
            ),
            type_=sa.Float(),
            existing_nullable=False,
        )

        batch_op.alter_column(
            "valor_porcentagem",
            existing_type=sa.Numeric(
                precision=18,
                scale=2,
            ),
            type_=sa.Float(),
            existing_nullable=False,
        )

        batch_op.drop_column(
            "atualizado_em"
        )

        batch_op.drop_column(
            "criado_em"
        )

        batch_op.drop_column(
            "print_recebimento"
        )

        batch_op.drop_column(
            "print_envio"
        )

        batch_op.drop_column(
            "status"
        )

        batch_op.drop_column(
            "leitura_ocr"
        )

        batch_op.drop_column(
            "ocr_confianca"
        )

        batch_op.drop_column(
            "valor_envio"
        )

        batch_op.drop_column(
            "uuid"
        )


    # =====================================================
    # 4. RETORNAR USUÁRIOS AO FORMATO ANTIGO
    # =====================================================

    with op.batch_alter_table(
        "usuarios",
        schema=None,
    ) as batch_op:

        batch_op.drop_constraint(
            "uq_usuarios_uuid",
            type_="unique",
        )

        batch_op.drop_index(
            "ix_usuarios_usuario"
        )

        batch_op.alter_column(
            "criado_em",
            existing_type=sa.DateTime(),
            nullable=True,
        )

        batch_op.drop_column(
            "atualizado_em"
        )

        batch_op.drop_column(
            "ultimo_login"
        )

        batch_op.drop_column(
            "ativo"
        )

        batch_op.drop_column(
            "cargo"
        )

        batch_op.drop_column(
            "uuid"
        )