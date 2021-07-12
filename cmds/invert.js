const { SlashCommand, MessageSelectMenu, MessageSelectMenuOption, MessageActionRow, Command } = require("gcommands");
const { MessageAttachment, Message } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

let modifyData = (data) => {
    let dat = data;
    for (let i = 0; i < dat.data.length; i += 4) {
        let d = dat.data;

        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
    }

    return dat;
}

module.exports = class Text extends Command {
    constructor(...args) {
        super(...args, {
            name: "invert",
            description: "Inverts the color of an avatar",
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

        ctx.drawImage(img, 0, 0);
        let data = await ctx.getImageData(0, 0, canvas.width, canvas.height);
        let modifiedData = await modifyData(data);
        ctx.putImageData(modifiedData, 0, 0);

        let nbuffer = canvas.toBuffer(buffTyp[0].mime);

        respond({
            ephemeral: false,
            content: `Here is your image! ${member}`,
            attachments: new MessageAttachment(nbuffer, `inverted.${buffTyp[0].ext}`)
        });
        channel.stopTyping(true);
    }
};