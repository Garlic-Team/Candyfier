const { MessageAttachment, MessageEmbed, APIMessage } = require("discord.js")
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");
const Axios = require("axios");
const extractFrames = require("gif-extract-frames");
const GIFEncoder = require('gif-encoder-2');

let config = {
    oversaturate: true,
    contrast: 45,
    colors: {
        "new-blurple": [88, 101, 242],
        "old-blurple": [114, 137, 218],
        "dark-blurple": [78, 93, 148],

        //"hypesquad-yellow": [248, 165, 50],
        "brilliance-red": [244, 123, 103],
        "bravery-purple": [156, 132, 239],
        "balance-cyan": [69, 221, 192],

        /*"developer-blue": [62, 112, 221],
        "bug-hunter-green": [72, 183, 132],
        "partner-blue": [65, 135, 237],

        "not-quite-black": [35, 39, 42],
        "dark-mode-gray": [54, 57, 63],
        "grayple": [135, 170, 181],
        "dark-but-not-black": [44, 47, 51],

        "nitro-blue": [79, 93, 127],
        "nitro-gray": [183, 194, 206],
        "boost-pink": [244, 127, 255],*/

        "green": [87, 242, 135],
        "yellow": [254, 231, 92],
        "fuschia": [235, 69, 158],
        "red": [237, 66, 69],
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

const modifyData = async (data, palette, contrast) => {
    let dat = data;
    for (let i = 0; i < dat.data.length; i += 4) {
        let d = dat.data;
        let magn = (d[i], d[i + 1], d[i + 2]) / 3 / (100 - (contrast || config.contrast));
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
    expectedArgs: [
        {
            name: "type",
            description: "Color type",
            type: "3",
            required: true,
            choices: Object.keys(config.colors).map(k => ({
              name: k.split("-").map(x => x[0].toUpperCase() + x.slice(1).toLowerCase()).join(" "),
              value: k
            }))
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
            name: "contrast",
            description: `The contrast of recoloring - default ${config.contrast}`,
            type: "4",
            required: false
        }
    ],
    run: async ({client, member, guild, channel, respond, edit}, args, argsNoArray) => {
        if (!args || args && !args[0]) respond({ content: `Need type, url or user arg`, ephemeral: true })

        if (args[0] && args[1]) {
            respond("Your Image is loading!")

            let memberFromArgs = guild.members.cache.get(args[1].replace(/[!@<>]/g, ''));

            let theURL = args[1];
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

            let contrast = args[2] ? parseInt(args[2]) : undefined;
            let palette = config.colors[args[0]];
            if (!palette) {
                palette = config.colors.oldBlurple;
                args[0] = "oldBlurple";
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
    
                    let nData = await modifyData(data, palette, contrast);
                    ctx.putImageData(nData, 0, 0);
                    encoder.addFrame(ctx);
                }

                encoder.finish();

                let blurpled = encoder.out.getData();

                edit({
                  content: `Your Image is ready! <@${member.user.id}>`,
                  attachments: new MessageAttachment(blurpled, `${args[0]}.gif`)
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
    
                let nData = await modifyData(data, palette, contrast);
                ctx.putImageData(nData, 0, 0);
    
                let blurpled = await canvas.toBuffer("image/png");

                edit({
                  content: `Your Image is ready! <@${member.user.id}>`,
                  attachments: new MessageAttachment(blurpled, `${args[0]}.png`)
                }).catch(e => {
                  console.log(e)
                    edit(`Image has more than 8 mb. <@${member.user.id}>`)
                });
            }

        }
    }
};