import { PlaceData } from "@googlemaps/google-maps-services-js";
import dotenv from "dotenv";
import { Client, LocalAuth } from "whatsapp-web.js";
import FindEstablishments from "./GoogleAPI";

dotenv.config();

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
        return message.reply("Erro desconhecido. Contate um administrador.");
    } else {
        const result = googleAPI.filterResult(establishments, message.body);

        if (!result) {
            return message.reply(
                "Estabelecimento informado não encontrado.\nSe deseja reiniciar o procedimento digite: *Restart*"
            );
        } else {
            if (!result.name && !result.address) {
                return client.sendMessage(
                    message.from,
                    "Não foi possível obter o endereço e nome do estabelecimento. Contate um administrador."
                );
            }

            if (!result.address) {
                return client.sendMessage(
                    message.from,
                    `Não foi possível obter o endereço do estabelecimento ${result.name}`
                );
            }

            if (!result.name) {
                return message.reply(`O estabelecimento mencionado por você se encontra em: ${result.address}`);
            }

            if (result.name && result.address) {
                return message.reply(`O estabelecimento ${result.name} se encontra em: ${result.address}`);
            }

            return client.sendMessage(message.from, "Erro desconhecido. Contate um administrador.");
        }
    }
});

client.on("ready", () => {
    console.log("Client is ready!");
});

client.initialize();
