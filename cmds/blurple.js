const { MessageAttachment, MessageEmbed, APIMessage } = require("discord.js")
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");
const Axios = require("axios");
const extractFrames = require("gif-extract-frames");
const GIFEncoder = require('gif-encoder-2');

let config = {
    oversaturate: true,
    heat: 45,
    colorize: [112, 135, 215],
    colors: {
        newBlurple: [88, 101, 242],
        oldBlurple: [114, 137, 218],
        darkBlurple: [78, 93, 148],
        green: [87, 242, 135],
        yellow: [254, 231, 92],
        fuschia: [235, 69, 158],
        red: [237, 66, 69],
    }
};

const downloadURL = async (url, name) => {
    await (async () => new Promise(async res => {
        let r = await Axios({
            url,
            method: "GET",
            responseType: "arraybuffer"
        });

        fs.writeFile(name, r.data, (e) => {
            if (!e) res();
        })
    }))();
}

const modifyData = async (data, palette, heat) => {
    let dat = data;
    for (let i = 0; i < dat.data.length; i += 4) {
        let d = dat.data;
        let magn = (d[i], d[i + 1], d[i + 2]) / 3 / (100 - (heat || config.heat));
        if (!config.oversaturate) magn = magn > 1 ? 1 : magn;

        d[i] = magn * palette[0];
        d[i + 1] = magn * palette[1];
        d[i + 2] = magn * palette[2];
    }

    return dat;
}

const checkUrl = async (url) => {
    let exists = false;

    let resp = await fetch(url);

    if (resp.status === 200) exists = true;

    return exists;
}

module.exports = {
    name: "blurple",
    description: "Discord Brand Filters",
    guildOnly: "839570713220218910",
    expectedArgs: [
        {
            name: "type",
            description: "Color type",
            type: "3",
            required: true,
            choices: [
                {
                    name: "Old Blurple",
                    value: "oldBlurple"
                },
                {
                    name: "New Blurple",
                    value: "newBlurple"
                },
                {
                    name: "Dark Blurple",
                    value: "darkBlurple"
                },
                {
                    name: "Green",
                    value: "green"
                },
                {
                    name: "Yellow",
                    value: "yellow"
                },
                {
                    name: "Fuschia",
                    value: "fuschia"
                },
                {
                    name: "Red",
                    value: "red"
                }
            ]
        },
        {
            name: "user",
            description: "User",
            type: "6",
            required: false
        },
        {
            name: "url",
            description: "Url",
            type: "3",
            required: false
        },
        {
            name: "heat",
            description: "The heat of recoloring",
            type: "4",
            required: false
        }
    ],
    run: async (client, slash) => {
        var args = slash.data.options;
        var channel = client.channels.cache.get(slash.channel_id);
        var guild = client.guilds.cache.get(slash.guild_id);
        var guildMember = guild.members.cache.get("839570771574915144")

        if (!args || args && !args[0]) return { content: `Need type, url or user arg`, ephemeral: true }

        if (args[0].name === "type" && (args[1].name === "user" || args[1].name === "url")) {
            client.api.interactions(slash.id, slash.token).callback.post({
                data: {
                  type: 4,
                  data: {
                      content: "Your Image is loading!"
                  }
                },
            })

            var member = guild.members.cache.get(args[1].value.replace(/[!@<>]/g, ''));

            let theURL = args[1].value;
            let isGif = false;
            if (member) {
                theURL = member.user.displayAvatarURL({ size: 4096, format: "png" });

                if (await checkUrl(member.user.displayAvatarURL({ size: 4096, format: "gif" }))) {
                    isGif = true;
                    theURL = member.user.displayAvatarURL({ size: 4096, format: "gif" });
                }
            } else {
                let u = new URL(theURL);

                if(![".png",".gif",".jpg"].some(v => u.pathname.endsWith(v))) {
                    channel.send(`Unsupported image type (gif/png/jpg only)! <@${slash.member.user.id}>`, { reply: { messageReference: guildMember.lastMessageID }})
                    return;
                }
                if (u.pathname.endsWith(".gif")) isGif = true;
            }

            let heat = args[2] ? parseInt(args[2].value) : undefined;
            let palette = config.colors[args[0].value];
            if (!palette) {
                palette = config.colors.oldBlurple;
                args[0].value = "oldBlurple";
            };

            if (isGif) {
                let kf = Date.now();
                await downloadURL(theURL, __dirname + `/../temp/gifs/${kf}.gif`);

                let rs = await extractFrames({
                    input: __dirname + `/../temp/gifs/${kf}.gif`,
                    output: __dirname + `/../temp/frames/${kf}-%d.png`
                });

                let names = fs.readdirSync(__dirname + `/../temp/frames/`).filter(v => v.startsWith(kf + "-")).sort((a, b) => parseInt(a.split("-")[1]) > parseInt(b.split("-")[1]) ? 1 : -1);
                
                let imgs = [];
                for (let i = 0; i < names.length; i++) {
                    let n = names[i];
                    
                    let img = await loadImage(__dirname + `/../temp/frames/${n}`);
                    imgs.push(img);
                }

                const encoder = new GIFEncoder(imgs[0].width, imgs[0].height);
                encoder.setDelay(0);
                encoder.start();
                
                for (let i = 0; i < imgs.length; i++) {
                    let img = imgs[i];

                    const canvas = createCanvas(img.width, img.height);
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    let data = ctx.getImageData(0, 0, img.width, img.height);
    
                    let nData = await modifyData(data, palette, heat);
                    ctx.putImageData(nData, 0, 0);
                    encoder.addFrame(ctx);
                }

                encoder.finish();

                let blurpled = encoder.out.getData();

                channel.send(`Your Image is ready! <@${slash.member.user.id}>`, {
                    reply: { messageReference: guildMember.lastMessageID },
                    files: [{
                        attachment: blurpled,
                        name: `${args[0].value}.gif`
                    }]
                }).catch(e => {
                    channel.send(`Image has more than 8 mb. <@${slash.member.user.id}>`)
                });

                setTimeout(() => {
                    fs.unlinkSync(__dirname + `/../temp/gifs/${kf}.gif`);
                    for (let i = 0; i < names.length; i++) {
                        fs.unlinkSync(__dirname + `/../temp/frames/${names[i]}`);
                    }
                }, 3000);
            } else {
                let img = await loadImage(theURL);
    
                const canvas = createCanvas(img.width, img.height);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                let data = ctx.getImageData(0, 0, img.width, img.height);
    
                let nData = await modifyData(data, palette, heat);
                ctx.putImageData(nData, 0, 0);
    
                let blurpled = await canvas.toBuffer("image/png");

                channel.send(`Your Image is ready! <@${slash.member.user.id}>`, {
                    reply: { messageReference: guildMember.lastMessageID },
                    files: [{
                        attachment: blurpled,
                        name: `${args[0].value}.png`
                    }]
                }).catch(e => {
                    channel.send(`Image has more than 8 mb. <@${slash.member.user.id}>`)
                });
            }

        }

        return `Fou`
    }
};