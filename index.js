
let chatgptkey = ""
let newsapikey = ""
let discordtoken = ""

let language = "English"
let ytplaylist = "PLk59VHffWyVxCxSCllFmYJAu4hhxrmC7j"





















// Do not touch anything below

const NewsAPI = require('newsapi');
const newsapi = new NewsAPI(newsapikey);
let fetch = require('node-fetch');
const { AudioPlayer, createAudioResource, StreamType, entersState, VoiceConnectionStatus, joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, getVoiceConnection } = require("@discordjs/voice");
const ytdl = require("ytdl-core")
const ytpl = require('ytpl');

const discordTTS = require("discord-tts");

let player = createAudioPlayer()


const { Client, GatewayIntentBits, ActivityType, ChannelType } = require('discord.js');
const googleTTS = require('google-tts-api');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({
    activities: [{ name: `Powered by BotVision`, type: ActivityType.Listening }],
    status: 'online',
  });

  client.guilds.cache.forEach((guild) => {
    guild.channels.cache.forEach(async (channel) => {
      let na = channel.name.toLowerCase();
      if (na.includes("radio")) {
        let connection = await joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator,
        });
        const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
          const newUdp = Reflect.get(newNetworkState, 'udp');
          clearInterval(newUdp?.keepAliveInterval);
        }
        connection.on('stateChange', (oldState, newState) => {
          Reflect.get(oldState, 'networking')?.off('stateChange', networkStateChangeHandler);
          Reflect.get(newState, 'networking')?.on('stateChange', networkStateChangeHandler);
        });
        connection.subscribe(player);
      }
    })
  })

  queue();


});



function start() {
  player = null
  player = createAudioPlayer()

  client.guilds.cache.forEach((guild) => {
    guild.channels.cache.forEach(async (channel) => {
      let na = channel.name.toLowerCase();
      if (na.includes("radio")) {
        let connection = getVoiceConnection(guild.id)
        const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
          const newUdp = Reflect.get(newNetworkState, 'udp');
          clearInterval(newUdp?.keepAliveInterval);
        }
        connection.on('stateChange', (oldState, newState) => {
          Reflect.get(oldState, 'networking')?.off('stateChange', networkStateChangeHandler);
          Reflect.get(newState, 'networking')?.on('stateChange', networkStateChangeHandler);
        });
        connection.subscribe(player);
      }
    })
  })

  const todaysDate = new Date()

  newsapi.v2.everything({
    sources: 'bbc-news,the-verge,abc-news,al-jazeera-english,ars-technica,cnn',
    from: todaysDate.getFullYear() + '-' + todaysDate.getMonth + '-' + todaysDate.getDay - 1,
    to: todaysDate.getFullYear() + '-' + todaysDate.getMonth + '-' + todaysDate.getDay,
    language: 'en',
    sortBy: 'relevancy',
    page: 1
  }).then(async response => {
    if (response.status != "ok") return

    const playlist = await ytpl(ytplaylist);


    let pi = playlist.items
    let elem = pi[Math.floor(Math.random() * pi.length)]
    let nextsong = elem.title;
    let url = elem.shortUrl;

    console.log("Song found: " + nextsong);
    let items = response.articles
    let item = items[Math.floor(Math.random() * items.length)]

    nextsong = nextsong.replace("[Official Music Video]", "").replace("(Lyrics)", "").replace("(Offizielles Musikvideo)", "").replace("(Official Video)", "").replace("-", "with").replace("(Visualizer)", "").replace("(Official Music Video)", "").replace("(Official Visualizer)", "")

    get(item, nextsong, url)
  });
}

async function get(item, nextsong, url) {


  let msg = 'Imagine you are an AI radio station (in language ' + language + '). Write it like this message is after a song. You should buy something about ' + item.title + ' now. Write it as if it could be broadcast directly, dont invent anything. Data: ' + item.description + '. Then say that the song ' + nextsong + ' you will play next.'
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + chatgptkey
    },
    body: '{"model": "gpt-3.5-turbo","messages": [{"role": "user", "content": "' + msg + '"}]}'
  });
  if (response.status == 200) {
    let json = await response.json();
    let msg = json.choices[0].message.content
    let final = msg.replace("KI", "AI")
    console.log(final);
    playaudio(url, final)
  } else {
    console.log("Error");
    console.log(response);
  }

}


async function playaudio(link, message) {

  let missingtts = await splitString(message)

  const stream = discordTTS.getVoiceStream(missingtts[0]);
  const audioResource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
  player.play(audioResource);

  player.on(AudioPlayerStatus.Idle, () => {
    missingtts.shift()
    if (missingtts.length == 0) {
      player.removeAllListeners()
      playsong(link)
      return
    }
    const stream = discordTTS.getVoiceStream(missingtts[0]);
    const audioResource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
    player.play(audioResource);
  });


}

function playsong(link) {

  let songurl = link
  const stream = ytdl(songurl, { filter: 'audioonly' });
  const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });


  player.play(resource, { seek: 0, volume: 0.3 });


  var listener = () => {
    queue();
    return;
  };
  player.on(AudioPlayerStatus.Idle, listener);


}

async function queue() {
  let count = await connectedUsers();

  if (count > 0) {
    setTimeout(() => {
      start();
    }, "1000");
    return;
  } else {
    setTimeout(() => {
      queue();
    }, "1000");
  }
}


async function connectedUsers() {
  let guilds = []
  let count = 0

  await client.guilds.cache.forEach(async (guild) => {



    await guild.channels.cache.forEach(async (channel) => {
      let na = channel.name.toLowerCase();
      if (na.includes("radio")) {

        if (!guilds.includes(guild.id)) {
          guilds.push(guild.id)
          channel.members.forEach(element => {
            count += 1
          });
        }
      }
    })
  })
  return count - guilds.length
}

client.on("guildCreate", async guild => {
  let defaultChannel = ""
  guild.channels.cache.forEach((channel) => {
    if (defaultChannel == "") {
      defaultChannel = channel.name
      channel.send("Thank you for adding the AI-Powered Radio. I have created an channel for you, **if you already have one, delete it. You can never have duplicates with the name 'radio' in it!**")
    }
  })


  let channel = await guild.channels.create({
    name: "radio",
    type: ChannelType.GuildVoice,
    parent: null,
  });

  let connection = await joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });
  const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
    const newUdp = Reflect.get(newNetworkState, 'udp');
    clearInterval(newUdp?.keepAliveInterval);
  }
  connection.on('stateChange', (oldState, newState) => {
    Reflect.get(oldState, 'networking')?.off('stateChange', networkStateChangeHandler);
    Reflect.get(newState, 'networking')?.on('stateChange', networkStateChangeHandler);
  });
  connection.subscribe(player);
});

function splitString(str) {
  const arr = [];
  while (str.length > 0) {
    let substr = str.substring(0, 200);
    if (substr.length === 200) {
      substr = substr.substring(0, Math.min(substr.length, substr.lastIndexOf(" ")));
    }
    arr.push(substr);
    str = str.substring(substr.length).trim();
  }
  return arr;
}



client.login(discordtoken)
