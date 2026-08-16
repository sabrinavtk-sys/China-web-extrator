import logging
import base64
import binascii
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from flask import (
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
    Response,
)
from flask_login import (
    current_user,
    login_required,
    login_user,
    logout_user,
)
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from extensions import bcrypt, db
from models import MetaSemanalUsuario, Operacao, Usuario


logger = logging.getLogger(__name__)

FUSO_LOCAL = ZoneInfo("America/Fortaleza")

CARGOS = {
    "Funcionário": 50,
    "Vendedor": 40,
    "Financista": 30,
    "Contador": 20,
    "Doleiro": None,
}

ORDEM_CARGOS = list(CARGOS.keys())
METAS_ORGANIZACAO = {
 "Funcionário":{"normal":(100,100,5000000),"1":(80,80,4000000),"2":(50,50,2500000)},
 "Vendedor":{"normal":(90,90,4500000),"1":(72,72,3600000),"2":(45,45,2225000)},
 "Financista":{"normal":(80,80,4000000),"1":(64,64,3200000),"2":(40,40,2000000)},
 "Contador":{"normal":(70,70,3500000),"1":(56,56,2800000),"2":(35,35,1750000)},
 "Doleiro":{"normal":(50,50,3000000),"1":(40,40,2400000),"2":(25,25,1500000)},
}
FUNCOES_CARGOS = {
 "Funcionário":"Membro da organização responsável por executar tarefas operacionais específicas, seguindo as orientações da liderança e mantendo a eficiência nas atividades designadas.",
 "Vendedor":"Responsável pela área comercial, atuando na captação de clientes, negociação e expansão dos serviços, contribuindo diretamente para o crescimento da organização.",
 "Financista":"Possui acesso à máquina e é especialista na área financeira, com acesso aos sistemas principais. É responsável pela gestão, controlo e organização dos recursos financeiros.",
 "Contador":"Administra toda a estrutura e os colaboradores da linha financeira, supervisionando atividades, acompanhando desempenho e propondo melhorias contínuas para o setor.",
 "Doleiro":"Responsável por supervisionar a equipe, auxiliar os membros, organizar a área e garantir a proteção do local. Atua diretamente no suporte das operações, organização das funções e no crescimento da equipe e dos lucros.",
}
def meta_organizacao(cargo, impulsos=0):
    v=METAS_ORGANIZACAO.get(cargo, METAS_ORGANIZACAO["Funcionário"])[str(impulsos) if impulsos in (1,2) else "normal"]
    return {"papeis":v[0],"spray":v[1],"sujo":v[2]}


MENSAGENS_PROMOCAO = {
    "Vendedor": "Parabéns pela evolução para Vendedor! Seu compromisso fortalece toda a equipe. Continue somando, ajudando os companheiros e construindo resultados junto com todos.",
    "Financista": "Parabéns pela promoção para Financista! Sua constância mostra o valor do trabalho em equipe. Continue compartilhando experiência e crescendo junto com seus companheiros.",
    "Contador": "Parabéns por chegar a Contador! Essa conquista representa dedicação e parceria. Continue sendo referência, apoiando a equipe e mantendo o companheirismo em cada meta.",
    "Doleiro": "Parabéns por alcançar Doleiro! Você chegou a uma etapa de grande confiança. Continue valorizando a equipe, ajudando seus companheiros e mostrando preparo para novas responsabilidades e um possível convite à Gerência.",
}


def limpar_texto(valor, limite=None):
    texto = str(valor or "").strip()
    return texto[:limite] if limite is not None else texto


def converter_decimal(valor, campo):
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, TypeError, ValueError) as erro:
        raise ValueError(f"O campo '{campo}' possui um valor inválido.") from erro
    if not numero.is_finite():
        raise ValueError(f"O campo '{campo}' possui um valor inválido.")
    return numero



def decodificar_imagem_base64(valor, campo):
    """Recebe data:image/...;base64,... e retorna bytes + MIME."""
    if not valor:
        return None, None
    if not isinstance(valor, str) or not valor.startswith("data:image/"):
        raise ValueError(f"O {campo} não é uma imagem válida.")
    try:
        cabecalho, conteudo = valor.split(",", 1)
        mime = cabecalho.split(";", 1)[0].split(":", 1)[1].strip().lower()
        if mime not in {"image/png", "image/jpeg", "image/webp", "image/bmp"}:
            raise ValueError(f"O formato do {campo} não é permitido.")
        dados = base64.b64decode(conteudo, validate=True)
    except (ValueError, binascii.Error) as erro:
        raise ValueError(f"Não foi possível ler o {campo}.") from erro
    if len(dados) > 7 * 1024 * 1024:
        raise ValueError(f"O {campo} ultrapassa 7 MB.")
    return dados, mime


def resposta_erro(mensagem, status=400):
    return jsonify({"sucesso": False, "erro": mensagem}), status


def agora_local():
    return datetime.now(FUSO_LOCAL)


def periodo_semana(referencia=None):
    """Retorna domingo 00:00 até o próximo domingo 00:00 no fuso de Fortaleza."""
    referencia = referencia or agora_local()
    if referencia.tzinfo is None:
        referencia = referencia.replace(tzinfo=FUSO_LOCAL)
    else:
        referencia = referencia.astimezone(FUSO_LOCAL)

    # weekday(): segunda=0 ... domingo=6
    dias_desde_domingo = (referencia.weekday() + 1) % 7
    data_inicio = referencia.date() - timedelta(days=dias_desde_domingo)
    inicio_local = datetime.combine(data_inicio, time.min, tzinfo=FUSO_LOCAL)
    fim_local = inicio_local + timedelta(days=7)
    return inicio_local, fim_local


def garantir_cargo_valido(usuario):
    if usuario.cargo not in CARGOS:
        usuario.cargo = "Funcionário"
        return True
    return False


def obter_meta_semana(usuario_id, criar=True):
    inicio_local, fim_local = periodo_semana()
    inicio_data = inicio_local.date()

    registro = MetaSemanalUsuario.query.filter_by(
        usuario_id=usuario_id,
        inicio_semana=inicio_data,
    ).first()

    if registro is None and criar:
        registro = MetaSemanalUsuario(
            usuario_id=usuario_id,
            inicio_semana=inicio_data,
            meta_entregue=False,
            impulsos=0,
        )
        db.session.add(registro)
        db.session.commit()

    return registro, inicio_local, fim_local


def resumo_meta_semanal(usuario):
    registro, inicio_local, fim_local = obter_meta_semana(usuario.id, criar=True)

    inicio_utc = inicio_local.astimezone(timezone.utc)
    fim_utc = fim_local.astimezone(timezone.utc)

    lavagens = Operacao.query.filter(
        Operacao.usuario_id == usuario.id,
        Operacao.criado_em >= inicio_utc,
        Operacao.criado_em < fim_utc,
    ).count()

    meta = CARGOS.get(usuario.cargo)
    meta_entregue = bool(registro.meta_entregue)
    impulsos = registro.impulsos if registro.impulsos in (0,1,2) else 0
    meta_org = meta_organizacao(usuario.cargo, impulsos)

    if meta is None:
        faltam = 0
        percentual = 100
        apto = False
        status = "Possível convite para Gerência"
    else:
        faltam = max(meta - lavagens, 0)
        percentual = min(round((lavagens / meta) * 100), 100) if meta else 100
        apto = lavagens >= meta and meta_entregue
        if apto:
            status = "Apto para upamento"
        elif lavagens >= meta and not meta_entregue:
            status = "Quantidade atingida — falta entregar a meta"
        else:
            status = f"Faltam {faltam} lavagens"

    return {
        "cargo": usuario.cargo,
        "meta": meta,
        "lavagens": lavagens,
        "faltam": faltam,
        "percentual": percentual,
        "meta_entregue": meta_entregue,
        "impulsos": impulsos,
        "meta_org": meta_org,
        "funcao": FUNCOES_CARGOS.get(usuario.cargo, ""),
        "apto": apto,
        "status": status,
        "inicio": inicio_local,
        "fim_exclusivo": fim_local,
        "fim_exibicao": fim_local - timedelta(minutes=1),
    }


def configurar_rotas(app):

    @app.route("/")
    def inicio():
        return redirect(url_for("dashboard" if current_user.is_authenticated else "login"))

    @app.route("/cadastro", methods=["GET", "POST"])
    def cadastro():
        if current_user.is_authenticated:
            return redirect(url_for("dashboard"))
        if request.method == "GET":
            return render_template("cadastro.html", cargos=ORDEM_CARGOS)

        usuario = limpar_texto(request.form.get("usuario"), 50)
        senha = str(request.form.get("senha") or "")
        confirmar_senha = str(request.form.get("confirmar_senha") or "")
        cargo = limpar_texto(request.form.get("cargo"), 30)

        if not usuario or not senha or not confirmar_senha or cargo not in CARGOS:
            return render_template("cadastro.html", cargos=ORDEM_CARGOS, erro="Preencha todos os campos e selecione seu cargo atual.")
        if len(usuario) < 3:
            return render_template("cadastro.html", cargos=ORDEM_CARGOS, erro="O nome de usuário deve possuir pelo menos 3 caracteres.")
        if len(senha) < 6:
            return render_template("cadastro.html", cargos=ORDEM_CARGOS, erro="A senha deve possuir pelo menos 6 caracteres.")
        if senha != confirmar_senha:
            return render_template("cadastro.html", cargos=ORDEM_CARGOS, erro="As senhas não coincidem.")

        usuario_existente = Usuario.query.filter(func.lower(Usuario.usuario) == usuario.lower()).first()
        if usuario_existente:
            return render_template("cadastro.html", cargos=ORDEM_CARGOS, erro="Este usuário já existe.")

        novo_usuario = Usuario(
            usuario=usuario,
            senha=bcrypt.generate_password_hash(senha).decode("utf-8"),
            cargo=cargo,
        )
        try:
            db.session.add(novo_usuario)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return render_template("cadastro.html", cargos=ORDEM_CARGOS, erro="Este usuário já existe.")
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Erro de banco ao cadastrar usuário.")
            return render_template("cadastro.html", cargos=ORDEM_CARGOS, erro="Não foi possível concluir o cadastro.")

        flash("Conta criada com sucesso. Entre com seu usuário e senha.", "sucesso")
        return redirect(url_for("login"))

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for("dashboard"))
        if request.method == "GET":
            return render_template("login.html")

        usuario = limpar_texto(request.form.get("usuario"), 50)
        senha = str(request.form.get("senha") or "")
        if not usuario or not senha:
            return render_template("login.html", erro="Preencha usuário e senha.")

        user = Usuario.query.filter(func.lower(Usuario.usuario) == usuario.lower()).first()
        if not user or not bcrypt.check_password_hash(user.senha, senha):
            return render_template("login.html", erro="Usuário ou senha inválidos.")
        if not user.ativo:
            return render_template("login.html", erro="Esta conta está desativada.")

        login_user(user, remember=False)
        try:
            alterou = garantir_cargo_valido(user)
            user.ultimo_login = datetime.now(timezone.utc)
            db.session.commit()
            if alterou:
                flash("Sua conta antiga foi definida como Funcionário. Você pode ajustar o cargo em Configurações.", "aviso")
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Não foi possível atualizar o último login do usuário %s.", user.id)

        return redirect(url_for("dashboard"))

    @app.route("/dashboard")
    @login_required
    def dashboard():
        consulta_usuario = Operacao.query.filter_by(usuario_id=current_user.id)
        total_operacoes = consulta_usuario.count()
        valor_total = db.session.query(func.coalesce(func.sum(Operacao.valor), 0)).filter(Operacao.usuario_id == current_user.id).scalar()
        ganhos_total = db.session.query(func.coalesce(func.sum(Operacao.valor_porcentagem), 0)).filter(Operacao.usuario_id == current_user.id).scalar()
        ultimas_operacoes = consulta_usuario.order_by(Operacao.criado_em.desc(), Operacao.id.desc()).limit(10).all()
        progresso = resumo_meta_semanal(current_user)
        data_hoje = agora_local().strftime("%d/%m/%Y %H:%M")

        return render_template(
            "dashboard.html",
            total_operacoes=total_operacoes,
            valor_total=valor_total,
            lucro_total=ganhos_total,
            ultimas_operacoes=ultimas_operacoes,
            progresso=progresso,
            data_hoje=data_hoje,
        )

    @app.route("/salvar-operacao", methods=["POST"])
    @login_required
    def salvar_operacao():
        dados = request.get_json(silent=True)
        if not isinstance(dados, dict):
            return resposta_erro("Os dados enviados são inválidos.")

        nome_jogador = limpar_texto(dados.get("nome_jogador"), 100)
        id_jogador = limpar_texto(dados.get("id_jogador"), 50)
        observacoes = limpar_texto(dados.get("observacoes"), 2000)

        try:
            print_envio_dados, print_envio_mime = decodificar_imagem_base64(
                dados.get("print_envio_base64"),
                "print de envio",
            )
            print_recebimento_dados, print_recebimento_mime = decodificar_imagem_base64(
                dados.get("print_recebimento_base64"),
                "print de recebimento",
            )
        except ValueError as erro:
            return resposta_erro(str(erro))

        if not nome_jogador or nome_jogador in {"---", "Não identificado"}:
            return resposta_erro("O nome do jogador é inválido.")
        if not id_jogador or id_jogador in {"---", "Não identificado"}:
            return resposta_erro("O ID do jogador é inválido.")

        try:
            valor = converter_decimal(dados.get("valor"), "valor")
            porcentagem = converter_decimal(dados.get("porcentagem"), "porcentagem")
            valor_porcentagem = converter_decimal(dados.get("valor_porcentagem"), "valor_porcentagem")
        except ValueError as erro:
            return resposta_erro(str(erro))

        if valor <= 0:
            return resposta_erro("O valor da operação deve ser maior que zero.")
        if porcentagem < Decimal("-40") or porcentagem > Decimal("-20"):
            return resposta_erro("A porcentagem deve estar entre -40% e -20%.")

        ganho_calculado = (valor * abs(porcentagem) / Decimal("100")).quantize(Decimal("0.01"))
        valor_porcentagem = valor_porcentagem.quantize(Decimal("0.01"))
        if abs(ganho_calculado - valor_porcentagem) > Decimal("0.02"):
            return resposta_erro("O ganho informado não corresponde ao valor e à porcentagem da operação.")

        nova_operacao = Operacao(
            usuario_id=current_user.id,
            nome_jogador=nome_jogador,
            id_jogador=id_jogador,
            valor=valor,
            porcentagem=porcentagem,
            valor_porcentagem=ganho_calculado,
            observacoes=observacoes,
            print_envio_dados=print_envio_dados,
            print_envio_mime=print_envio_mime,
            print_recebimento_dados=print_recebimento_dados,
            print_recebimento_mime=print_recebimento_mime,
            criado_em=datetime.now(timezone.utc),
        )
        try:
            db.session.add(nova_operacao)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Erro ao salvar operação.")
            return resposta_erro("Não foi possível salvar a operação.", 500)

        progresso = resumo_meta_semanal(current_user)
        return jsonify({
            "sucesso": True,
            "mensagem": "Operação salva com sucesso.",
            "operacao_id": nova_operacao.id,
            "lavagens_semana": progresso["lavagens"],
            "meta": progresso["meta"],
            "apto": progresso["apto"],
        }), 201

    @app.route("/reset-semanal", methods=["POST"])
    @login_required
    def reset_semanal():
        # Mantida por compatibilidade. Nunca apaga operações.
        flash("A contagem semanal é automática: domingo 00:00 até sábado 23:59. Seu histórico não foi apagado.", "info")
        return redirect(url_for("dashboard"))

    @app.route("/configuracoes", methods=["GET", "POST"])
    @login_required
    def configuracoes():
        garantir_cargo_valido(current_user)
        registro_meta, _, _ = obter_meta_semana(current_user.id, criar=True)

        if request.method == "POST":
            cargo_novo = limpar_texto(request.form.get("cargo"), 30)
            meta_entregue = request.form.get("meta_entregue") == "1"
            try: impulsos = int(request.form.get("impulsos", "0"))
            except (TypeError, ValueError): impulsos = 0
            if impulsos not in (0,1,2): impulsos = 0

            if cargo_novo not in CARGOS:
                flash("Selecione um cargo válido.", "erro")
                return redirect(url_for("configuracoes"))

            cargo_anterior = current_user.cargo
            houve_promocao = (
                cargo_anterior in ORDEM_CARGOS
                and ORDEM_CARGOS.index(cargo_novo) > ORDEM_CARGOS.index(cargo_anterior)
            )

            try:
                current_user.cargo = cargo_novo
                registro_meta.meta_entregue = meta_entregue
                registro_meta.impulsos = impulsos
                db.session.commit()
            except SQLAlchemyError:
                db.session.rollback()
                logger.exception("Erro ao salvar configurações do usuário %s.", current_user.id)
                flash("Não foi possível salvar as configurações.", "erro")
                return redirect(url_for("configuracoes"))

            if houve_promocao:
                mensagem = MENSAGENS_PROMOCAO.get(cargo_novo, "Parabéns pela promoção! Continue evoluindo junto com sua equipe.")
                flash(f"🎉 {mensagem}", "promocao")
            else:
                flash("Configurações salvas com sucesso.", "sucesso")
            return redirect(url_for("dashboard" if houve_promocao else "configuracoes"))

        progresso = resumo_meta_semanal(current_user)
        return render_template(
            "configuracoes.html",
            cargos=ORDEM_CARGOS,
            metas=CARGOS,
            progresso=progresso,
        )

    @app.route("/historico")
    @login_required
    def historico():
        operacoes = Operacao.query.filter_by(usuario_id=current_user.id).order_by(Operacao.criado_em.desc(), Operacao.id.desc()).all()
        return render_template("historico.html", operacoes=operacoes)

    @app.route("/relatorios")
    @login_required
    def relatorios():
        filtro_usuario = Operacao.usuario_id == current_user.id
        resumo = db.session.query(
            func.count(Operacao.id),
            func.coalesce(func.sum(Operacao.valor), 0),
            func.coalesce(func.sum(Operacao.valor_porcentagem), 0),
        ).filter(filtro_usuario).one()
        jogadores = db.session.query(
            Operacao.nome_jogador,
            func.count(Operacao.id).label("total_operacoes"),
            func.coalesce(func.sum(Operacao.valor), 0).label("valor_total"),
            func.coalesce(func.sum(Operacao.valor_porcentagem), 0).label("ganhos_total"),
        ).filter(filtro_usuario).group_by(Operacao.nome_jogador).order_by(func.sum(Operacao.valor).desc()).all()
        return render_template(
            "relatorios.html",
            total_operacoes=resumo[0],
            valor_total=resumo[1],
            ganhos_total=resumo[2],
            jogadores=jogadores,
        )

    @app.route("/excluir-operacao/<int:id>", methods=["POST"])
    @login_required
    def excluir_operacao(id):
        operacao = Operacao.query.filter_by(id=id, usuario_id=current_user.id).first()
        if operacao is None:
            return redirect(url_for("historico"))
        try:
            db.session.delete(operacao)
            db.session.commit()
            db.session.expire_all()
            flash("Operação excluída definitivamente.", "sucesso")
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Erro ao excluir operação %s.", id)
            flash("Não foi possível excluir a operação.", "erro")
        return redirect(url_for("historico", atualizado=int(datetime.now(timezone.utc).timestamp())))


    @app.route("/operacao/<int:id>/print/<tipo>")
    @login_required
    def print_operacao(id, tipo):
        operacao = Operacao.query.filter_by(
            id=id,
            usuario_id=current_user.id,
        ).first_or_404()

        if tipo == "envio":
            dados = operacao.print_envio_dados
            mime = operacao.print_envio_mime
        elif tipo == "recebimento":
            dados = operacao.print_recebimento_dados
            mime = operacao.print_recebimento_mime
        else:
            return resposta_erro("Tipo de print inválido.", 404)

        if not dados:
            return resposta_erro("Print não disponível.", 404)

        return Response(
            bytes(dados),
            mimetype=mime or "image/png",
            headers={"Cache-Control": "private, max-age=300"},
        )

    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        return redirect(url_for("login"))

    logger.info("Rotas registradas com sucesso.")
