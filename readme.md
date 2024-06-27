
#Creacion Proyecto
                        npm init -y
                        npm install @whiskeysockets/baileys express express-fileupload cors body-parser qrcode qrcode-terminal socket.io pino @hapi/boom

                                @whiskeysockets/baileys: Para interactuar con la API de WhatsApp Web.
                                express: Framework web para crear un servidor HTTP y manejar rutas.
                                express-fileupload: Middleware para manejar la carga de archivos en Express.
                                cors: Middleware para permitir solicitudes de origen cruzado.
                                body-parser: Middleware para analizar el cuerpo de las solicitudes HTTP.
                                qrcode: Biblioteca para generar códigos QR (para el QR escaneable por la web).
                                qrcode-terminal: Biblioteca para generar códigos QR en la terminal (útil para depuración y pruebas).
                                socket.io: Para la comunicación en tiempo real entre cliente y servidor.
                                pino: Biblioteca de logging rápida y de bajo costo.
                                @hapi/boom: Biblioteca para manejar errores HTTP de manera estructurada.

                        mkdir -p client/assets

#Ejecucion :  node index.js
http://localhost:8000/scan