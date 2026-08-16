"""Corrige foreign key de operacoes

Revision ID: bd5a95dc3fc6
Revises: cd67e6003311
Create Date: 2026-08-03 20:09:29.752297

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bd5a95dc3fc6'
down_revision = 'cd67e6003311'
branch_labels = None
depends_on = None


def upgrade():

    naming_convention = {
        "fk": (
            "fk_%(table_name)s_"
            "%(column_0_name)s_"
            "%(referred_table_name)s"
        )
    }

    with op.batch_alter_table(
        "operacoes",
        schema=None,
        naming_convention=naming_convention,
    ) as batch_op:

        batch_op.drop_constraint(
            "fk_operacoes_usuario_id_usuarios",
            type_="foreignkey",
        )

        batch_op.create_foreign_key(
            "fk_operacoes_usuario_id_usuarios",
            "usuarios",
            ["usuario_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade():

    naming_convention = {
        "fk": (
            "fk_%(table_name)s_"
            "%(column_0_name)s_"
            "%(referred_table_name)s"
        )
    }

    with op.batch_alter_table(
        "operacoes",
        schema=None,
        naming_convention=naming_convention,
    ) as batch_op:

        batch_op.drop_constraint(
            "fk_operacoes_usuario_id_usuarios",
            type_="foreignkey",
        )

        batch_op.create_foreign_key(
            "fk_operacoes_usuario_id_usuarios",
            "usuarios",
            ["usuario_id"],
            ["id"],
        )