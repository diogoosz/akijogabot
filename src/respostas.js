const atendimentos = new Map();

export async function mensagensEnviadas(sock, m) {
  const textoOriginal =
    m.message?.conversation || m.message?.extendedTextMessage?.text || "";
  const msg = textoOriginal.toLowerCase().trim();

  const jid = m.key.remoteJid;
  const fromMe = m.key.fromMe;
  const nome = m.pushName || "Usuário";

  if (fromMe && msg === "obrigado!") {
    const lidParaRemover = jid.endsWith("@lid")
      ? jid
      : await sock.signalRepository.lidMapping.getLIDForPN(jid);
    await sock.sendMessage(jid, {
      text: `✅ *Atendimento encerrado.*\nObrigado pela preferência! Se precisar de algo, é só chamar novamente.`,
    });

    if (lidParaRemover) {
      atendimentos.delete(lidParaRemover);
      console.log(`Atendimento encerrado para ${lidParaRemover}`);
    }
    return;
  }

  if (fromMe || !msg) return;

  const horaAtual = new Date().getHours();
  if (horaAtual >= 19 || horaAtual < 8) {
    await sock.sendMessage(jid, {
      text: "`Olá ${nome}! Nosso horário de atendimento é das 08:00 às 19:00. No momento estamos fechados, mas deixe sua mensagem e retornaremos assim que possível! 🌙`"
    });
    return;
  }

  if (atendimentos.get(jid) === "humano") return;

  if (msg === "atendente") {
    await sock.sendMessage(jid, {
      text: "Um atendente humano irá te responder em breve. Obrigado!",
    });
    atendimentos.set(jid, "humano");
    return;
  }

  const estadoAtual = atendimentos.get(jid) || "inicio";

  if (estadoAtual === 'inicio') {
        const menuInicial = "Você está falando diretamente com a *AKIJOGA LOTERIAS*, seja bem vindo!\n\nEscolha uma opção:\n1 - Participar de um bolão\n2 - Fazer um jogo";
        await sock.sendMessage(jid, { text: menuInicial });
        atendimentos.set(jid, 'menu_principal');
        return;
    }

    if (estadoAtual === 'menu_principal') {
        if (msg === '1') {
            const menuLoterias = "ESCOLHA A MODALIDADE:\nDigite o numero referente a sua escolha\n\n1 - MEGA SENA\n2 - LOTOFÁCIL\n3 - QUINA\n4 - + MILIONÁRIA\n5 - TIMEMANIA\n6 - DUPLA SENA\n7 - SUPER SETE\n8 - DIA DE SORTE\n9 - LOTOMANIA";
            await sock.sendMessage(jid, { text: menuLoterias });
            atendimentos.set(jid, 'menu_loterias');
        } else if (msg === '2') {
            await sock.sendMessage(jid, { text: "OK!\nEm breve um atendente irá falar com você" });
            atendimentos.set(jid, 'atendimento');
        } else {
            await sock.sendMessage(jid, { text: "⚠️ Não entendi.\n\nEscolha uma opção:\n1 - Participar de um bolão\n2 - Fazer um jogo" });
        }
        return;
    }

    if (estadoAtual === 'menu_loterias') {
        const opcoesValidas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
        if (opcoesValidas.includes(msg)) {
            await sock.sendMessage(jid, { text: "OK!\nEm breve um atendente irá falar com você" });
            atendimentos.set(jid, 'atendimento');
        } else {
            await sock.sendMessage(jid, { text: "⚠️ Opção inválida. Digite o número de 1 a 9 referente à loteria desejada." });
        }
        return;
    }

}
