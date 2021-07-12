const { SlashCommand, MessageSelectMenu, MessageSelectMenuOption, MessageActionRow, Command } = require("gcommands");
const { MessageAttachment, Message } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

let flags = {
    gay: [
        [254, 1, 6],
        [252, 135, 4],
        [247, 229, 9],
        [1, 162, 56],
        [1, 91, 250],
        [163, 0, 141]
    ],
    lesbian: [
        [161, 2, 95],
        [181, 82, 146],
        [212, 97, 164],
        [238, 234, 233],
        [228, 172, 207],
        [202, 76, 88],
        [141, 27, 3]
    ],
    transgender: [
        [97, 202, 249],
        [226, 154, 200],
        [255, 255, 251],
        [226, 154, 200],
        [97, 202, 249],
    ],
    bisexual: [
        [214, 0, 111],
        [214, 0, 111],
        [115, 78, 148],
        [0, 55, 172],
        [0, 55, 172]
    ],
    pansexual: [
        [255, 33, 146],
        [253, 219, 0],
        [1, 147, 255]
    ],
    asexual: [
        [0, 0, 0],
        [162, 162, 162],
        [255, 255, 255],
        [127, 0, 129]
    ],
    intersex: [
        [237, 170, 250],
        [255, 255, 255],
        [164, 204, 239],
        [247, 182, 225],
        [255, 255, 255],
        [237, 170, 250]
    ],
    genderqueer: [
        [186, 124, 221],
        [255, 255, 255],
        [73, 128, 35]
    ],
    heterosexual: [
        [6, 6, 6],
        [53, 53, 53],
        [105, 105, 105],
        [186, 186, 186],
        [255, 255, 255]
    ]
}

let modifyData = (data, palette, contrast = 40, width, height) => {
    let dat = data;
    let switc = Math.round(height / palette.length);

    for (let i = 0; i < dat.data.length; i += 4) {
        let d = dat.data;
        let magn = (d[i], d[i + 1], d[i + 2]) / 3 / (100 - contrast);
        
        let j = i / 4;
        let y = Math.floor(j / width);
        let rw = Math.floor(y / switc);
        if (!palette[rw]) rw = palette.length - 1;

        d[i] = magn * palette[rw][0];
        d[i + 1] = magn * palette[rw][1];
        d[i + 2] = magn * palette[rw][2];
    }

    return dat;
}

module.exports = class Text extends Command {
    constructor(...args) {
        super(...args, {
            name: "pride",
            description: "Add's a pride gradient over an avatar",
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
            .setID(`prideSelecor`)
            .setMaxValues(1)
            .setMinValues(1)
            .addOptions(Object.entries(flags).map(([k, v]) => 
                new MessageSelectMenuOption()
                    .setLabel(k.split("-").map((xd) => xd[0].toUpperCase() + xd.slice(1).toLowerCase()).join(" "))
                    .setValue(`prideSelecor:${k}`)
                    .setDescription(`${k.split("-").map((xd) => xd[0].toUpperCase() + xd.slice(1).toLowerCase()).join(" ")} Flag 🏳️‍🌈`)
            ));

        let pickColorMsg = await respond({
            content: "**Pick a pride flag**",
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
            let modifiedData = await modifyData(data, flags[color], contrast, buffTyp[1].width, buffTyp[1].height);
            ctx.putImageData(modifiedData, 0, 0);

            let nbuffer = canvas.toBuffer(buffTyp[0].mime);

            menu.reply.send({
                ephemeral: false,
                content: `Here is your image! ${member}`,
                attachments: new MessageAttachment(nbuffer, `pride-${color}.${buffTyp[0].ext}`)
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