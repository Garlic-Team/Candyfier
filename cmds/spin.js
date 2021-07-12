const { SlashCommand, MessageSelectMenu, MessageSelectMenuOption, MessageActionRow, Command } = require("gcommands");
const { MessageAttachment, Message } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");
const gifEncoder = require("gif-encoder-2");

module.exports = class Text extends Command {
    constructor(...args) {
        super(...args, {
            name: "spin",
            description: "Spins an avatar",
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
                    name: "speed",
                    type: SlashCommand.INTEGER,
                    description: "Speed (8-20)",
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

        let speed = (20 - parseInt(options.speed)) || (20 - 8);
        speed = speed < 8 ? 8 : speed > 20 ? 20 : speed;
        let addX = 360 / speed;

        let encoder = new gifEncoder(canvas.width, canvas.height);
        encoder.setDelay(1);
        encoder.start();

        for (let i = 0; i < 360; i += addX) {
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.translate(buffTyp[1].width / 2, buffTyp[1].height / 2);
            ctx.rotate((Math.PI / 180) * i);
            ctx.drawImage(img, -buffTyp[1].width / 2, -buffTyp[1].height / 2, buffTyp[1].width, buffTyp[1].height);
            ctx.restore();
            encoder.addFrame(ctx);
        }

        encoder.finish();
        let buff = encoder.out.getData();

        respond({
            ephemeral: false,
            content: `Here is your image! ${member}`,
            attachments: new MessageAttachment(buff, `spin.gif`)
        });
        channel.stopTyping(true);
    }
};