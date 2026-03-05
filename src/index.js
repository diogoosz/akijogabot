import makeWASocket, {
  DisconnectReason,
  fetchLatestWaWebVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import P from "pino";
import readline from "readline";
import { mensagensEnviadas } from "./respostas.js";

const question = (message) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    }),
  );
};

const onlyNumbers = (text) => text.replace(/[^0-9]/g, "");

const { version, isLatest } = await fetchLatestWaWebVersion();

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "error" }),
    browser: ["Ubuntu", "Chrome", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: true,
    shouldIgnoreJid: (jid) => {
      return jid?.endsWith("@g.us") || jid === "status@broadcast";
    },
  });

  if (!sock.authState.creds.registered) {
    const phoneNumber = await question(
      "Digite o número do WhatsApp (ex: 5511999999999): ",
    );

    if (!phoneNumber) {
      throw new Error("Número de telefone inválido");
    }
    const code = await sock.requestPairingCode(onlyNumbers(phoneNumber));
    console.log(`\nSeu código de conexão é: ${code}\n`);
  }
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log("O bot akijoga está pronto para uso");
    }
  });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const m of messages) {
      if (!m.message) continue;
      const jid = m.key.remoteJid;
      if (jid === "status@broadcast" || jid.endsWith("@g.us")) continue;

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await mensagensEnviadas(sock, m);
    }
  });
}

startBot();
