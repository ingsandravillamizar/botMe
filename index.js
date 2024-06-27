    /*  @whiskeysockets/baileys: Biblioteca para interactuar con la API de WhatsApp Web.
        makeWASocket: Función para crear una instancia de socket de WhatsApp.
        DisconnectReason: Enum para las razones de desconexión.
        useMultiFileAuthState: Maneja el estado de autenticación en archivos múltiples.  
    */
                const {
                    default: makeWASocket,
                    DisconnectReason,
                    useMultiFileAuthState,
                } = require("@whiskeysockets/baileys");



            const log = require("pino")();                     /*Biblioteca para logging rápido y de bajo costo. */
            const { Boom } = require("@hapi/boom");            /*Manejo de errores HTTP.*/
            const express = require("express");                /*Framework web para Node.js.*/
            const fileUpload = require("express-fileupload");  /*Middleware para manejar la carga de archivos.*/
            const cors = require("cors");                      /*Middleware para permitir solicitudes de origen cruzado.*/
            const bodyParser = require("body-parser");         /*Middleware para analizar el cuerpo de las solicitudes HTTP.*/ 
            const qrcode = require("qrcode");                  /*Biblioteca para generar códigos QR.*/
            const qrcodeTerminal = require("qrcode-terminal"); /*Biblioteca para generar códigos QR en la terminal.*/
            const http = require("http");                      /*Módulo de Node.js para crear un servidor HTTP.*/ 
            const socketIo = require("socket.io");             /*Biblioteca para la comunicación en tiempo real mediante WebSockets.*/ 
            const path = require("path");                      /*Módulo de Node.js para manejar y transformar rutas de archivos.*/ 
            const fs = require("fs");                          /*Módulo de Node.js para manipular el sistema de archivos.*/ 


    /* Configuracion del Servidor Express */
            const app = express();
            app.use(fileUpload({ createParentPath: true }));
            app.use(cors());                                   
            app.use(bodyParser.json());                         /*Analiza los cuerpos de las solicitudes en JSON y URL encoded.*/
            app.use(bodyParser.urlencoded({ extended: true }));
            const server = http.createServer(app);
            const io = socketIo(server);
            const port = process.env.PORT || 8000;

    
    /*Rutas para servir el archivo HTML del escaneo QR y una ruta de prueba (/). */
            app.use("/assets", express.static(path.join(__dirname, "client/assets")));
            
            app.get("/scan", (req, res) => {
                res.sendFile("./client/index.html", { root: __dirname });
            });
            
            app.get("/", (req, res) => {
                res.send("Server working");
            });


    /* Conexión a WhatsApp */        

            let sock;
            let qrDinamic;
            let soket;
            
            async function connectToWhatsApp() {
                const { state, saveCreds } = await useMultiFileAuthState("session_auth_info");
            
                sock = makeWASocket({
                printQRInTerminal: true,
                auth: state,
                logger: log,
                });
            
                sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect, qr } = update;
                qrDinamic = qr;
                if (qr) {
                    qrcodeTerminal.generate(qr, { small: true }); // Mostrar QR en la terminal
                }
                if (connection === "close") {
                    let reason = new Boom(lastDisconnect.error).output.statusCode;
                    handleDisconnect(reason);
                } else if (connection === "open") {
                    console.log("Conexión abierta");
                }
                });
            
                sock.ev.on("messages.upsert", async ({ messages, type }) => {
                if (type === "notify" && !messages[0]?.key.fromMe) {
                    handleMessage(messages[0]);
                }
                });
            
                sock.ev.on("creds.update", saveCreds);
            }
    /* Manejo de Desconexiones  */        
            function handleDisconnect(reason) {
                if (reason === DisconnectReason.badSession) {
                console.log(`Bad Session File, Please Delete session and Scan Again`);
                sock.logout();
                } else if (reason === DisconnectReason.connectionClosed) {
                console.log("Conexión cerrada, reconectando....");
                connectToWhatsApp();
                } else if (reason === DisconnectReason.connectionLost) {
                console.log("Conexión perdida del servidor, reconectando...");
                connectToWhatsApp();
                } else if (reason === DisconnectReason.connectionReplaced) {
                console.log("Conexión reemplazada, otra nueva sesión abierta, cierre la sesión actual primero");
                sock.logout();
                } else if (reason === DisconnectReason.loggedOut) {
                console.log(`Dispositivo cerrado, elimínelo y escanee de nuevo.`);
                sock.logout();
                } else if (reason === DisconnectReason.restartRequired) {
                console.log("Se requiere reinicio, reiniciando...");
                connectToWhatsApp();
                } else if (reason === DisconnectReason.timedOut) {
                console.log("Se agotó el tiempo de conexión, conectando...");
                connectToWhatsApp();
                } else {
                sock.end(`Motivo de desconexión desconocido: ${reason}|${lastDisconnect.error}`);
                }
            }

    /*Manejo de Mensajes */
            async function handleMessage(message) {
                const captureMessage = message.message?.conversation;
                const numberWa = message.key?.remoteJid;
                const compareMessage = captureMessage.toLocaleLowerCase();
            
                if (compareMessage === "ping") {
                await sock.sendMessage(numberWa, { text: "Pong" }, { quoted: message });
                } else {
                await sock.sendMessage(numberWa, { text: "Soy un robot" }, { quoted: message });
                }
            }
    /*Comprobación de Conexión */
            const isConnected = () => {
                return sock?.user ? true : false;
            };

    /*Envío de Mensajes desde una Ruta API */
            app.get("/send-message", async (req, res) => {
                const tempMessage = req.query.message;
                const number = req.query.number;

            if (!number) {
            return res.status(500).json({ status: false, response: "El numero no existe" });
            }
        
            const numberWA = "591" + number + "@s.whatsapp.net";
        
            if (isConnected()) {
            const exist = await sock.onWhatsApp(numberWA);
            if (exist?.jid || (exist && exist[0]?.jid)) {
                sock.sendMessage(exist.jid || exist[0].jid, { text: tempMessage })
                .then(result => res.status(200).json({ status: true, response: result }))
                .catch(err => res.status(500).json({ status: false, response: err }));
            } else {
                res.status(500).json({ status: false, response: "Número no está en WhatsApp" });
            }
            } else {
            res.status(500).json({ status: false, response: "Aun no estas conectado" });
            }
        });

    /*Comunicación en Tiempo Real con Socket.io */
    io.on("connection", async (socket) => {
        soket = socket;
        if (isConnected()) {
        updateQR("connected");
        } else if (qrDinamic) {
        updateQR("qr");
        }
    });


    const updateQR = (data) => {
        switch (data) {
        case "qr":
            qrcode.toDataURL(qrDinamic, (err, url) => {
            soket?.emit("qr", url);
            soket?.emit("log", "QR recibido , scan");
            });
            break;
        case "connected":
            soket?.emit("qrstatus", "./assets/check.svg");
            soket?.emit("log", "usuario conectado");
            const { id, name } = sock?.user;
            soket?.emit("user", `${id} ${name}`);
            break;
        case "loading":
            soket?.emit("qrstatus", "./assets/loader.gif");
            soket?.emit("log", "Cargando ....");
            break;
        }
    };

    /*Iniciar la Conexión y el Servidor */
    
    connectToWhatsApp().catch(err => console.log("unexpected error: " + err));
    server.listen(port, () => {
        console.log("Server Run Port : " + port);
    });
