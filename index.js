require("dotenv").config()

const Discord = require("discord.js")
const { GCommands } = require("gcommands")
const client = new Discord.Client({
    intents: Discord.Intents.ALL
});
const fs = require('fs');

client.on("ready", () => {
    new GCommands(client, {
        cmdDir: "cmds",
        language: "english",
        unkownCommandMessage: false,
        slash: {
           slash: 'true',
           prefix: 'QPWEPOJCKKCJNKCNKLYBNCMBEQWIOQWHEIQWEUIODHASKFHKASFHASKF'
        },
        defaultCooldown: 3
    })

    setInterval(() => {
        autoAvatar()
    }, 7200000)
    autoAvatar()

    client.user.setPresence({ activities: [{ name: 'candyfier' }], status: "invisible" });
})

client.on("gDebug",(debug)=>{console.log(debug)})

client.login(process.env.token)

async function autoAvatar() {
    var json = fs.readFileSync("./autoavatar.txt");
    if(json.last < Date.now()) {
        let avatars = [
            "https://cdn.discordapp.com/attachments/839570713220218913/843086224025845780/fuschia.png",  // Fuschia
            "https://cdn.discordapp.com/attachments/843082289814044682/843085609274441738/blurple.png", //  Blurple
            "https://cdn.discordapp.com/attachments/839570713220218913/843087019373494282/green.png",  //   Green
            "https://cdn.discordapp.com/attachments/839570713220218913/843087128421466112/red.png",   //    Red
            "https://cdn.discordapp.com/attachments/839570713220218913/843087281417486366/yellow.png"//     Yellow
        ];
        client.user.setAvatar(avatars[json.avatar]);
        client.guilds.cache.get("839570713220218910").setIcon(avatars[json.avatar])

        if (json.avatar === avatars.length - 1) json.avatar = -1; // přidá se tam +1 :d

        let data = {
            avatar: json.avatar + 1,
            last: Date.now() + 7200000
        }
        fs.writeFileSync("./autoavatar.txt", JSON.stringify(data));
    } else {
        console.log("smola")
    }
}
