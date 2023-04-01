import { PlaceData } from "@googlemaps/google-maps-services-js";
import dotenv from "dotenv";
import qrcode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import FindEstablishments from "./GoogleAPI";

dotenv.config();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
});

const googleAPI = new FindEstablishments();

let latitude: number | undefined = undefined;
let longitude: number | undefined = undefined;
let establishments: Partial<PlaceData>[] | undefined = undefined;

client.on("qr", (qr) => {
    console.log("QR RECEIVED", qr);
    qrcode.generate(qr, { small: true });
});

client.on("message", async (message) => {
    if (message.location) {
        latitude = Number(message.location.latitude);
        longitude = Number(message.location.longitude);
        message.reply("Localização armazenada com sucesso.\nBuscando restaurantes e fast-foods em um raio de 5km...");

        const finded = await googleAPI.findRestaurant(latitude, longitude);

        if (!finded) {
            return message.reply("Nem um restaurante encontrado próximo a sua localização.");
        } else {
            establishments = finded;
            client.sendMessage(message.from, "Os estabelecimentos encontrados foram:");
            const results = finded.map((item, index) => {
                return `${item.name}\n`;
            });

            client.sendMessage(message.from, results.join(""));

            return client.sendMessage(message.from, "Digite o nome do estabelecimento que deseja obter o endereço.");
        }
    }

    if (message.body.toLocaleLowerCase() === "restart") {
        latitude = 0;
        longitude = 0;
        establishments = undefined;
        return message.reply("Aplicação reiniciada com sucesso.\nPara começar envie sua localização.");
    }

    if (
        message.body.toLocaleLowerCase() === "stop" ||
        message.body.toLocaleLowerCase() === "cancel" ||
        message.body.toLocaleLowerCase() === "parar"
    ) {
        latitude = 0;
        longitude = 0;
        establishments = undefined;
        return message.reply("Procedimento interrompido com sucesso.");
    }

    const response = googleAPI.getResponse(establishments, message.body);
    client.sendMessage(message.from, response);
});

client.on("ready", () => {
    console.log("Client is ready!");
});

client.initialize();
