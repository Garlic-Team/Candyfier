const { MessageAttachment, MessageEmbed, APIMessage } = require("discord.js")
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");
const Axios = require("axios");
const extractFrames = require("gif-extract-frames");
const GIFEncoder = require('gif-encoder-2');

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

const modifyData = async (data) => {
    let dat = data;
    for (let i = 0; i < dat.data.length; i += 4) {
        let d = dat.data;

        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
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
    name: "invert",
    description: "Invert image :D",
    expectedArgs: [
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
        }
    ],
    run: async ({client, channel, guild, respond, edit}, args) => {
        if (!args || args && !args[0]) return { content: `Need url or user arg`, ephemeral: true }

        if (args[0]) {
            respond("Your Image is loading!")

            let memberFromArgs = guild.members.cache.get(args[0].replace(/[!@<>]/g, ''));

            let theURL = args[0];
            let isGif = false;
            if (memberFromArgs) {
                theURL = memberFromArgs.user.displayAvatarURL({ size: 4096, format: "png" });

                if (await checkUrl(memberFromArgs.user.displayAvatarURL({ size: 4096, format: "gif" }))) {
                    isGif = true;
                    theURL = memberFromArgs.user.displayAvatarURL({ size: 4096, format: "gif" });
                }
            } else {
                let u = new URL(theURL);

                if(![".png",".gif",".jpg"].some(v => u.pathname.endsWith(v))) {
                    respond(`Unsupported image type (gif/png/jpg only)!`)
                    return;
                }
                if (u.pathname.endsWith(".gif")) isGif = true;
            }

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
    
                    let nData = await modifyData(data);
                    ctx.putImageData(nData, 0, 0);
                    encoder.addFrame(ctx);
                }

                encoder.finish();

                let invert = encoder.out.getData();

                edit({
                  content: `Your Image is ready! <@${member.user.id}>`,
                  attachments: new MessageAttachment(invert, `${args[0]}.gif`)
                }).catch(e => {
                    edit(`Image has more than 8 mb. <@${member.user.id}>`)
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
    
                let nData = await modifyData(data);
                ctx.putImageData(nData, 0, 0);
    
                let invert = await canvas.toBuffer("image/png");

                edit({
                  content: `Your Image is ready! <@${member.user.id}>`,
                  attachments: new MessageAttachment(invert, `${args[0]}.png`)
                }).catch(e => {
                  console.log(e)
                    edit(`Image has more than 8 mb. <@${member.user.id}>`)
                });
            }

        }

        return `Fou`
    }
};
