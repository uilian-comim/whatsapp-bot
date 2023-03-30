import { PlaceData } from "@googlemaps/google-maps-services-js";
import { Client, LocalAuth } from "whatsapp-web.js";
import FindEstablishments from "./GoogleAPI";

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: false },
});

const googleAPI = new FindEstablishments();

let latitude: number | undefined = undefined;
let longitude: number | undefined = undefined;
let establishments: Partial<PlaceData>[] | undefined = undefined;

client.on("qr", (qr) => {
    console.log("QR RECEIVED", qr);
});

client.on("message", async (message) => {
    if (message.location) {
        console.log(message.location);
        latitude = Number(message.location.latitude);
        longitude = Number(message.location.longitude);
        message.reply("Localização armazenada com sucesso.\nBuscando restaurantes e fast-foods em um raio de 5km...");
    }

    if (!latitude || !longitude) {
        return message.reply("Para usar meus serviços você deve primeiro enviar sua localização.");
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

    if (!establishments) {
        const finded = await googleAPI.findRestaurant(latitude, longitude);

        if (!finded) {
            return message.reply("Nem um restaurante encontrado próximo a sua localização.");
        } else {
            establishments = finded;
            message.reply("Os estabelecimentos encontrados foram:");
            const test = finded.map((item, index) => {
                return `${item.name}\n`;
            });

            message.reply(`${test.join("")}`, undefined, {
                quotedMessageId: undefined,
            });

            return message.reply("Digite o nome do estabelecimento que deseja saber a localidade.");
        }
    } else {
        const result = googleAPI.filterResult(establishments, message.body);

        if (!result) {
            return message.reply(
                "Estabelecimento informado não encontrado.\nSe deseja reiniciar o procedimento digite: *Restart*"
            );
        } else {
            return message.reply(`O estabelecimento mencionado se encontra em: ${result}`);
        }
    }
});

client.on("ready", () => {
    console.log("Client is ready!");
});

client.initialize();
