const { SlashCommand, MessageSelectMenu, MessageSelectMenuOption, MessageActionRow, Command } = require("gcommands");
const { MessageAttachment, Message } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

let palette = {
    "new-blurple": [88, 101, 242],
    "old-blurple": [114, 137, 218],
    "dark-blurple": [78, 93, 148],

    "hypesquad-yellow": [248, 165, 50],
    "brilliance-red": [244, 123, 103],
    "bravery-purple": [156, 132, 239],
    "balance-cyan": [69, 221, 192],

    "developer-blue": [62, 112, 221],
    "bug-hunter-green": [72, 183, 132],
    "partner-blue": [65, 135, 237],

    "not-quite-black": [35, 39, 42],
    "dark-mode-gray": [54, 57, 63],
    "grayple": [135, 170, 181],
    "dark-but-not-black": [44, 47, 51],

    "nitro-blue": [79, 93, 127],
    "nitro-gray": [183, 194, 206],
    "boost-pink": [244, 127, 255],

    "green": [87, 242, 135],
    "yellow": [254, 231, 92],
    "fuschia": [235, 69, 158],
    "red": [237, 66, 69]
}

let modifyData = (data, palette, contrast = 40) => {
    let dat = data;
    for (let i = 0; i < dat.data.length; i += 4) {
        let d = dat.data;
        let magn = (d[i], d[i + 1], d[i + 2]) / 3 / (100 - contrast);

        d[i] = magn * palette[0];
        d[i + 1] = magn * palette[1];
        d[i + 2] = magn * palette[2];
    }

    return dat;
}

module.exports = class Text extends Command {
    constructor(...args) {
        super(...args, {
            name: "blurple",
            description: "Blurpify an avatar",
            slash: true,
            expectedArgs: [
                {
                    name: "user",
                    type: SlashCommand.USER,
                    description: "The user's avatar to put a troll face over",
                    required: false
                },
                {
                    name: "url",
                    type: SlashCommand.STRING,
                    description: "The image URL to put a troll face over",
                    required: false
                },
                {
                    name: "contrast",
                    type: SlashCommand.INTEGER,
                    description: "The contrast to apply colors (0%-50%)",
                    required: false
                }
            ],
            guildOnly: process.env.guildId
        })
    }

    async run({client, member, guild, channel, respond, edit}, _, options) {
        let url;
        if (options.user) {
            let user = client.users.cache.get(options.user.match(/([0-9]+)/)[1]);
            if (!user) return respond({content: "Invalid User", ephemeral: true});
    
            url = await (client.modules.get("getavatar"))(user.displayAvatarURL({ format: "png", size: 512 }), user.displayAvatarURL({ format: "gif", size: 512 }));
        } else if (options.url) {
            url = options.url;
            try {
                new URL(url);
            } catch (e) {
                return respond({ content: "Invalid URL provided", ephemeral: true });
            }
        } else return respond({ content: "No input type was provided", ephemeral: true });

        channel.startTyping();
        let buffTyp = await (client.modules.get("getbuffer"))(url);
        if (!buffTyp) return respond({content: "Couldn't fetch image. Try again later", ephemeral: true});
        if (buffTyp[2] === "animated") return respond({content: "GIF's are currently not supported. Try something else", ephemeral: true});

        let dropdown = new MessageSelectMenu()
            .setPlaceholder("Select type")
            .setID(`blurpleSelector`)
            .setMaxValues(1)
            .setMinValues(1)
            .addOptions(Object.entries(palette).map(([k, v]) => 
                new MessageSelectMenuOption()
                    .setLabel(k.split("-").map((xd) => xd[0].toUpperCase() + xd.slice(1).toLowerCase()).join(" "))
                    .setValue(`blurpleSelector:${k}`)
                    .setDescription(`Color: ${k.split("-").map((xd) => xd[0].toUpperCase() + xd.slice(1).toLowerCase()).join(" ")}`)
            ));

        let pickColorMsg = await respond({
            content: "**Pick a color**",
            components: new MessageActionRow().addComponent(dropdown)
        });

        const filter = async(menu) => menu.clicker.user.id == member.id;
        let input = await pickColorMsg.createSelectMenuCollector(filter, { max: 1, time: 60000 });
        input.on("collect", async(menu) => {
            await edit({
                content: "**Generating your image. Please be patient**",
                components: []
            });

            let color = menu.values[0].split(":")[1];

            let canvas = createCanvas(buffTyp[1].width, buffTyp[1].height);
            let ctx = canvas.getContext("2d");
            let img = await loadImage(buffTyp[3]);

            ctx.drawImage(img, 0, 0);
            let data = await ctx.getImageData(0, 0, canvas.width, canvas.height);

            let contrast = parseInt(options.contrast) || 40;
            contrast = contrast < 0 ? 0 : contrast > 50 ? 50 : contrast;
            let modifiedData = await modifyData(data, palette[color], contrast);
            ctx.putImageData(modifiedData, 0, 0);

            let nbuffer = canvas.toBuffer(buffTyp[0].mime);

            menu.reply.send({
                ephemeral: false,
                content: `Here is your image! ${member}`,
                attachments: new MessageAttachment(nbuffer, `blurpified.${buffTyp[0].ext}`)
            });
            channel.stopTyping(true);
        });

        input.once("end", (menu) => {
            if (menu.size !== 0) return;
            edit({
                content: "**You haven't picked a color.**",
                components: []
            });
        });
    }
};