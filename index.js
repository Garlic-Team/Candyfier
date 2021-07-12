const express=require("express"),app=express();app.get("/",function(e,p){p.send("Hello World")}),app.listen(3e3);

require("dotenv").config();
const Discord = require("discord.js");
const { GCommands, Color } = require("gcommands");
const fs = require("fs");
const client = new Discord.Client({
    intents: Discord.Intents.ALL
});
client.modules = new Discord.Collection();

for (let i = 0; i < fs.readdirSync(__dirname + "/modules").length; i++) {
    let f = fs.readdirSync(__dirname + "/modules")[i];
    try {
        client.modules.set(f.split(".")[0], require(`./modules/${f}`));
        console.log(new Color("&d[Modules] &e" + f.split(".")[0] + " &aloaded").getText())
    } catch(e) {
        console.log(new Color("&d[Modules] &e"+f.split(".")[0]+"&c" + e).getText());
    }
}

client.on("ready", () => {
    let gc = new GCommands(client, {
        unkownCommandMessage: false,
        cmdDir: "cmds/",
        language: "english",
        slash: {
           slash: 'true',
           prefix: 'c@'
        },
        defaultCooldown: 3
    });
    gc.on("log", console.log);
    gc.on("debug", console.log);

    let update = () => {
        let srvrs = client.guilds.cache.size;
        client.user.setPresence({ activities: [{ name: `candyfier | ${srvrs} Servers`, type: "COMPETING" }], status: "idle" }).catch(() => {});
    }

    setInterval(update, 60000);
    update();

});

client.login(process.env.token);