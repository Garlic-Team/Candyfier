const { SlashCommand, MessageSelectMenu, MessageSelectMenuOption, MessageActionRow, Command } = require("gcommands");
const { MessageAttachment, Message } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

let modifyData = (data, troll, whitebg) => {
    let dat = data;
    for (let i = 0; i < dat.data.length; i += 4) {
        let d = dat.data;
        let tr = troll.data;

        let comp = (tr[i] + tr[i + 1] + tr[i + 2]) / 3;
        let val = 30;

        if (comp < val) {
            d[i] = comp;
            d[i + 1] = comp;
            d[i + 2] = comp;
        } else if (d[i + 3] < 60 && whitebg) {
            d[i] = 255 - d[i + 3];
            d[i + 1] = 255 - d[i + 3];
            d[i + 2] = 255 - d[i + 3];
        }

        d[i + 3] = tr[i + 3];
    }

    return dat;
}

module.exports = class Text extends Command {
    constructor(...args) {
        super(...args, {
            name: "troll",
            description: "Masks a beautiful troll face around an avatar",
            slash: true,
            expectedArgs: [
                {
                    name: "background",
                    type: 3,
                    description: "Color of the image's background",
                    required: true,
                    choices: [
                        {
                            name: "White",
                            value: "white"
                        },
                        {
                            name: "Black",
                            value: "black"
                        }
                    ]
                },
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

        let canvas = createCanvas(buffTyp[1].width, buffTyp[1].height);
        let ctx = canvas.getContext("2d");
        let img = await loadImage(buffTyp[3]);

        let canvas2 = createCanvas(buffTyp[1].width, buffTyp[1].height);
        let ctx2 = canvas2.getContext("2d");
        let img2 = await loadImage(__dirname + "/../images/trollface.png");
        ctx2.drawImage(img2, 0, 0, canvas2.width, canvas2.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let data = await ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data2 = await ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
        let modifiedData = await modifyData(data, data2, options.background === "white");
        ctx.putImageData(modifiedData, 0, 0);

        let nbuffer = canvas.toBuffer(buffTyp[0].mime);

        respond({
            ephemeral: false,
            content: `Here is your image! ${member}`,
            attachments: new MessageAttachment(nbuffer, `trolled.${buffTyp[0].ext}`)
        });
        channel.stopTyping(true);
    }
};